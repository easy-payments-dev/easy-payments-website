export type PaymentMethodAvailability =
  | 'available-with-config'
  | 'provider-dependent'
  | 'not-supported';

export interface PaymentMethodMeta {
  id: string;
  name: string;
  provider: string;
  availability: PaymentMethodAvailability;
  summary: string;
  /** Local path, CDN URL, or null for generic/text presentation. */
  markSrc: string | null;
  markAlt: string;
}

/**
 * Supported methods advertised for the published Angular library surface.
 * Samsung Pay is intentionally excluded — it is not supported.
 */
export const PAYMENT_METHODS: readonly PaymentMethodMeta[] = [
  {
    id: 'card',
    name: 'Card',
    provider: 'Stripe',
    availability: 'available-with-config',
    summary: 'Card payments via Stripe Payment Element. Requires your Stripe account and backend confirmation.',
    markSrc: null,
    markAlt: 'Card payment',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    provider: 'PayPal',
    availability: 'provider-dependent',
    summary: 'Official PayPal buttons. Requires PayPal merchant configuration and sandbox/live credentials.',
    markSrc: 'https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg',
    markAlt: 'PayPal',
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    provider: 'Apple Pay',
    availability: 'provider-dependent',
    summary: 'Official Apple Pay mark and wallet flow. Device, domain, and merchant setup required.',
    markSrc: 'payment-marks/apple-pay-mark.svg',
    markAlt: 'Apple Pay',
  },
  {
    id: 'google-pay',
    name: 'Google Pay',
    provider: 'Google Pay',
    availability: 'provider-dependent',
    summary: 'Official Google Pay acceptance mark. Merchant and environment configuration required.',
    markSrc: 'payment-marks/google-pay-mark.svg',
    markAlt: 'Google Pay',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    provider: 'Klarna',
    availability: 'provider-dependent',
    summary: 'Klarna checkout integration. Availability depends on merchant country, currency, and Klarna setup.',
    markSrc: 'https://x.klarnacdn.net/payment-method/assets/badges/generic/klarna.svg',
    markAlt: 'Klarna',
  },
  {
    id: 'affirm',
    name: 'Affirm',
    provider: 'Affirm',
    availability: 'provider-dependent',
    summary: 'Affirm installment payments. Requires Affirm merchant onboarding and product eligibility.',
    markSrc: 'https://cdn-assets.affirm.com/images/black_logo-transparent_bg.svg',
    markAlt: 'Affirm',
  },
] as const;

export const UNSUPPORTED_METHODS = ['Samsung Pay'] as const;
