import { describe, expect, it } from 'vitest';
import { contentFingerprint, idempotencyStoreKey, parseIdempotencyKey } from '../lambda/idempotency';
import { MemoryGuardStore } from '../lambda/memory-store';
import { KEY_1 } from './helpers';

const submission = {
  name: 'Ada',
  replyEmail: 'ada@example.org',
  type: 'inquiry' as const,
  message: 'Hello',
};

describe('Idempotency-Key parsing', () => {
  it('accepts UUIDs (case-insensitive, trimmed) and normalizes to lowercase', () => {
    expect(parseIdempotencyKey(KEY_1)).toBe(KEY_1);
    expect(parseIdempotencyKey(` ${KEY_1.toUpperCase()} `)).toBe(KEY_1);
  });

  it.each([undefined, '', 'not-a-uuid', '12345', `${KEY_1}-x`, "' OR 1=1 --"])('rejects %j', (value) => {
    expect(parseIdempotencyKey(value)).toBeNull();
  });

  it('hashes the key into the store key', () => {
    const storeKey = idempotencyStoreKey(KEY_1);
    expect(storeKey).toMatch(/^IDEM#[0-9a-f]{64}$/);
    expect(storeKey).not.toContain(KEY_1);
  });
});

describe('content fingerprint', () => {
  it('is stable, email-case-insensitive, and content-sensitive', () => {
    expect(contentFingerprint(submission)).toBe(contentFingerprint({ ...submission }));
    expect(contentFingerprint(submission)).toBe(
      contentFingerprint({ ...submission, replyEmail: 'ADA@example.org' }),
    );
    expect(contentFingerprint(submission)).not.toBe(contentFingerprint({ ...submission, message: 'Hi' }));
  });
});

describe('idempotency claims', () => {
  const key = idempotencyStoreKey(KEY_1);
  const fp = contentFingerprint(submission);
  const response = { statusCode: 200, body: '{"status":"accepted"}' };

  it('claims a new key, then reports in_progress for a concurrent duplicate', async () => {
    const store = new MemoryGuardStore();
    expect((await store.claimIdempotency(key, fp, 100, 60, 1000)).kind).toBe('claimed');
    expect((await store.claimIdempotency(key, fp, 101, 60, 1000)).kind).toBe('in_progress');
  });

  it('replays the stored result for the same key + content (no second send)', async () => {
    const store = new MemoryGuardStore();
    const claim = await store.claimIdempotency(key, fp, 100, 60, 1000);
    if (claim.kind !== 'claimed') throw new Error('expected claim');
    await store.completeIdempotency(key, claim.lockId, response, 1000);
    const replay = await store.claimIdempotency(key, fp, 200, 60, 1000);
    expect(replay).toEqual({ kind: 'replay', response });
  });

  it('rejects key reuse with different content', async () => {
    const store = new MemoryGuardStore();
    const claim = await store.claimIdempotency(key, fp, 100, 60, 1000);
    if (claim.kind !== 'claimed') throw new Error('expected claim');
    await store.completeIdempotency(key, claim.lockId, response, 1000);
    const other = await store.claimIdempotency(key, 'different', 200, 60, 1000);
    expect(other.kind).toBe('conflict');
  });

  it('lets a retry re-claim after release or after a stale lock', async () => {
    const store = new MemoryGuardStore();
    const first = await store.claimIdempotency(key, fp, 100, 60, 1000);
    if (first.kind !== 'claimed') throw new Error('expected claim');
    await store.releaseIdempotency(key, first.lockId);
    const second = await store.claimIdempotency(key, fp, 101, 60, 1000);
    expect(second.kind).toBe('claimed');
    // crashed holder: lock expires
    expect((await store.claimIdempotency(key, fp, 101 + 61, 60, 1000)).kind).toBe('claimed');
  });

  it('ignores completion/release from a non-owner lock', async () => {
    const store = new MemoryGuardStore();
    await store.claimIdempotency(key, fp, 100, 60, 1000);
    await store.completeIdempotency(key, 'someone-else', response, 1000);
    await store.releaseIdempotency(key, 'someone-else');
    expect((await store.claimIdempotency(key, fp, 101, 60, 1000)).kind).toBe('in_progress');
  });
});
