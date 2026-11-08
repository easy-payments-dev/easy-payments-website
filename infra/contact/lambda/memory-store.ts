import { randomUUID } from 'node:crypto';
import { ClaimResult, CounterResult, GuardStore } from './store';
import { StoredResponse } from './types';

interface IdempotencyRecord {
  status: 'in_progress' | 'completed' | 'released';
  fingerprint: string;
  lockId: string;
  lockExpiresAt: number;
  expiresAt: number;
  response?: StoredResponse;
}

/**
 * In-memory GuardStore for unit tests only. Never used in the deployed Lambda.
 * JS is single-threaded, so each method is atomic.
 */
export class MemoryGuardStore implements GuardStore {
  readonly counters = new Map<string, number>();
  readonly records = new Map<string, IdempotencyRecord>();

  async incrementCounter(
    key: string,
    limit: number,
    _expiresAtSec?: number,
  ): Promise<CounterResult> {
    const current = this.counters.get(key) ?? 0;
    if (current >= limit) {
      return { allowed: false };
    }
    this.counters.set(key, current + 1);
    return { allowed: true };
  }

  async claimIdempotency(
    key: string,
    fingerprint: string,
    nowSec: number,
    lockSeconds: number,
    expiresAtSec: number,
  ): Promise<ClaimResult> {
    const existing = this.records.get(key);
    if (existing && existing.expiresAt >= nowSec) {
      if (existing.status === 'completed' && existing.response) {
        return existing.fingerprint === fingerprint
          ? { kind: 'replay', response: existing.response }
          : { kind: 'conflict' };
      }
      if (existing.status === 'in_progress' && existing.lockExpiresAt >= nowSec) {
        return { kind: 'in_progress' };
      }
    }
    const lockId = randomUUID();
    this.records.set(key, {
      status: 'in_progress',
      fingerprint,
      lockId,
      lockExpiresAt: nowSec + lockSeconds,
      expiresAt: expiresAtSec,
    });
    return { kind: 'claimed', lockId };
  }

  async completeIdempotency(
    key: string,
    lockId: string,
    response: StoredResponse,
    expiresAtSec: number,
  ): Promise<void> {
    const record = this.records.get(key);
    if (record && record.lockId === lockId) {
      record.status = 'completed';
      record.response = response;
      record.expiresAt = expiresAtSec;
    }
  }

  async releaseIdempotency(key: string, lockId: string): Promise<void> {
    const record = this.records.get(key);
    if (record && record.lockId === lockId && record.status === 'in_progress') {
      record.status = 'released';
      record.lockExpiresAt = 0;
    }
  }
}
