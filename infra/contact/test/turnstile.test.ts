import { describe, expect, it } from 'vitest';
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from '../lambda/turnstile';
import { NOW_MS, fakeFetch, turnstileOk } from './helpers';

const base = {
  token: 'tok',
  secret: 'secret',
  allowedHostnames: ['easypayments.dev'],
  expectedAction: 'contact',
  maxAgeSeconds: 300,
  nowMs: NOW_MS,
};

describe('verifyTurnstile', () => {
  it('accepts a valid token for an allowed hostname and the expected action', async () => {
    const fetchImpl = fakeFetch(turnstileOk());
    await expect(verifyTurnstile({ ...base, fetchImpl })).resolves.toEqual({ ok: true });
    expect(fetchImpl.calls).toBe(1);
  });

  it('posts form-encoded secret/response to the official siteverify endpoint', async () => {
    let seen: { url: string; body: string } | undefined;
    await verifyTurnstile({
      ...base,
      remoteIp: '203.0.113.7',
      fetchImpl: async (url, init) => {
        seen = { url, body: init.body };
        return { ok: true, status: 200, json: async () => turnstileOk() };
      },
    });
    expect(seen?.url).toBe(TURNSTILE_VERIFY_URL);
    const params = new URLSearchParams(seen?.body);
    expect(params.get('secret')).toBe('secret');
    expect(params.get('response')).toBe('tok');
    expect(params.get('remoteip')).toBe('203.0.113.7');
  });

  it('rejects invalid, expired, and reused tokens reported by Cloudflare', async () => {
    for (const code of ['invalid-input-response', 'timeout-or-duplicate']) {
      const outcome = await verifyTurnstile({
        ...base,
        fetchImpl: fakeFetch({ success: false, 'error-codes': [code] }),
      });
      expect(outcome).toEqual({ ok: false, reason: 'rejected', errorCodes: [code] });
    }
  });

  it('rejects a hostname outside the allowlist', async () => {
    const outcome = await verifyTurnstile({
      ...base,
      fetchImpl: fakeFetch(turnstileOk({ hostname: 'evil.example' })),
    });
    expect(outcome).toEqual({ ok: false, reason: 'hostname' });
  });

  it('rejects a missing/other action', async () => {
    for (const action of [undefined, 'login']) {
      const outcome = await verifyTurnstile({ ...base, fetchImpl: fakeFetch(turnstileOk({ action })) });
      expect(outcome).toEqual({ ok: false, reason: 'action' });
    }
  });

  it('rejects stale challenges', async () => {
    const outcome = await verifyTurnstile({
      ...base,
      fetchImpl: fakeFetch(turnstileOk({ challenge_ts: new Date(NOW_MS - 301_000).toISOString() })),
    });
    expect(outcome).toEqual({ ok: false, reason: 'expired' });
  });

  it('fails closed when Cloudflare is unreachable or errors', async () => {
    const throwing = await verifyTurnstile({
      ...base,
      fetchImpl: async () => {
        throw new Error('network');
      },
    });
    expect(throwing).toEqual({ ok: false, reason: 'unavailable' });
    const serverError = await verifyTurnstile({ ...base, fetchImpl: fakeFetch({}, 500) });
    expect(serverError).toEqual({ ok: false, reason: 'unavailable' });
  });
});
