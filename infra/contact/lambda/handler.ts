import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ContactConfig } from './config';
import { EmailTransport, buildContactEmail } from './email';
import { corsHeaders, emptyResponse, jsonResponse } from './http';
import {
  IDEMPOTENCY_LOCK_SECONDS,
  IDEMPOTENCY_TTL_SECONDS,
  contentFingerprint,
  idempotencyStoreKey,
  parseIdempotencyKey,
} from './idempotency';
import { attemptKey, dailyCapKey, hashIp, rateWindow, submissionKey } from './rate-limit';
import { GuardStore } from './store';
import { FetchLike, verifyTurnstile } from './turnstile';
import { LIMITS, StoredResponse } from './types';
import { parseContactBody } from './validation';

export interface Runtime {
  config: ContactConfig;
  store: GuardStore;
  email: EmailTransport;
}

export type RuntimeResult = { ok: true; runtime: Runtime } | { ok: false; issues: string[] };

export interface HandlerDeps {
  getRuntime(): Promise<RuntimeResult>;
  fetchImpl: FetchLike;
  /** Epoch milliseconds. */
  now(): number;
  /** Structured log sink. Entries must never contain visitor data or tokens. */
  log(entry: Record<string, unknown>): void;
}

const ACCEPTED = JSON.stringify({ status: 'accepted' });

/**
 * POST /contact
 *
 * Order of checks (cheap → expensive, state only after basic hygiene):
 *  1. config (fail closed with generic 500 — never fakes success)
 *  2. Origin allowlist (403)
 *  3. per-IP *attempt* counter (429) — counts every request incl. malformed/bot traffic
 *  4. content-type, Idempotency-Key format, body size/JSON, field validation (4xx)
 *  5. honeypot filled → generic 200 `accepted`, nothing sent
 *  6. idempotency claim (replay / 409 in progress / 422 key reuse)
 *  7. Turnstile siteverify (403, or 503 if Cloudflare is unreachable) — releases claim on failure
 *  8. per-IP *submission* counter (429, default 3 / 15 min)
 *  9. global daily SES-attempt cap (503)
 * 10. SES SendEmail (502 on failure) — claim released so a client retry can proceed
 * 11. record result, return 200
 */
export async function handleContactRequest(
  event: APIGatewayProxyEventV2,
  deps: HandlerDeps,
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext?.requestId ?? 'unknown';
  const finish = (
    outcome: string,
    response: APIGatewayProxyStructuredResultV2,
    extra: Record<string, unknown> = {},
  ) => {
    deps.log({ event: 'contact.request', outcome, status: response.statusCode, requestId, ...extra });
    return response;
  };

  const runtimeResult = await deps.getRuntime();
  if (!runtimeResult.ok) {
    // Issue codes are variable names only (no values).
    deps.log({ event: 'contact.config_error', requestId, issues: runtimeResult.issues });
    return jsonResponse(500, { error: 'server_error' });
  }
  const { config, store, email } = runtimeResult.runtime;

  const headers = lowerCaseHeaders(event.headers);
  const origin = headers['origin'];
  if (!origin || !config.allowedOrigins.includes(origin)) {
    return finish('forbidden_origin', jsonResponse(403, { error: 'forbidden_origin' }));
  }
  const cors = corsHeaders(origin);
  const reply = (
    status: number,
    body: unknown,
    extra: Record<string, string> = {},
  ): APIGatewayProxyStructuredResultV2 => jsonResponse(status, body, { ...cors, ...extra });

  const method = (event.requestContext?.http?.method ?? '').toUpperCase();
  if (method === 'OPTIONS') {
    return emptyResponse(204, cors);
  }
  if (method !== 'POST') {
    return finish('method_not_allowed', reply(405, { error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' }));
  }

  const nowMs = deps.now();
  const nowSec = Math.floor(nowMs / 1000);
  const window = rateWindow(nowSec, config.limits.windowSeconds);
  const rateLimited = () =>
    reply(429, { error: 'rate_limited' }, { 'Retry-After': String(window.retryAfterSeconds) });

  try {
    const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';
    const ipHash = hashIp(sourceIp, config.ipHashSecret);

    // 3. Attempt counter — applies to rejected requests too.
    const attempt = await store.incrementCounter(
      attemptKey(ipHash, window.index),
      config.limits.maxAttempts,
      window.expiresAtSec,
    );
    if (!attempt.allowed) {
      return finish('rate_limited_attempts', rateLimited());
    }

    // 4. Basic request validation.
    if (!/^application\/json(\s*;|$)/i.test(headers['content-type'] ?? '')) {
      return finish('unsupported_media_type', reply(415, { error: 'unsupported_media_type' }));
    }
    const idempotencyKey = parseIdempotencyKey(headers['idempotency-key']);
    if (!idempotencyKey) {
      return finish('invalid_idempotency_key', reply(400, { error: 'invalid_idempotency_key' }));
    }

    const rawBody = decodeBody(event);
    if (rawBody === null || Buffer.byteLength(rawBody, 'utf8') > LIMITS.bodyMaxBytes) {
      return finish('payload_too_large', reply(413, { error: 'payload_too_large' }));
    }
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return finish('invalid_json', reply(400, { error: 'invalid_request' }));
    }

    const parsed = parseContactBody(json);

    // 5. Honeypot: look like success, send nothing, store nothing.
    if (parsed.kind === 'honeypot') {
      return finish('honeypot', reply(200, ACCEPTED));
    }
    if (parsed.kind === 'invalid') {
      return finish(
        'validation_failed',
        reply(400, { error: 'invalid_request', fields: parsed.fields }),
        { fields: Object.keys(parsed.fields) },
      );
    }
    const { submission, turnstileToken } = parsed;

    // 6. Idempotency.
    const storeKey = idempotencyStoreKey(idempotencyKey);
    const claim = await store.claimIdempotency(
      storeKey,
      contentFingerprint(submission),
      nowSec,
      IDEMPOTENCY_LOCK_SECONDS,
      nowSec + IDEMPOTENCY_TTL_SECONDS,
    );
    if (claim.kind === 'replay') {
      return finish(
        'idempotent_replay',
        reply(claim.response.statusCode, claim.response.body, { 'Idempotent-Replay': 'true' }),
      );
    }
    if (claim.kind === 'conflict') {
      return finish('idempotency_conflict', reply(422, { error: 'idempotency_key_reuse' }));
    }
    if (claim.kind === 'in_progress') {
      return finish(
        'request_in_progress',
        reply(409, { error: 'request_in_progress' }, { 'Retry-After': '2' }),
      );
    }
    const { lockId } = claim;
    const release = () => store.releaseIdempotency(storeKey, lockId);

    // 7. Turnstile (before any email-sending resource is consumed).
    if (!turnstileToken) {
      await release();
      return finish('verification_missing', reply(403, { error: 'verification_failed' }));
    }
    const verification = await verifyTurnstile({
      token: turnstileToken,
      secret: config.turnstile.secret,
      allowedHostnames: config.turnstile.allowedHostnames,
      expectedAction: config.turnstile.expectedAction,
      maxAgeSeconds: config.turnstile.maxAgeSeconds,
      remoteIp: sourceIp === 'unknown' ? undefined : sourceIp,
      nowMs,
      fetchImpl: deps.fetchImpl,
    });
    if (!verification.ok) {
      await release();
      if (verification.reason === 'unavailable') {
        return finish(
          'verification_unavailable',
          reply(503, { error: 'temporarily_unavailable' }, { 'Retry-After': '30' }),
        );
      }
      return finish('verification_failed', reply(403, { error: 'verification_failed' }), {
        reason: verification.reason,
        errorCodes: verification.errorCodes,
      });
    }

    // 8. Per-IP submission limit.
    const submit = await store.incrementCounter(
      submissionKey(ipHash, window.index),
      config.limits.maxSubmissions,
      window.expiresAtSec,
    );
    if (!submit.allowed) {
      await release();
      return finish('rate_limited_submissions', rateLimited());
    }

    // 9. Global daily cap on SES attempts.
    const cap = dailyCapKey(nowSec);
    const daily = await store.incrementCounter(cap.key, config.limits.dailySendCap, cap.expiresAtSec);
    if (!daily.allowed) {
      await release();
      return finish(
        'daily_cap_reached',
        reply(503, { error: 'temporarily_unavailable' }, { 'Retry-After': '3600' }),
      );
    }

    // 10. Send. Accepted by SES ≠ delivered; no automatic reply is sent to the visitor.
    const message = buildContactEmail(
      submission,
      { toEmail: config.toEmail, fromEmail: config.fromEmail },
      { receivedAtIso: new Date(nowMs).toISOString(), requestId },
    );
    try {
      await email.send(message);
    } catch (error) {
      await release();
      return finish('delivery_failed', reply(502, { error: 'delivery_failed' }), {
        errorName: error instanceof Error ? error.name : 'unknown',
      });
    }

    // 11. Record the final result for replays.
    const stored: StoredResponse = { statusCode: 200, body: ACCEPTED };
    await store.completeIdempotency(storeKey, lockId, stored, nowSec + IDEMPOTENCY_TTL_SECONDS);
    return finish('accepted', reply(200, ACCEPTED));
  } catch (error) {
    // Store/unknown failure: fail closed with no internal details.
    return finish('internal_error', reply(503, { error: 'temporarily_unavailable' }), {
      errorName: error instanceof Error ? error.name : 'unknown',
    });
  }
}

function lowerCaseHeaders(headers: APIGatewayProxyEventV2['headers'] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === 'string') {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

function decodeBody(event: APIGatewayProxyEventV2): string | null {
  if (typeof event.body !== 'string') {
    return null;
  }
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}
