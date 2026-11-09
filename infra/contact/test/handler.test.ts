import { describe, expect, it } from 'vitest';
import { handleContactRequest } from '../lambda/handler';
import { KEY_1, KEY_2, ORIGIN, fakeFetch, makeEvent, makeHarness, turnstileOk, validBody } from './helpers';

async function call(harness: ReturnType<typeof makeHarness>, options: Parameters<typeof makeEvent>[0] = {}) {
  const response = await handleContactRequest(makeEvent(options), harness.deps);
  const body = typeof response.body === 'string' && response.body ? JSON.parse(response.body) : undefined;
  return { response, status: response.statusCode, body, headers: response.headers ?? {} };
}

describe('handleContactRequest — happy path', () => {
  it('validates, verifies Turnstile, sends via the transport, and confirms acceptance', async () => {
    const h = makeHarness();
    const { status, body, headers } = await call(h);
    expect(status).toBe(200);
    expect(body).toEqual({ status: 'accepted' });
    expect(headers['Access-Control-Allow-Origin']).toBe(ORIGIN);
    expect(h.email.sent).toHaveLength(1);
    const mail = h.email.sent[0]!;
    expect(mail.to).toBe('owner@example.com');
    expect(mail.from).toBe('no-reply@easypayments.dev');
    expect(mail.replyTo).toBe('ada@example.org');
    expect(mail.subject).toBe('[Easy Payments] Suggestion');
    expect(h.fetchImpl.calls).toBe(1);
  });

  it('ignores any destination address supplied by the client', async () => {
    const h = makeHarness();
    await call(h, { body: validBody({ to: 'attacker@evil.test', toEmail: 'attacker@evil.test', from: 'x@y.z' }) });
    expect(h.email.sent[0]!.to).toBe('owner@example.com');
    expect(h.email.sent[0]!.from).toBe('no-reply@easypayments.dev');
  });
});

describe('handleContactRequest — origin and request hygiene', () => {
  it('rejects unknown or missing origins without CORS headers or state changes', async () => {
    const h = makeHarness();
    for (const origin of ['https://evil.example', null]) {
      const { status, headers } = await call(h, { origin });
      expect(status).toBe(403);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    }
    expect(h.store.counters.size).toBe(0);
    expect(h.email.sent).toHaveLength(0);
  });

  it('answers preflight only for allowed origins', async () => {
    const h = makeHarness();
    const ok = await call(h, { method: 'OPTIONS' });
    expect(ok.status).toBe(204);
    expect(ok.headers['Access-Control-Allow-Headers']).toContain('idempotency-key');
    const bad = await call(h, { method: 'OPTIONS', origin: 'https://evil.example' });
    expect(bad.status).toBe(403);
  });

  it('requires JSON content-type, a UUID Idempotency-Key, and valid JSON', async () => {
    const h = makeHarness();
    expect((await call(h, { contentType: 'text/plain' })).status).toBe(415);
    expect((await call(h, { key: null })).status).toBe(400);
    expect((await call(h, { key: 'abc' })).status).toBe(400);
    expect((await call(h, { rawBody: '{nope' })).status).toBe(400);
    expect((await call(h, { rawBody: JSON.stringify({ message: 'x'.repeat(40_000) }) })).status).toBe(413);
    expect(h.email.sent).toHaveLength(0);
  });

  it('returns 400 with field codes only (no echoed content) for invalid input', async () => {
    const h = makeHarness();
    const { status, body } = await call(h, { body: validBody({ replyEmail: 'nope', message: '' }) });
    expect(status).toBe(400);
    expect(body).toEqual({
      error: 'invalid_request',
      fields: { replyEmail: 'invalid_email', message: 'required' },
    });
    expect(h.fetchImpl.calls).toBe(0);
  });
});

describe('handleContactRequest — honeypot', () => {
  it('returns the same generic success but sends nothing and skips Turnstile', async () => {
    const h = makeHarness();
    const real = await call(makeHarness());
    const bot = await call(h, { body: validBody({ website: 'https://spam.test' }) });
    expect(bot.status).toBe(200);
    expect(bot.body).toEqual(real.body);
    expect(h.email.sent).toHaveLength(0);
    expect(h.fetchImpl.calls).toBe(0);
  });

  it('still counts against the per-IP attempt limit', async () => {
    const h = makeHarness({ config: { limits: { windowSeconds: 900, maxSubmissions: 3, maxAttempts: 2, dailySendCap: 50 } } });
    const bot = { body: validBody({ website: 'x' }) };
    expect((await call(h, bot)).status).toBe(200);
    expect((await call(h, bot)).status).toBe(200);
    expect((await call(h, bot)).status).toBe(429);
  });
});

describe('handleContactRequest — Turnstile', () => {
  it('rejects a missing token, a failed siteverify, wrong hostname/action — never sending mail', async () => {
    const cases = [
      { body: validBody({ turnstileToken: undefined }), fetchImpl: fakeFetch(turnstileOk()) },
      { body: validBody(), fetchImpl: fakeFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] }) },
      { body: validBody(), fetchImpl: fakeFetch(turnstileOk({ hostname: 'evil.example' })) },
      { body: validBody(), fetchImpl: fakeFetch(turnstileOk({ action: 'other' })) },
    ];
    for (const item of cases) {
      const h = makeHarness({ fetchImpl: item.fetchImpl });
      const { status, body } = await call(h, { body: item.body });
      expect(status).toBe(403);
      expect(body).toEqual({ error: 'verification_failed' });
      expect(h.email.sent).toHaveLength(0);
    }
  });

  it('answers 503 when Cloudflare is unreachable (no bypass) and allows a retry with the same key', async () => {
    const h = makeHarness({ fetchImpl: fakeFetch({}, 500) });
    expect((await call(h)).status).toBe(503);
    expect(h.email.sent).toHaveLength(0);
    h.deps.fetchImpl = fakeFetch(turnstileOk());
    expect((await call(h)).status).toBe(200);
    expect(h.email.sent).toHaveLength(1);
  });

  it('does not cache a verification failure under the idempotency key', async () => {
    const h = makeHarness({ fetchImpl: fakeFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] }) });
    expect((await call(h)).status).toBe(403);
    h.deps.fetchImpl = fakeFetch(turnstileOk());
    expect((await call(h)).status).toBe(200);
  });
});

describe('handleContactRequest — rate limits', () => {
  it('allows 3 submissions per IP per window and then returns 429 with Retry-After', async () => {
    const h = makeHarness();
    for (const key of [KEY_1, KEY_2, '11111111-1111-4111-8111-111111111111']) {
      expect((await call(h, { key })).status).toBe(200);
    }
    const blocked = await call(h, { key: '22222222-2222-4222-8222-222222222222' });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);
    expect(h.email.sent).toHaveLength(3);
  });

  it('tracks IPs separately', async () => {
    const h = makeHarness({ config: { limits: { windowSeconds: 900, maxSubmissions: 1, maxAttempts: 10, dailySendCap: 50 } } });
    expect((await call(h, { ip: '203.0.113.1', key: KEY_1 })).status).toBe(200);
    expect((await call(h, { ip: '203.0.113.1', key: KEY_2 })).status).toBe(429);
    expect((await call(h, { ip: '203.0.113.2', key: KEY_2 })).status).toBe(200);
  });

  it('applies the attempt limit to rejected (invalid / failed Turnstile) requests', async () => {
    const h = makeHarness({ config: { limits: { windowSeconds: 900, maxSubmissions: 3, maxAttempts: 3, dailySendCap: 50 } } });
    const invalid = { body: validBody({ name: '' }) };
    expect((await call(h, invalid)).status).toBe(400);
    expect((await call(h, invalid)).status).toBe(400);
    expect((await call(h, invalid)).status).toBe(400);
    expect((await call(h, invalid)).status).toBe(429);
  });

  it('stores only an HMAC of the IP, never the raw address', async () => {
    const h = makeHarness();
    await call(h, { ip: '198.51.100.23' });
    for (const key of h.store.counters.keys()) {
      expect(key).not.toContain('198.51.100.23');
    }
    expect(JSON.stringify(h.logs)).not.toContain('198.51.100.23');
  });

  it('enforces the global daily SES cap', async () => {
    const h = makeHarness({ config: { limits: { windowSeconds: 900, maxSubmissions: 100, maxAttempts: 100, dailySendCap: 2 } } });
    const keys = [KEY_1, KEY_2, '33333333-3333-4333-8333-333333333333'];
    expect((await call(h, { key: keys[0]!, ip: '203.0.113.1' })).status).toBe(200);
    expect((await call(h, { key: keys[1]!, ip: '203.0.113.2' })).status).toBe(200);
    const capped = await call(h, { key: keys[2]!, ip: '203.0.113.3' });
    expect(capped.status).toBe(503);
    expect(capped.body).toEqual({ error: 'temporarily_unavailable' });
    expect(h.email.sent).toHaveLength(2);
  });
});

describe('handleContactRequest — idempotency', () => {
  it('replays the same result for the same key without a duplicate SES send', async () => {
    const h = makeHarness();
    const first = await call(h);
    const second = await call(h);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(second.headers['Idempotent-Replay']).toBe('true');
    expect(h.email.sent).toHaveLength(1);
    expect(h.fetchImpl.calls).toBe(1); // replay does not re-verify or re-send
  });

  it('rejects reuse of a key with different content', async () => {
    const h = makeHarness();
    await call(h);
    const reuse = await call(h, { body: validBody({ message: 'A different message' }) });
    expect(reuse.status).toBe(422);
    expect(reuse.body).toEqual({ error: 'idempotency_key_reuse' });
    expect(h.email.sent).toHaveLength(1);
  });

  it('allows a retry with the same key after an SES failure (at-most-once, best effort)', async () => {
    const h = makeHarness({ emailFails: true });
    const failed = await call(h);
    expect(failed.status).toBe(502);
    expect(failed.body).toEqual({ error: 'delivery_failed' });
    // transport recovers
    h.email.send = async (message) => {
      h.email.sent.push(message);
      return { messageId: 'ok' };
    };
    expect((await call(h)).status).toBe(200);
    expect(h.email.sent).toHaveLength(1);
  });
});

describe('handleContactRequest — configuration and privacy', () => {
  it('returns a generic 500 for incomplete config and never fakes success', async () => {
    const h = makeHarness();
    h.deps.getRuntime = async () => ({ ok: false, issues: ['TURNSTILE_SECRET:missing'] });
    const { status, body } = await call(h);
    expect(status).toBe(500);
    expect(body).toEqual({ error: 'server_error' });
    expect(h.email.sent).toHaveLength(0);
  });

  it('fails closed with 503 when the guard store errors', async () => {
    const h = makeHarness();
    h.store.incrementCounter = async () => {
      throw new Error('dynamodb down');
    };
    const { status, body } = await call(h);
    expect(status).toBe(503);
    expect(body).toEqual({ error: 'temporarily_unavailable' });
    expect(h.email.sent).toHaveLength(0);
  });

  it('never logs the message, email address, name, or Turnstile token', async () => {
    const h = makeHarness();
    await call(h);
    await call(h, { body: validBody({ name: '' }), key: KEY_2 });
    const logged = JSON.stringify(h.logs);
    for (const secret of ['Please add a dark mode', 'ada@example.org', 'Ada Lovelace', 'tok-valid-123']) {
      expect(logged).not.toContain(secret);
    }
  });
});
