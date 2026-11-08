/** Allowlisted contact types. Keep in sync with the Angular form. */
export const CONTACT_TYPES = ['suggestion', 'problem', 'inquiry', 'other'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Human-readable labels used ONLY in the server-built email subject. */
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  suggestion: 'Suggestion',
  problem: 'Problem',
  inquiry: 'Inquiry',
  other: 'Other',
};

export const LIMITS = {
  nameMax: 100,
  emailMax: 254,
  emailLocalMax: 64,
  messageMax: 3000,
  turnstileTokenMax: 2048,
  /** Raw request body cap (bytes). 3000 chars can be ~12 KB in UTF-8. */
  bodyMaxBytes: 32 * 1024,
} as const;

export interface ContactSubmission {
  name: string;
  replyEmail: string;
  type: ContactType;
  message: string;
}

/** Stored (and replayed) result for a completed idempotent request. */
export interface StoredResponse {
  statusCode: number;
  body: string;
}
