import { describe, expect, it } from 'vitest';
import { MemoryGuardStore } from '../lambda/memory-store';
import { attemptKey, dailyCapKey, hashIp, rateWindow, submissionKey } from '../lambda/rate-limit';

describe('hashIp', () => {
  const secret = 's'.repeat(40);

  it('is a deterministic 64-char hex HMAC-SHA256 and never contains the raw IP', () => {
    const a = hashIp('203.0.113.7', secret);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(hashIp('203.0.113.7', secret));
    expect(a).not.toContain('203');
  });

  it('differs per IP and per secret', () => {
    expect(hashIp('203.0.113.7', secret)).not.toBe(hashIp('203.0.113.8', secret));
    expect(hashIp('203.0.113.7', secret)).not.toBe(hashIp('203.0.113.7', 'o'.repeat(40)));
  });

  it('normalizes case/whitespace for IPv6 and refuses an empty secret', () => {
    expect(hashIp(' 2001:DB8::1 ', secret)).toBe(hashIp('2001:db8::1', secret));
    expect(() => hashIp('203.0.113.7', '')).toThrow();
  });
});

describe('rate windows and keys', () => {
  it('computes a 15-minute fixed window with Retry-After', () => {
    const window = rateWindow(1_000_000, 900);
    expect(window.index).toBe(Math.floor(1_000_000 / 900));
    expect(window.retryAfterSeconds).toBeGreaterThan(0);
    expect(window.retryAfterSeconds).toBeLessThanOrEqual(900);
    expect(window.expiresAtSec).toBeGreaterThan((window.index + 1) * 900);
  });

  it('namespaces attempt/submission/daily keys without raw IPs', () => {
    expect(attemptKey('abc', 5)).toBe('RL#attempt#abc#5');
    expect(submissionKey('abc', 5)).toBe('RL#submit#abc#5');
    const cap = dailyCapKey(Date.parse('2026-11-08T23:59:59Z') / 1000);
    expect(cap.key).toBe('CAP#2026-11-08');
    expect(dailyCapKey(Date.parse('2026-11-09T00:00:00Z') / 1000).key).toBe('CAP#2026-11-09');
  });
});

describe('counter semantics (3 per window, atomic cap)', () => {
  it('allows exactly the limit then blocks', async () => {
    const store = new MemoryGuardStore();
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push((await store.incrementCounter('RL#submit#h#1', 3, 99999)).allowed);
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('keeps separate counters per key and window', async () => {
    const store = new MemoryGuardStore();
    await store.incrementCounter(submissionKey('a', 1), 1, 1);
    expect((await store.incrementCounter(submissionKey('b', 1), 1, 1)).allowed).toBe(true);
    expect((await store.incrementCounter(submissionKey('a', 2), 1, 1)).allowed).toBe(true);
    expect((await store.incrementCounter(submissionKey('a', 1), 1, 1)).allowed).toBe(false);
  });
});
