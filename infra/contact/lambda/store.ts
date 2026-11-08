import { StoredResponse } from './types';

export interface CounterResult {
  /** false when the counter already reached `limit` (nothing was incremented). */
  allowed: boolean;
}

export type ClaimResult =
  | { kind: 'claimed'; lockId: string }
  | { kind: 'replay'; response: StoredResponse }
  | { kind: 'in_progress' }
  | { kind: 'conflict' };

/**
 * Persistence used for abuse protection and idempotency.
 * Production uses DynamoDB (`dynamo-store.ts`); tests and local dev use `memory-store.ts`.
 * All operations must be atomic per key.
 */
export interface GuardStore {
  /** Atomically increments `key` unless it already reached `limit`. */
  incrementCounter(key: string, limit: number, expiresAtSec: number): Promise<CounterResult>;

  /**
   * Atomically claims an idempotency key.
   * - new/expired/released/stale-lock keys are claimed
   * - completed key with the same fingerprint replays the stored response
   * - completed key with a different fingerprint is a conflict
   * - a fresh lock held by another request is `in_progress`
   */
  claimIdempotency(
    key: string,
    fingerprint: string,
    nowSec: number,
    lockSeconds: number,
    expiresAtSec: number,
  ): Promise<ClaimResult>;

  /** Records the final result. Only the lock owner may complete. */
  completeIdempotency(
    key: string,
    lockId: string,
    response: StoredResponse,
    expiresAtSec: number,
  ): Promise<void>;

  /** Releases a claim after a non-final failure so the client can retry with the same key. */
  releaseIdempotency(key: string, lockId: string): Promise<void>;
}
