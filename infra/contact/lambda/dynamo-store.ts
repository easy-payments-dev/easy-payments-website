import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'node:crypto';
import { ClaimResult, CounterResult, GuardStore } from './store';
import { StoredResponse } from './types';

/**
 * DynamoDB-backed GuardStore. Single table, partition key `pk` (S), TTL attribute `expiresAt` (N).
 *
 * Items:
 *  - `RL#...` / `CAP#...` rate-limit and daily-cap counters (`hits`)
 *  - `IDEM#...` idempotency records (`status`, `fingerprint`, `lockId`, `lockExpiresAt`, `response`)
 *
 * IAM needed: dynamodb:UpdateItem, dynamodb:PutItem (and GetItem) on this table only.
 * No Delete/Scan/Query is used — expired data is removed by TTL.
 */
export class DynamoGuardStore implements GuardStore {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async incrementCounter(
    key: string,
    limit: number,
    expiresAtSec: number,
  ): Promise<CounterResult> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: { pk: { S: key } },
          UpdateExpression: 'SET #hits = if_not_exists(#hits, :zero) + :one, expiresAt = :exp',
          ConditionExpression: 'attribute_not_exists(#hits) OR #hits < :limit',
          ExpressionAttributeNames: { '#hits': 'hits' },
          ExpressionAttributeValues: {
            ':zero': { N: '0' },
            ':one': { N: '1' },
            ':limit': { N: String(limit) },
            ':exp': { N: String(expiresAtSec) },
          },
        }),
      );
      return { allowed: true };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return { allowed: false };
      }
      throw error;
    }
  }

  async claimIdempotency(
    key: string,
    fingerprint: string,
    nowSec: number,
    lockSeconds: number,
    expiresAtSec: number,
  ): Promise<ClaimResult> {
    const lockId = randomUUID();
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            pk: { S: key },
            status: { S: 'in_progress' },
            fingerprint: { S: fingerprint },
            lockId: { S: lockId },
            lockExpiresAt: { N: String(nowSec + lockSeconds) },
            expiresAt: { N: String(expiresAtSec) },
          },
          // Claimable when: new, TTL-expired (not yet purged), or not completed with a dead lock.
          ConditionExpression:
            'attribute_not_exists(pk) OR expiresAt < :now OR (#status <> :completed AND lockExpiresAt < :now)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':now': { N: String(nowSec) },
            ':completed': { S: 'completed' },
          },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }),
      );
      return { kind: 'claimed', lockId };
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
      const old = error.Item;
      if (old?.['status']?.S === 'completed') {
        const stored = old['response']?.S;
        if (old['fingerprint']?.S !== fingerprint) {
          return { kind: 'conflict' };
        }
        if (stored) {
          return { kind: 'replay', response: JSON.parse(stored) as StoredResponse };
        }
      }
      return { kind: 'in_progress' };
    }
  }

  async completeIdempotency(
    key: string,
    lockId: string,
    response: StoredResponse,
    expiresAtSec: number,
  ): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: { pk: { S: key } },
          UpdateExpression: 'SET #status = :completed, #response = :response, expiresAt = :exp',
          ConditionExpression: 'lockId = :lockId',
          ExpressionAttributeNames: { '#status': 'status', '#response': 'response' },
          ExpressionAttributeValues: {
            ':completed': { S: 'completed' },
            ':response': { S: JSON.stringify(response) },
            ':exp': { N: String(expiresAtSec) },
            ':lockId': { S: lockId },
          },
        }),
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  async releaseIdempotency(key: string, lockId: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: { pk: { S: key } },
          UpdateExpression: 'SET #status = :released, lockExpiresAt = :zero',
          ConditionExpression: 'lockId = :lockId AND #status = :inProgress',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':released': { S: 'released' },
            ':inProgress': { S: 'in_progress' },
            ':zero': { N: '0' },
            ':lockId': { S: lockId },
          },
        }),
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }
}
