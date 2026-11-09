import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ContactApiService, createIdempotencyKey } from './contact-api.service';
import { CONTACT_CONFIG, ContactConfig } from './contact.config';
import { ContactSubmitPayload } from './contact.types';

const payload: ContactSubmitPayload = {
  name: 'Ada',
  replyEmail: 'ada@example.org',
  type: 'inquiry',
  message: 'Hello',
  website: '',
  turnstileToken: 'tok',
};

function setup(config: ContactConfig) {
  TestBed.configureTestingModule({ providers: [{ provide: CONTACT_CONFIG, useValue: config }] });
  return TestBed.inject(ContactApiService);
}

const operational: ContactConfig = {
  operational: true,
  transport: 'api',
  apiUrl: 'https://api.example.com/contact',
  siteKey: 'key',
};

describe('ContactApiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates v4 UUID idempotency keys', () => {
    const key = createIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createIdempotencyKey()).not.toBe(key);
  });

  it('POSTs JSON with Turnstile token, honeypot, and Idempotency-Key — and no destination email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":"accepted"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await setup(operational).submit(payload, 'key-123');

    expect(result).toEqual({ kind: 'success' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/contact');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Idempotency-Key']).toBe('key-123');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual(payload);
    expect(Object.keys(body)).not.toContain('to');
    expect(Object.keys(body)).not.toContain('toEmail');
  });

  it.each([
    [429, { kind: 'rate-limited', retryAfterSeconds: 120 }],
    [403, { kind: 'verification-failed' }],
    [400, { kind: 'invalid' }],
    [500, { kind: 'error' }],
    [503, { kind: 'error' }],
  ])('maps HTTP %i', async (status, expected) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status, headers: { 'Retry-After': '120' } })),
    );
    expect(await setup(operational).submit(payload, 'k')).toEqual(expected);
  });

  it('returns an error on network failure and never fabricates success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    expect(await setup(operational).submit(payload, 'k')).toEqual({ kind: 'error' });
  });

  it('does not call the network when the config is not operational', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const service = setup({ operational: false, reason: 'disabled' });
    expect(await service.submit(payload, 'k')).toEqual({ kind: 'error' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
