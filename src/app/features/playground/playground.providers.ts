import { EnvironmentProviders } from '@angular/core';
import { provideEasyPayments } from '@easy-payments/angular';

/**
 * Playground-only Easy Payments providers.
 * Mock mode uses library mock adapters — no real charges and no provider SDK init.
 */
export function providePlaygroundEasyPayments(): EnvironmentProviders {
  return provideEasyPayments({
    enableMockMode: true,
    providers: {},
  });
}
