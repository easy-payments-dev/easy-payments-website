import { Injectable, inject } from '@angular/core';
import { CONTACT_CONFIG } from './contact.config';
import { ContactApiResult, ContactSubmitPayload } from './contact.types';

const REQUEST_TIMEOUT_MS = 20_000;

/** RFC 4122 v4 UUID for the Idempotency-Key header. */
export function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/**
 * Posts the contact form as JSON. Only runs when the contact config is operational; it never
 * fabricates a success result and never sends a destination email address.
 */
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly config = inject(CONTACT_CONFIG);

  async submit(payload: ContactSubmitPayload, idempotencyKey: string): Promise<ContactApiResult> {
    const config = this.config;
    if (!config.operational) {
      return { kind: 'error' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'strict-origin-when-cross-origin',
        signal: controller.signal,
      });
      return await this.mapResponse(response);
    } catch {
      return { kind: 'error' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapResponse(response: Response): Promise<ContactApiResult> {
    if (response.status === 200 || response.status === 201 || response.status === 202) {
      return { kind: 'success' };
    }
    if (response.status === 429) {
      const header = Number(response.headers.get('Retry-After'));
      return {
        kind: 'rate-limited',
        retryAfterSeconds: Number.isFinite(header) && header > 0 ? header : null,
      };
    }
    if (response.status === 403) {
      return { kind: 'verification-failed' };
    }
    if (response.status === 400 || response.status === 422) {
      return { kind: 'invalid' };
    }
    return { kind: 'error' };
  }
}
