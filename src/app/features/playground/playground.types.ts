import { HistoricalAngularVersion } from '../../core/docs/historical-api.evidence';

export type PlaygroundVersion = HistoricalAngularVersion;

export type PlaygroundPaymentMethod =
  | 'card'
  | 'paypal'
  | 'apple-pay'
  | 'google-pay'
  | 'klarna'
  | 'affirm';

export type PlaygroundCheckoutTheme = 'light' | 'dark' | 'system';
export type PlaygroundAppearance = 'default' | 'transparent';
export type PlaygroundSuccessBehavior = 'confirmation' | 'event-only';
export type PlaygroundLocale = 'auto' | 'en' | 'es' | 'pt';

export type PlaygroundSimEventName =
  | 'success'
  | 'cancel'
  | 'error'
  | 'successContinue';

export type PlaygroundPreviewState =
  | 'idle'
  | 'selected'
  | 'success'
  | 'cancelled'
  | 'error';

export interface PlaygroundProductConfig {
  name: string;
  description: string;
  amount: number;
  currency: string;
  quantity: number;
}

export interface PlaygroundConfig {
  version: PlaygroundVersion;
  product: PlaygroundProductConfig;
  methods: PlaygroundPaymentMethod[];
  theme: PlaygroundCheckoutTheme;
  appearance: PlaygroundAppearance;
  successBehavior: PlaygroundSuccessBehavior;
  locale: PlaygroundLocale;
  maxWidth: number;
}

export interface PlaygroundValidationIssue {
  field: string;
  message: string;
}

export interface PlaygroundSimEvent {
  id: string;
  at: string;
  name: PlaygroundSimEventName;
  detail: string;
}

export interface PlaygroundCodeBundle {
  install: string;
  appConfig: string;
  componentTs: string;
  componentHtml: string;
  docsHref: string;
}

export const PLAYGROUND_METHOD_OPTIONS: readonly {
  id: PlaygroundPaymentMethod;
  label: string;
  markSrc: string | null;
}[] = [
  { id: 'card', label: 'Card', markSrc: null },
  { id: 'paypal', label: 'PayPal', markSrc: null },
  {
    id: 'apple-pay',
    label: 'Apple Pay',
    markSrc: 'payment-marks/apple-pay-mark.svg',
  },
  {
    id: 'google-pay',
    label: 'Google Pay',
    markSrc: 'payment-marks/google-pay-mark.svg',
  },
  { id: 'klarna', label: 'Klarna', markSrc: null },
  { id: 'affirm', label: 'Affirm', markSrc: null },
] as const;

export const PLAYGROUND_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
] as const;
