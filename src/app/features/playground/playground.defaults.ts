import type { EasyPaymentButtonsAppearance } from '@easy-payments/angular';
import {
  PlaygroundConfig,
  PlaygroundDemoMode,
  PlaygroundPaymentMethod,
  PlaygroundVersion,
} from './playground.types';

const ALL_METHODS: PlaygroundPaymentMethod[] = [
  'card',
  'paypal',
  'apple-pay',
  'google-pay',
  'klarna',
  'affirm',
];

/** Default package version for generated examples and the live demos. */
export const PLAYGROUND_DEFAULT_SNIPPET_VERSION: PlaygroundVersion = '1.2.0';

/**
 * Snippet versions offered per demo mode. Buttons Only and Headless only
 * exist from 1.2.0 onward; Full Checkout keeps the older published versions.
 */
export const PLAYGROUND_VERSIONS_BY_MODE: Record<
  PlaygroundDemoMode,
  readonly PlaygroundVersion[]
> = {
  full: ['1.2.0', '1.1.0', '1.0.0'],
  buttons: ['1.2.0'],
  headless: ['1.2.0'],
};

export function playgroundSupportsVersion(
  mode: PlaygroundDemoMode,
  version: PlaygroundVersion,
): boolean {
  return PLAYGROUND_VERSIONS_BY_MODE[mode].includes(version);
}

/**
 * Buttons Only appearance — mirrors the library demo defaults. All Card /
 * Klarna / Affirm selectors and wallet SDK/mock buttons share this height,
 * min-width, and gap through the public [buttonsAppearance] API.
 * separators is intentionally omitted so the library default applies.
 */
export const PLAYGROUND_BUTTONS_APPEARANCE: EasyPaymentButtonsAppearance = {
  gap: '8px',
  buttonHeight: '40px',
  buttonMinWidth: '100px',
  background: 'transparent',
};

export function createDefaultPlaygroundConfig(
  version: PlaygroundVersion = PLAYGROUND_DEFAULT_SNIPPET_VERSION,
): PlaygroundConfig {
  return {
    version,
    product: {
      name: 'Premium Plan',
      description: 'One year subscription',
      amount: 99,
      currency: 'USD',
      quantity: 1,
    },
    methods: [...ALL_METHODS],
    theme: 'system',
    appearance: 'default',
    successBehavior: 'confirmation',
    locale: 'auto',
    maxWidth: 640,
  };
}
