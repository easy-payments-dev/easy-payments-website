export const CONTACT_TYPES = ['suggestion', 'problem', 'inquiry', 'other'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Keep in sync with `infra/contact/lambda/validation.ts` and `scripts/local-contact-api.mjs`. */
export const CONTACT_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  messageMax: 3000,
} as const;

/** Turnstile `action` expected by the backend. */
export const CONTACT_TURNSTILE_ACTION = 'contact';

export interface ContactFormValues {
  name: string;
  replyEmail: string;
  type: ContactType;
  message: string;
  /** Honeypot — real visitors never see or fill this field. */
  website: string;
}

/** JSON body sent to the contact API. The destination address is never part of it. */
export interface ContactSubmitPayload {
  name: string;
  replyEmail: string;
  type: ContactType;
  message: string;
  website: string;
  turnstileToken: string;
}

export type ContactFieldError = 'required' | 'tooLong' | 'invalidEmail';
export type ContactFieldName = 'name' | 'replyEmail' | 'type' | 'message';
export type ContactFieldErrors = Partial<Record<ContactFieldName, ContactFieldError>>;

export type ContactStatus = 'idle' | 'submitting' | 'success' | 'error' | 'rate-limited';

export type ContactApiResult =
  | { kind: 'success' }
  | { kind: 'rate-limited'; retryAfterSeconds: number | null }
  | { kind: 'verification-failed' }
  | { kind: 'invalid' }
  | { kind: 'error' };
