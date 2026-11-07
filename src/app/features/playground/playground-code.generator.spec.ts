import { generatePlaygroundCode } from './playground-code.generator';
import { createDefaultPlaygroundConfig } from './playground.defaults';

describe('generatePlaygroundCode', () => {
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
