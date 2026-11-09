import { ContactEnvironment, resolveContactConfig } from './contact.config';

const dev: ContactEnvironment = {
  production: false,
  contactTransport: 'local-mock',
  contactApiUrl: 'http://127.0.0.1:8787/contact',
  turnstileSiteKey: '1x00000000000000000000AA',
  contactEnabled: true,
};

const prod: ContactEnvironment = {
  production: true,
  contactTransport: 'api',
  contactApiUrl: 'https://api.example.com/contact',
  turnstileSiteKey: '0x4AAAAAAAexample',
  contactEnabled: true,
};

describe('resolveContactConfig', () => {
  it('is operational for the dev local mock with the Turnstile test key', () => {
    expect(resolveContactConfig(dev)).toEqual({
      operational: true,
      transport: 'local-mock',
      apiUrl: 'http://127.0.0.1:8787/contact',
      siteKey: '1x00000000000000000000AA',
    });
  });

  it('is operational in production only with api transport, https URL, and a site key', () => {
    expect(resolveContactConfig(prod).operational).toBe(true);
  });

  it('is NOT operational for the shipped production defaults (null url/key, disabled)', () => {
    expect(
      resolveContactConfig({
        production: true,
        contactTransport: 'api',
        contactApiUrl: null,
        turnstileSiteKey: null,
        contactEnabled: false,
      }),
    ).toEqual({ operational: false, reason: 'disabled' });
  });

  it('reports missing configuration even when enabled', () => {
    expect(resolveContactConfig({ ...prod, contactApiUrl: null })).toEqual({
      operational: false,
      reason: 'missing-api-url',
    });
    expect(resolveContactConfig({ ...prod, turnstileSiteKey: ' ' })).toEqual({
      operational: false,
      reason: 'missing-site-key',
    });
  });

  it('never accepts the local mock in production', () => {
    expect(resolveContactConfig({ ...prod, contactTransport: 'local-mock' })).toEqual({
      operational: false,
      reason: 'local-mock-in-production',
    });
    expect(resolveContactConfig({ ...dev, production: true })).toEqual({
      operational: false,
      reason: 'local-mock-in-production',
    });
  });

  it('requires https for api and localhost for the mock', () => {
    expect(resolveContactConfig({ ...prod, contactApiUrl: 'http://api.example.com/contact' })).toEqual({
      operational: false,
      reason: 'invalid-api-url',
    });
    expect(resolveContactConfig({ ...prod, contactApiUrl: 'not a url' })).toEqual({
      operational: false,
      reason: 'invalid-api-url',
    });
    expect(
      resolveContactConfig({ ...dev, contactApiUrl: 'https://remote.example.com/contact' }),
    ).toEqual({ operational: false, reason: 'invalid-api-url' });
  });
});
