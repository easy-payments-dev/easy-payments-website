/**
 * LOCAL-ONLY contact API for developing /contact without AWS.
 *
 *   npm run contact:local        (listens on http://localhost:8787/contact)
 *
 * - Validates the Turnstile token against Cloudflare siteverify using Cloudflare's official
 *   TEST secret (always passes for the test site key 1x00000000000000000000AA).
 * - Email transport is a console sink: NOTHING is ever sent (no SES, no SMTP).
 * - Honeypot, field validation, Idempotency-Key and an in-memory rate limit mirror the Lambda
 *   (infra/contact/lambda). Limits/state live in memory and reset on restart.
 * - Refuses to start when NODE_ENV=production or STAGE is not local/test.
 *
 * This script is not part of the deployed site and never ships in dist/.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const stage = (process.env.STAGE ?? 'local').trim().toLowerCase();
if (process.env.NODE_ENV === 'production' || !['local', 'test'].includes(stage)) {
  console.error('local-contact-api refuses to run with NODE_ENV=production or a non-local STAGE.');
  process.exit(1);
}

const PORT = Number(process.env.CONTACT_LOCAL_PORT ?? 8787);
/**
 * Prefer dual-stack bind. On Windows, browsers often resolve `localhost` → `::1`
 * first; an IPv4-only listener makes Turnstile succeed while fetch fails →
 * "Message not sent." The website env also targets 127.0.0.1 explicitly.
 */
const HOST = process.env.CONTACT_LOCAL_HOST ?? '::';
const ALLOWED_ORIGINS = (
  process.env.CONTACT_LOCAL_ORIGINS ?? 'http://localhost:4200,http://127.0.0.1:4200'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Cloudflare dummy secret: always passes. Override only for experiments with a real dev widget.
const TURNSTILE_SECRET =
  process.env.CONTACT_LOCAL_TURNSTILE_SECRET ?? '1x0000000000000000000000000000000AA';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const PRINT_BODY = process.env.CONTACT_LOCAL_PRINT_BODY === '1';

const LIMITS = { name: 100, email: 254, message: 3000, bodyBytes: 32 * 1024 };
const RATE = { windowMs: 15 * 60 * 1000, maxSubmissions: 3 };
const TYPE_LABELS = {
  suggestion: 'Suggestion',
  problem: 'Problem',
  inquiry: 'Inquiry',
  other: 'Other',
};
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hashSecret = randomBytes(32);
const submissions = new Map(); // ipHash -> timestamps
const completed = new Map(); // idempotency key -> { fingerprint }
const outbox = []; // local-mock email sink

const ipHash = (ip) => createHmac('sha256', hashSecret).update(ip).digest('hex');

function send(res, status, body, origin, extra = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'content-type, idempotency-key';
    headers['Access-Control-Expose-Headers'] = 'Retry-After, Idempotent-Replay';
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function validate(body) {
  const fields = {};
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  if (!name) fields.name = 'required';
  else if (name.length > LIMITS.name) fields.name = 'too_long';

  const replyEmail = typeof body.replyEmail === 'string' ? body.replyEmail.trim() : '';
  if (!replyEmail) fields.replyEmail = 'required';
  else if (replyEmail.length > LIMITS.email) fields.replyEmail = 'too_long';
  else if (!EMAIL_PATTERN.test(replyEmail)) fields.replyEmail = 'invalid_email';

  if (!Object.hasOwn(TYPE_LABELS, body.type)) fields.type = 'invalid_type';

  const message = typeof body.message === 'string' ? body.message.replace(/\r\n?/g, '\n').trim() : '';
  if (!message) fields.message = 'required';
  else if (message.length > LIMITS.message) fields.message = 'too_long';

  return Object.keys(fields).length
    ? { ok: false, fields }
    : { ok: true, value: { name, replyEmail, type: body.type, message } };
}

async function verifyTurnstile(token, remoteip) {
  const params = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
  if (remoteip) params.set('remoteip', remoteip);
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return 'unavailable';
    const data = await response.json();
    // Cloudflare test keys return placeholder hostname/action, so only `success` is checked locally.
    return data.success === true ? 'ok' : 'rejected';
  } catch {
    return 'unavailable';
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > LIMITS.bodyBytes) {
        reject(Object.assign(new Error('too large'), { code: 'too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;

  // HOST may be '::' (dual-stack); bracket IPv6 for URL parsing.
  const urlHost = HOST.includes(':') ? `[${HOST}]` : HOST;
  if (new URL(req.url ?? '/', `http://${urlHost}`).pathname !== '/contact') {
    return send(res, 404, { error: 'not_found' }, allowedOrigin);
  }
  if (!allowedOrigin) {
    return send(res, 403, { error: 'forbidden_origin' }, null);
  }
  if (req.method === 'OPTIONS') {
    return send(res, 204, undefined, allowedOrigin);
  }
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'method_not_allowed' }, allowedOrigin);
  }

  const ip = ipHash(req.socket.remoteAddress ?? 'unknown');
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);

  if (!/^application\/json/i.test(req.headers['content-type'] ?? '')) {
    return send(res, 415, { error: 'unsupported_media_type' }, allowedOrigin);
  }
  const key = String(req.headers['idempotency-key'] ?? '').trim().toLowerCase();
  if (!UUID_PATTERN.test(key)) {
    return send(res, 400, { error: 'invalid_idempotency_key' }, allowedOrigin);
  }

  let json;
  try {
    json = JSON.parse(await readBody(req));
  } catch (error) {
    const tooLarge = error?.code === 'too_large';
    return send(res, tooLarge ? 413 : 400, { error: tooLarge ? 'payload_too_large' : 'invalid_request' }, allowedOrigin);
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return send(res, 400, { error: 'invalid_request' }, allowedOrigin);
  }

  // Honeypot: generic success, nothing "sent".
  if (typeof json.website === 'string' ? json.website.trim() !== '' : json.website != null) {
    console.log('[contact:local] honeypot filled — ignored (generic success)');
    return send(res, 200, { status: 'accepted' }, allowedOrigin);
  }

  const parsed = validate(json);
  if (!parsed.ok) {
    return send(res, 400, { error: 'invalid_request', fields: parsed.fields }, allowedOrigin);
  }

  const fingerprint = createHash('sha256').update(JSON.stringify(parsed.value)).digest('hex');
  const previous = completed.get(key);
  if (previous) {
    return previous.fingerprint === fingerprint
      ? send(res, 200, { status: 'accepted' }, allowedOrigin, { 'Idempotent-Replay': 'true' })
      : send(res, 422, { error: 'idempotency_key_reuse' }, allowedOrigin);
  }

  const token = typeof json.turnstileToken === 'string' ? json.turnstileToken : '';
  if (!token || token.length > 2048) {
    return send(res, 403, { error: 'verification_failed' }, allowedOrigin);
  }
  const verdict = await verifyTurnstile(token, req.socket.remoteAddress);
  if (verdict === 'unavailable') {
    return send(res, 503, { error: 'temporarily_unavailable' }, allowedOrigin, { 'Retry-After': '30' });
  }
  if (verdict !== 'ok') {
    return send(res, 403, { error: 'verification_failed' }, allowedOrigin);
  }

  if (recent.length >= RATE.maxSubmissions) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + RATE.windowMs - now) / 1000));
    return send(res, 429, { error: 'rate_limited' }, allowedOrigin, { 'Retry-After': String(retryAfter) });
  }
  recent.push(now);
  submissions.set(ip, recent);

  // Local-mock email transport: console sink only.
  const label = TYPE_LABELS[parsed.value.type];
  outbox.push({ subject: `[Easy Payments] ${label}`, replyTo: parsed.value.replyEmail });
  console.log(`[contact:local] captured email subject="[Easy Payments] ${label}" (nothing was sent)`);
  if (PRINT_BODY) {
    console.log(`  reply-to: ${parsed.value.replyEmail}\n  name: ${parsed.value.name}\n  message:\n${parsed.value.message}`);
  }
  completed.set(key, { fingerprint });
  return send(res, 200, { status: 'accepted' }, allowedOrigin);
});

server.listen({ port: PORT, host: HOST, ipv6Only: false }, () => {
  console.log(`Local contact API (email transport: local-mock, no email is sent)`);
  console.log(`  POST http://127.0.0.1:${PORT}/contact (dual-stack; localhost/::1 also ok)`);
  console.log(`  allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Turnstile: Cloudflare test secret; rate limit ${RATE.maxSubmissions}/15 min (in memory)`);
});
