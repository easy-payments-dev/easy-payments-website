export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface TurnstileVerifyOptions {
  token: string;
  secret: string;
  allowedHostnames: readonly string[];
  expectedAction: string;
  /** Reject challenges older than this (Cloudflare tokens already expire after 300 s). */
  maxAgeSeconds: number;
  remoteIp?: string;
  nowMs: number;
  fetchImpl: FetchLike;
  timeoutMs?: number;
}

export type TurnstileOutcome =
  | { ok: true }
  | {
      ok: false;
      /** `unavailable` = Cloudflare could not be reached (fail closed, report 503). */
      reason: 'rejected' | 'hostname' | 'action' | 'expired' | 'unavailable';
      /** Cloudflare `error-codes` only (safe to log); never the token. */
      errorCodes?: string[];
    };

interface SiteverifyResponse {
  success?: boolean;
  'error-codes'?: unknown;
  challenge_ts?: unknown;
  hostname?: unknown;
  action?: unknown;
}

/**
 * Server-side Turnstile validation. Rejects invalid, expired, and reused tokens
 * (Cloudflare reports reuse as `timeout-or-duplicate`), then enforces the hostname
 * allowlist and expected action. There is no bypass: any failure to verify is a rejection.
 */
export async function verifyTurnstile(options: TurnstileVerifyOptions): Promise<TurnstileOutcome> {
  const params = new URLSearchParams();
  params.set('secret', options.secret);
  params.set('response', options.token);
  if (options.remoteIp) {
    params.set('remoteip', options.remoteIp);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  let data: SiteverifyResponse;
  try {
    const response = await options.fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, reason: 'unavailable' };
    }
    data = (await response.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }

  const errorCodes = Array.isArray(data['error-codes'])
    ? data['error-codes'].filter((code): code is string => typeof code === 'string')
    : undefined;

  if (data.success !== true) {
    return { ok: false, reason: 'rejected', errorCodes };
  }

  const hostname = typeof data.hostname === 'string' ? data.hostname.toLowerCase() : '';
  const allowed = options.allowedHostnames.map((host) => host.toLowerCase());
  if (!hostname || !allowed.includes(hostname)) {
    return { ok: false, reason: 'hostname' };
  }

  if (data.action !== options.expectedAction) {
    return { ok: false, reason: 'action' };
  }

  const challengeMs = typeof data.challenge_ts === 'string' ? Date.parse(data.challenge_ts) : NaN;
  if (!Number.isFinite(challengeMs) || options.nowMs - challengeMs > options.maxAgeSeconds * 1000) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true };
}
