import { createHash } from 'node:crypto';
import { ContactSubmission } from './types';

/** How long a completed result is replayed for the same Idempotency-Key. */
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
/** How long an in-flight claim blocks a duplicate request before it may be retaken. */
export const IDEMPOTENCY_LOCK_SECONDS = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns the normalized (lowercase) key, or null when missing or not a UUID. */
export function parseIdempotencyKey(headerValue: string | undefined): string | null {
  const value = headerValue?.trim();
  if (!value || !UUID_PATTERN.test(value)) {
    return null;
  }
  return value.toLowerCase();
}

/** Storage key; the client-supplied value is hashed so it never shapes table keys directly. */
export function idempotencyStoreKey(key: string): string {
  return `IDEM#${createHash('sha256').update(key).digest('hex')}`;
}

/**
 * Fingerprint of the validated content (not the Turnstile token, which changes on retry).
 * Reusing a key with different content is rejected instead of silently replaying.
 */
export function contentFingerprint(submission: ContactSubmission): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        submission.name,
        submission.replyEmail.toLowerCase(),
        submission.type,
        submission.message,
      ]),
    )
    .digest('hex');
}
