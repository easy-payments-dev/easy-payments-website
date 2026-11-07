import { getDocsPage } from './docs.manifest';
import {
  HISTORICAL_ABSENT_IN_1_0_AND_1_1,
  HISTORICAL_ANGULAR_API,
  HISTORICAL_ERROR_CODES,
} from './historical-api.evidence';

describe('historical API evidence (npm tarballs)', () => {
  it('records published package metadata for 1.0.0 and 1.1.0', () => {
    expect(HISTORICAL_ANGULAR_API['1.0.0'].npmShasum).toMatch(/^[a-f0-9]{40}$/);
    expect(HISTORICAL_ANGULAR_API['1.1.0'].npmShasum).toMatch(/^[a-f0-9]{40}$/);
    expect(HISTORICAL_ANGULAR_API['1.0.0'].packageName).toBe(
      '@easy-payments/angular',
    );
    expect(
      HISTORICAL_ANGULAR_API['1.0.0'].peerDependencies['@stripe/stripe-js'],
    ).toBe('^8.0.0');
  });

  it('marks Buttons Only and Headless as absent from published 1.0/1.1', () => {
    expect(HISTORICAL_ANGULAR_API['1.0.0'].hasButtonsOnly).toBe(false);
    expect(HISTORICAL_ANGULAR_API['1.1.0'].hasButtonsOnly).toBe(false);
    expect(HISTORICAL_ANGULAR_API['1.0.0'].hasHeadless).toBe(false);
    expect(HISTORICAL_ANGULAR_API['1.1.0'].hasHeadless).toBe(false);
    expect(HISTORICAL_ABSENT_IN_1_0_AND_1_1).toContain(
      'EasyPaymentButtonsComponent',
    );
    expect(HISTORICAL_ABSENT_IN_1_0_AND_1_1).toContain('EasyPaymentsHeadless');
  });

  it('captures localization only on 1.1.0', () => {
    expect(HISTORICAL_ANGULAR_API['1.0.0'].localization).toBe(false);
    expect(HISTORICAL_ANGULAR_API['1.1.0'].localization).toBe(true);
    expect(HISTORICAL_ANGULAR_API['1.0.0'].componentInputs).not.toContain(
      'locale',
    );
    expect(HISTORICAL_ANGULAR_API['1.1.0'].componentInputs).toEqual(
      expect.arrayContaining(['locale', 'translations']),
    );
  });

  it('lists verified Full Checkout outputs and backend keys', () => {
    for (const version of ['1.0.0', '1.1.0'] as const) {
      expect(HISTORICAL_ANGULAR_API[version].componentOutputs).toEqual([
        'success',
        'cancel',
        'error',
        'successContinue',
      ]);
      expect(HISTORICAL_ANGULAR_API[version].backendConfigKeys).not.toContain(
        'baseUrl',
      );
      expect(HISTORICAL_ANGULAR_API[version].backendConfigKeys).toContain(
        'confirmPaymentUrl',
      );
    }
  });

  it('keeps documentation free of absent historical APIs', () => {
    for (const version of ['1.0.0', '1.1.0'] as const) {
      const pages = [
        getDocsPage('angular', version, 'api-reference'),
        getDocsPage('angular', version, 'configuration'),
        getDocsPage('angular', version, 'theming'),
        getDocsPage('angular', version, 'security'),
        getDocsPage('angular', version, 'examples'),
      ];
      for (const page of pages) {
        expect(page).toBeTruthy();
        expect(page!.markdown).not.toContain('checkoutInstanceId');
        expect(page!.markdown).not.toMatch(/\[visualStyle\]/);
        expect(page!.markdown).not.toMatch(/backend:\s*\{[^}]*baseUrl:/s);
        expect(page!.markdown).not.toMatch(/`started`/);
      }
    }

    expect(
      getDocsPage('angular', '1.0.0', 'api-reference')!.markdown,
    ).not.toContain('locale');
    expect(
      getDocsPage('angular', '1.1.0', 'api-reference')!.markdown,
    ).toContain('locale');
    expect(
      getDocsPage('angular', '1.0.0', 'error-handling')!.markdown,
    ).toContain('PROVIDER_NOT_IMPLEMENTED');
    expect(HISTORICAL_ERROR_CODES).toContain('PROVIDER_NOT_IMPLEMENTED');
  });
});
