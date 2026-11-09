import { describe, expect, it } from 'vitest';
import { Env, loadConfig } from '../lambda/config';

const goodEnv: Env = {
  STAGE: 'prod',
  CONTACT_TO_EMAIL: 'owner@example.com',
  CONTACT_FROM_EMAIL: 'no-reply@easypayments.dev',
  CONTACT_ALLOWED_ORIGINS: 'https://easypayments.dev',
  GUARD_TABLE_NAME: 'guard',
  TURNSTILE_SECRET: 'real-looking-secret-value',
  IP_HASH_SECRET: 'h'.repeat(40),
};

const noSsm = async () => undefined;

describe('loadConfig', () => {
  it('loads a complete production config with SES transport', async () => {
    const result = await loadConfig(goodEnv, noSsm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.emailTransport).toBe('ses');
      expect(result.config.productionLike).toBe(true);
      expect(result.config.toEmail).toBe('owner@example.com');
      expect(result.config.turnstile.allowedHostnames).toEqual(['easypayments.dev']);
      expect(result.config.limits).toEqual({
        windowSeconds: 900,
        maxSubmissions: 3,
        maxAttempts: 10,
        dailySendCap: 50,
      });
    }
  });

  it('reads secrets from SSM parameter names', async () => {
    const env: Env = { ...goodEnv, TURNSTILE_SECRET: undefined, IP_HASH_SECRET: undefined };
    env['TURNSTILE_SECRET_SSM_PARAM'] = '/ep/turnstile';
    env['IP_HASH_SECRET_SSM_PARAM'] = '/ep/hash';
    const result = await loadConfig(env, async (name) =>
      name === '/ep/turnstile' ? 'ssm-turnstile-secret' : 'q'.repeat(40),
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    ['STAGE=prod', { STAGE: 'prod' }],
    ['STAGE unset (defaults to production)', { STAGE: undefined }],
    ['STAGE=production', { STAGE: 'production' }],
    ['STAGE=staging', { STAGE: 'staging' }],
    ['STAGE=local but NODE_ENV=production', { STAGE: 'local', NODE_ENV: 'production' }],
  ])('refuses local-mock email: %s', async (_label, overrides) => {
    const result = await loadConfig(
      { ...goodEnv, CONTACT_EMAIL_TRANSPORT: 'local-mock', ...overrides },
      noSsm,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain('CONTACT_EMAIL_TRANSPORT:local-mock-refused-in-production');
    }
  });

  it('allows local-mock only for STAGE=local/test outside NODE_ENV=production', async () => {
    for (const stage of ['local', 'test']) {
      const result = await loadConfig(
        {
          ...goodEnv,
          STAGE: stage,
          CONTACT_EMAIL_TRANSPORT: 'local-mock',
          CONTACT_ALLOWED_ORIGINS: 'http://localhost:4200',
          TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        },
        noSsm,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config.emailTransport).toBe('local-mock');
      }
    }
  });

  it('returns an error (never a default) for incomplete production config', async () => {
    const result = await loadConfig({ STAGE: 'prod' }, noSsm);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          'CONTACT_TO_EMAIL:missing-or-invalid',
          'CONTACT_FROM_EMAIL:missing-or-invalid',
          'CONTACT_ALLOWED_ORIGINS:missing',
          'GUARD_TABLE_NAME:missing',
          'TURNSTILE_SECRET:missing',
          'IP_HASH_SECRET:missing-or-too-short',
        ]),
      );
    }
  });

  it('refuses Cloudflare dummy Turnstile secrets and insecure origins in production', async () => {
    const result = await loadConfig(
      {
        ...goodEnv,
        TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        CONTACT_ALLOWED_ORIGINS: 'http://localhost:4200,https://easypayments.dev/path,*',
      },
      noSsm,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain('TURNSTILE_SECRET:test-secret-refused-in-production');
      expect(result.issues.filter((i) => i === 'CONTACT_ALLOWED_ORIGINS:invalid-entry')).toHaveLength(3);
    }
  });

  it('rejects a short IP hash secret and an invalid transport name', async () => {
    const result = await loadConfig(
      { ...goodEnv, IP_HASH_SECRET: 'short', CONTACT_EMAIL_TRANSPORT: 'smtp' },
      noSsm,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining(['IP_HASH_SECRET:missing-or-too-short', 'CONTACT_EMAIL_TRANSPORT:invalid']),
      );
    }
  });

  it('never puts secret or address values in issues', async () => {
    const result = await loadConfig({ ...goodEnv, TURNSTILE_SECRET: '1x0000000000000000000000000000000AA' }, noSsm);
    expect(JSON.stringify(result)).not.toContain('owner@example.com');
    expect(JSON.stringify(result)).not.toContain('1x00000');
  });
});
