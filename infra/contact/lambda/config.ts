import { isValidEmail } from './validation';

export type Env = Record<string, string | undefined>;

export interface ContactConfig {
  stage: string;
  /** True for any stage other than `local`/`test`. */
  productionLike: boolean;
  emailTransport: 'ses' | 'local-mock';
  toEmail: string;
  fromEmail: string;
  allowedOrigins: string[];
  turnstile: {
    secret: string;
    allowedHostnames: string[];
    expectedAction: string;
    maxAgeSeconds: number;
  };
  ipHashSecret: string;
  guardTableName: string;
  limits: {
    windowSeconds: number;
    maxSubmissions: number;
    maxAttempts: number;
    dailySendCap: number;
  };
  sesRegion?: string;
}

export type ConfigResult =
  | { ok: true; config: ContactConfig }
  /** `issues` are variable names / codes only — never values. Safe to log. */
  | { ok: false; issues: string[] };

/** Only these stages may use local-mock email. Anything else is treated as production-like. */
const LOCAL_STAGES = new Set(['local', 'test']);

/** Cloudflare's documented always-pass/always-fail dummy secrets. Never valid for real traffic. */
const TURNSTILE_TEST_SECRET = /^[123]x0+AA$/;

export type SecretReader = (name: string) => Promise<string | undefined>;

function int(env: Env, name: string, fallback: number, min: number, max: number, issues: string[]) {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    issues.push(`${name}:invalid`);
    return fallback;
  }
  return value;
}

function parseOrigin(value: string, allowLocal: boolean): string | null {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const origin = url.origin;
  if (origin !== trimmed || trimmed.includes('*')) {
    return null; // must be exactly scheme://host[:port], no path / wildcard
  }
  const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol === 'https:') {
    return origin;
  }
  if (url.protocol === 'http:' && allowLocal && isLocalHost) {
    return origin;
  }
  return null;
}

/**
 * Validates environment configuration and resolves secrets.
 *
 * Incomplete or unsafe configuration returns `ok:false` — the handler then answers with a generic
 * 500 and never fakes success. In particular:
 *  - `local-mock` email is refused unless STAGE is `local`/`test` AND NODE_ENV is not `production`.
 *  - A missing/blank STAGE is treated as production.
 *  - Cloudflare's dummy Turnstile secrets are refused in production-like stages.
 */
export async function loadConfig(env: Env, readSecret: SecretReader): Promise<ConfigResult> {
  const issues: string[] = [];

  const stage = (env['STAGE'] ?? '').trim().toLowerCase() || 'prod';
  const nodeEnvProduction = (env['NODE_ENV'] ?? '').trim().toLowerCase() === 'production';
  const productionLike = !LOCAL_STAGES.has(stage) || nodeEnvProduction;

  const transportRaw = (env['CONTACT_EMAIL_TRANSPORT'] ?? 'ses').trim().toLowerCase();
  let emailTransport: 'ses' | 'local-mock' = 'ses';
  if (transportRaw === 'local-mock') {
    if (productionLike) {
      issues.push('CONTACT_EMAIL_TRANSPORT:local-mock-refused-in-production');
    } else {
      emailTransport = 'local-mock';
    }
  } else if (transportRaw !== 'ses') {
    issues.push('CONTACT_EMAIL_TRANSPORT:invalid');
  }

  const toEmail = (env['CONTACT_TO_EMAIL'] ?? '').trim();
  if (!isValidEmail(toEmail)) {
    issues.push('CONTACT_TO_EMAIL:missing-or-invalid');
  }
  const fromEmail = (env['CONTACT_FROM_EMAIL'] ?? '').trim();
  if (!isValidEmail(fromEmail)) {
    issues.push('CONTACT_FROM_EMAIL:missing-or-invalid');
  }

  const allowedOrigins: string[] = [];
  const originValues = (env['CONTACT_ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (originValues.length === 0) {
    issues.push('CONTACT_ALLOWED_ORIGINS:missing');
  }
  for (const value of originValues) {
    const origin = parseOrigin(value, !productionLike);
    if (origin) {
      allowedOrigins.push(origin);
    } else {
      issues.push('CONTACT_ALLOWED_ORIGINS:invalid-entry');
    }
  }

  const hostnameOverride = (env['TURNSTILE_ALLOWED_HOSTNAMES'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedHostnames =
    hostnameOverride.length > 0
      ? hostnameOverride
      : allowedOrigins.map((origin) => new URL(origin).hostname.toLowerCase());
  if (allowedHostnames.length === 0) {
    issues.push('TURNSTILE_ALLOWED_HOSTNAMES:missing');
  }

  const expectedAction = (env['TURNSTILE_EXPECTED_ACTION'] ?? 'contact').trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(expectedAction)) {
    issues.push('TURNSTILE_EXPECTED_ACTION:invalid');
  }

  const guardTableName = (env['GUARD_TABLE_NAME'] ?? '').trim();
  if (!guardTableName) {
    issues.push('GUARD_TABLE_NAME:missing');
  }

  const limits = {
    windowSeconds: int(env, 'RATE_LIMIT_WINDOW_SECONDS', 900, 60, 86400, issues),
    maxSubmissions: int(env, 'RATE_LIMIT_MAX_SUBMISSIONS', 3, 1, 1000, issues),
    maxAttempts: int(env, 'RATE_LIMIT_MAX_ATTEMPTS', 10, 1, 10000, issues),
    dailySendCap: int(env, 'DAILY_SEND_CAP', 50, 1, 100000, issues),
  };

  const turnstileSecret = await resolveSecret(env, 'TURNSTILE_SECRET', readSecret);
  if (!turnstileSecret) {
    issues.push('TURNSTILE_SECRET:missing');
  } else if (productionLike && TURNSTILE_TEST_SECRET.test(turnstileSecret)) {
    issues.push('TURNSTILE_SECRET:test-secret-refused-in-production');
  }

  const ipHashSecret = await resolveSecret(env, 'IP_HASH_SECRET', readSecret);
  if (!ipHashSecret || ipHashSecret.length < 32) {
    issues.push('IP_HASH_SECRET:missing-or-too-short');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      stage,
      productionLike,
      emailTransport,
      toEmail,
      fromEmail,
      allowedOrigins,
      turnstile: {
        secret: turnstileSecret as string,
        allowedHostnames,
        expectedAction,
        maxAgeSeconds: 300,
      },
      ipHashSecret: ipHashSecret as string,
      guardTableName,
      limits,
      sesRegion: env['SES_REGION']?.trim() || undefined,
    },
  };
}

/** Reads `NAME` directly, or `NAME_SSM_PARAM` through the secret reader (SSM SecureString). */
async function resolveSecret(
  env: Env,
  name: string,
  readSecret: SecretReader,
): Promise<string | undefined> {
  const direct = env[name]?.trim();
  if (direct) {
    return direct;
  }
  const parameter = env[`${name}_SSM_PARAM`]?.trim();
  if (!parameter) {
    return undefined;
  }
  try {
    const value = (await readSecret(parameter))?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}
