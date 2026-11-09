import { createHmac } from 'node:crypto';

/**
 * Pseudonymize a client IP with HMAC-SHA256 so the raw address is never stored or logged.
 * The secret is required; without it hashes could be brute-forced over the IPv4 space.
 */
export function hashIp(ip: string, secret: string): string {
  if (!secret) {
    throw new Error('ip hash secret is required');
  }
  return createHmac('sha256', secret).update(ip.trim().toLowerCase()).digest('hex');
}

export interface RateWindow {
  index: number;
  /** Seconds until the current fixed window ends (use for Retry-After). */
  retryAfterSeconds: number;
  /** TTL epoch seconds for items in this window (window end + safety margin). */
  expiresAtSec: number;
}

/** Fixed window: simple, atomic with one DynamoDB UpdateItem. Allows a burst at window edges. */
export function rateWindow(nowSec: number, windowSeconds: number): RateWindow {
  const index = Math.floor(nowSec / windowSeconds);
  const end = (index + 1) * windowSeconds;
  return {
    index,
    retryAfterSeconds: Math.max(1, end - nowSec),
    expiresAtSec: end + 3600,
  };
}

/** Counts every request that reaches the handler (including invalid and bot requests). */
export function attemptKey(ipHash: string, windowIndex: number): string {
  return `RL#attempt#${ipHash}#${windowIndex}`;
}

/** Counts submissions that passed validation + Turnstile and are about to be sent. */
export function submissionKey(ipHash: string, windowIndex: number): string {
  return `RL#submit#${ipHash}#${windowIndex}`;
}

/** UTC day bucket for the global SES attempt cap. */
export function dailyCapKey(nowSec: number): { key: string; expiresAtSec: number } {
  const day = new Date(nowSec * 1000).toISOString().slice(0, 10);
  const dayStart = Math.floor(nowSec / 86400) * 86400;
  return { key: `CAP#${day}`, expiresAtSec: dayStart + 86400 + 2 * 86400 };
}
