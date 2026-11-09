import { generatePlaygroundCode } from './playground-code.generator';
import { createDefaultPlaygroundConfig } from './playground.defaults';

describe('generatePlaygroundCode', () => {
  it('defaults generated examples to 1.2.0', () => {
    const config = createDefaultPlaygroundConfig();
    expect(config.version).toBe('1.2.0');
    const code = generatePlaygroundCode(config);
    expect(code.install).toContain('@easy-payments/angular@1.2.0');
    expect(code.componentHtml).toContain('<easy-payments');
    expect(code.componentHtml).toContain('locale="auto"');
    expect(code.docsHref).toBe('/docs/angular/1.2.0/getting-started');
  });

  it('generates Buttons Only snippets that use the public appearance API for 1.2.0', () => {
    const code = generatePlaygroundCode(createDefaultPlaygroundConfig('1.2.0'), {
      mode: 'buttons',
      buttonsLayout: 'horizontal',
    });
    expect(code.componentTs).toContain('EasyPaymentButtonsComponent');
    expect(code.componentTs).toContain('EasyPaymentButtonsAppearance');
    expect(code.componentTs).toContain("gap: '8px'");
    expect(code.componentTs).toContain("buttonHeight: '40px'");
    expect(code.componentTs).toContain("buttonMinWidth: '100px'");
    expect(code.componentHtml).toContain('<easy-payment-buttons');
    expect(code.componentHtml).toContain('layout="horizontal"');
    expect(code.componentHtml).toContain('[buttonsAppearance]="buttonsAppearance"');
    expect(code.componentHtml).toContain('(started)');
  });

  it('generates Headless snippets for 1.2.0', () => {
    const code = generatePlaygroundCode(createDefaultPlaygroundConfig('1.2.0'), {
      mode: 'headless',
    });
    expect(code.componentTs).toContain('EasyPaymentsHeadless');
    expect(code.componentTs).toContain('createSession');
    expect(code.componentTs).toContain('session.mount');
    expect(code.componentTs).toContain("locale: this.locale");
    expect(code.install).toContain('@easy-payments/angular@1.2.0');
  });

  it('falls back to Full Checkout for versions without Buttons Only or Headless', () => {
    for (const mode of ['buttons', 'headless'] as const) {
      const code = generatePlaygroundCode(createDefaultPlaygroundConfig('1.1.0'), {
        mode,
      });
      expect(code.componentTs).toContain('EasyPaymentsComponent');
      expect(code.componentTs).not.toContain('EasyPaymentsHeadless');
      expect(code.componentHtml).not.toContain('easy-payment-buttons');
    }
  });

  it('generates version-pinned install and verified public exports for 1.1.0', () => {
    const code = generatePlaygroundCode(createDefaultPlaygroundConfig('1.1.0'));
    expect(code.install).toContain('@easy-payments/angular@1.1.0');
    expect(code.appConfig).toContain('provideEasyPayments');
    expect(code.appConfig).not.toContain('baseUrl');
    expect(code.componentTs).toContain('EasyPaymentsComponent');
    expect(code.componentHtml).toContain('locale=');
    expect(code.componentHtml).toContain('(success)');
    expect(code.componentHtml).toContain('(successContinue)');
    expect(code.componentHtml).not.toContain('(started)');
    expect(code.componentHtml).not.toContain('visualStyle');
    expect(code.componentHtml).not.toContain('checkoutInstanceId');
    expect(code.docsHref).toBe('/docs/angular/1.1.0/getting-started');
  });

  it('omits locale for Angular 1.0.0', () => {
    const code = generatePlaygroundCode(createDefaultPlaygroundConfig('1.0.0'));
    expect(code.install).toContain('@easy-payments/angular@1.0.0');
    expect(code.componentHtml).not.toContain('locale=');
    expect(code.componentTs).not.toContain('readonly locale');
  });

  it('escapes user-supplied product strings in generated TypeScript', () => {
    const config = createDefaultPlaygroundConfig('1.1.0');
    config.product.name = "Jose's Plan";
    config.product.description = 'Line with \\ backslash';
    const code = generatePlaygroundCode(config);
    expect(code.componentTs).toContain("name: 'Jose\\'s Plan'");
    expect(code.componentTs).toContain("description: 'Line with \\\\ backslash'");
  });
});
