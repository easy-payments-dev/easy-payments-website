import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ContactEnvironment {
  production: boolean;
  contactTransport: 'local-mock' | 'api';
  contactApiUrl: string | null;
  turnstileSiteKey: string | null;
  contactEnabled: boolean;
}

export type ContactNotOperationalReason =
  | 'disabled'
  | 'missing-api-url'
  | 'missing-site-key'
  | 'invalid-api-url'
  | 'local-mock-in-production';

export type ContactConfig =
  | { operational: true; transport: 'local-mock' | 'api'; apiUrl: string; siteKey: string }
  | { operational: false; reason: ContactNotOperationalReason };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Resolves whether the contact form may be shown as active.
 *
 * - Production builds must use `api` transport with an https endpoint. Misconfiguration
 *   renders the NOT OPERATIONAL notice; there is no client-side simulated success.
 * - `local-mock` is only valid outside production and only for a localhost endpoint.
 */
export function resolveContactConfig(env: ContactEnvironment): ContactConfig {
  if (!env.contactEnabled) {
    return { operational: false, reason: 'disabled' };
  }
  if (env.production && env.contactTransport !== 'api') {
    return { operational: false, reason: 'local-mock-in-production' };
  }

  const apiUrl = env.contactApiUrl?.trim();
  if (!apiUrl) {
    return { operational: false, reason: 'missing-api-url' };
  }
  const siteKey = env.turnstileSiteKey?.trim();
  if (!siteKey) {
    return { operational: false, reason: 'missing-site-key' };
  }

  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    return { operational: false, reason: 'invalid-api-url' };
  }

  if (env.contactTransport === 'local-mock') {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { operational: false, reason: 'invalid-api-url' };
    }
    if (!LOCAL_HOSTS.has(parsed.hostname)) {
      return { operational: false, reason: 'invalid-api-url' };
    }
  } else if (parsed.protocol !== 'https:') {
    return { operational: false, reason: 'invalid-api-url' };
  }

  return { operational: true, transport: env.contactTransport, apiUrl, siteKey };
}

export const CONTACT_CONFIG = new InjectionToken<ContactConfig>('CONTACT_CONFIG', {
  providedIn: 'root',
  factory: () => resolveContactConfig(environment),
});
