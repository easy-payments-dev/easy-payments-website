import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ContactConfig } from '../lambda/config';
import { LocalMockEmailTransport } from '../lambda/email';
import { HandlerDeps } from '../lambda/handler';
import { MemoryGuardStore } from '../lambda/memory-store';
import { FetchLike } from '../lambda/turnstile';

export const ORIGIN = 'https://easypayments.dev';
export const KEY_1 = '3b241101-e2bb-4255-8caf-4136c566a962';
export const KEY_2 = '9b2a3a0e-7c4e-4f6b-8f41-0d3e5a1c2b77';
export const NOW_MS = Date.parse('2026-11-08T20:00:00.000Z');

export function testConfig(overrides: Partial<ContactConfig> = {}): ContactConfig {
  return {
    stage: 'prod',
    productionLike: true,
    emailTransport: 'ses',
    toEmail: 'owner@example.com',
    fromEmail: 'no-reply@easypayments.dev',
    allowedOrigins: [ORIGIN],
    turnstile: {
      secret: 'unit-test-turnstile-secret',
      allowedHostnames: ['easypayments.dev'],
      expectedAction: 'contact',
      maxAgeSeconds: 300,
    },
    ipHashSecret: 'x'.repeat(48),
    guardTableName: 'guard',
    limits: { windowSeconds: 900, maxSubmissions: 3, maxAttempts: 10, dailySendCap: 50 },
    ...overrides,
  };
}

export function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Ada Lovelace',
    replyEmail: 'ada@example.org',
    type: 'suggestion',
    message: 'Please add a dark mode toggle.\nThanks!',
    website: '',
    turnstileToken: 'tok-valid-123',
    ...overrides,
  };
}

export function turnstileOk(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    hostname: 'easypayments.dev',
    action: 'contact',
    challenge_ts: new Date(NOW_MS - 5000).toISOString(),
    'error-codes': [],
    ...overrides,
  };
}

export function fakeFetch(payload: unknown, status = 200): FetchLike & { calls: number } {
  const wrapped = (async () => {
    wrapped.calls += 1;
    return { ok: status >= 200 && status < 300, status, json: async () => payload };
  }) as unknown as FetchLike & { calls: number };
  wrapped.calls = 0;
  return wrapped;
}

export function makeEvent(options: {
  body?: unknown;
  rawBody?: string;
  method?: string;
  origin?: string | null;
  key?: string | null;
  ip?: string;
  contentType?: string;
}): APIGatewayProxyEventV2 {
  const headers: Record<string, string> = {
    'content-type': options.contentType ?? 'application/json',
  };
  if (options.origin !== null) {
    headers['origin'] = options.origin ?? ORIGIN;
  }
  if (options.key !== null) {
    headers['idempotency-key'] = options.key ?? KEY_1;
  }
  return {
    version: '2.0',
    routeKey: 'POST /contact',
    rawPath: '/contact',
    rawQueryString: '',
    headers,
    isBase64Encoded: false,
    body: options.rawBody ?? JSON.stringify(options.body ?? validBody()),
    requestContext: {
      requestId: 'req-1',
      http: {
        method: options.method ?? 'POST',
        sourceIp: options.ip ?? '203.0.113.7',
        path: '/contact',
        protocol: 'HTTP/1.1',
        userAgent: 'vitest',
      },
    },
  } as unknown as APIGatewayProxyEventV2;
}

export interface Harness {
  deps: HandlerDeps;
  store: MemoryGuardStore;
  email: LocalMockEmailTransport;
  logs: Record<string, unknown>[];
  fetchImpl: ReturnType<typeof fakeFetch>;
}

export function makeHarness(
  options: {
    config?: Partial<ContactConfig>;
    fetchImpl?: ReturnType<typeof fakeFetch>;
    emailFails?: boolean;
  } = {},
): Harness {
  const store = new MemoryGuardStore();
  const email = new LocalMockEmailTransport({ write: () => undefined });
  if (options.emailFails) {
    email.send = async () => {
      throw Object.assign(new Error('boom'), { name: 'MessageRejected' });
    };
  }
  const fetchImpl = options.fetchImpl ?? fakeFetch(turnstileOk());
  const logs: Record<string, unknown>[] = [];
  const config = testConfig(options.config);
  return {
    store,
    email,
    logs,
    fetchImpl,
    deps: {
      getRuntime: async () => ({ ok: true, runtime: { config, store, email } }),
      fetchImpl,
      now: () => NOW_MS,
      log: (entry) => logs.push(entry),
    },
  };
}
