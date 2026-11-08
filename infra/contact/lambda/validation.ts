import { CONTACT_TYPES, ContactSubmission, ContactType, LIMITS } from './types';

export type FieldCode =
  | 'required'
  | 'invalid_type'
  | 'too_long'
  | 'invalid_email'
  | 'invalid_characters';

export type ContactField = 'name' | 'replyEmail' | 'type' | 'message';

export type ParsedBody =
  | { kind: 'honeypot' }
  | { kind: 'invalid'; fields: Partial<Record<ContactField, FieldCode>> }
  | { kind: 'valid'; submission: ContactSubmission; turnstileToken: string | null };

/** ASCII HTML-spec-style email check that requires a dotted domain. */
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/;
// eslint-disable-next-line no-control-regex
const ANY_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

export function isValidEmail(value: string): boolean {
  if (value.length === 0 || value.length > LIMITS.emailMax) {
    return false;
  }
  const at = value.lastIndexOf('@');
  if (at < 1 || at > LIMITS.emailLocalMax) {
    return false;
  }
  if (value.includes('..') || value.startsWith('.') || value.slice(0, at).endsWith('.')) {
    return false;
  }
  return EMAIL_PATTERN.test(value);
}

export function isContactType(value: unknown): value is ContactType {
  return typeof value === 'string' && (CONTACT_TYPES as readonly string[]).includes(value);
}

/** A filled honeypot field means "bot". Non-string values count as filled. */
export function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  const value = body['website'];
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Parses and validates the JSON body. Limits match the browser form
 * (name ≤ 100, email ≤ 254, message ≤ 3000).
 * The honeypot is evaluated first so bots get no field-level feedback.
 */
export function parseContactBody(raw: unknown): ParsedBody {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'invalid', fields: { name: 'required' } };
  }
  const body = raw as Record<string, unknown>;

  if (isHoneypotTriggered(body)) {
    return { kind: 'honeypot' };
  }

  const fields: Partial<Record<ContactField, FieldCode>> = {};

  // Name: single line, whitespace collapsed.
  let name = '';
  if (typeof body['name'] !== 'string') {
    fields.name = body['name'] === undefined ? 'required' : 'invalid_type';
  } else {
    name = body['name'].replace(/\s+/g, ' ').trim();
    if (!name) {
      fields.name = 'required';
    } else if (name.length > LIMITS.nameMax) {
      fields.name = 'too_long';
    } else if (ANY_CONTROL_CHARS.test(name)) {
      fields.name = 'invalid_characters';
    }
  }

  // Email: also becomes the Reply-To header, so reject anything header-unsafe.
  let replyEmail = '';
  if (typeof body['replyEmail'] !== 'string') {
    fields.replyEmail = body['replyEmail'] === undefined ? 'required' : 'invalid_type';
  } else {
    replyEmail = body['replyEmail'].trim();
    if (!replyEmail) {
      fields.replyEmail = 'required';
    } else if (replyEmail.length > LIMITS.emailMax) {
      fields.replyEmail = 'too_long';
    } else if (!isValidEmail(replyEmail)) {
      fields.replyEmail = 'invalid_email';
    }
  }

  let type: ContactType = 'other';
  if (!isContactType(body['type'])) {
    fields.type = body['type'] === undefined ? 'required' : 'invalid_type';
  } else {
    type = body['type'];
  }

  // Message: keep line breaks, normalize CRLF, reject other control characters.
  let message = '';
  if (typeof body['message'] !== 'string') {
    fields.message = body['message'] === undefined ? 'required' : 'invalid_type';
  } else {
    message = body['message'].replace(/\r\n?/g, '\n').trim();
    if (!message) {
      fields.message = 'required';
    } else if (message.length > LIMITS.messageMax) {
      fields.message = 'too_long';
    } else if (CONTROL_CHARS.test(message)) {
      fields.message = 'invalid_characters';
    }
  }

  if (Object.keys(fields).length > 0) {
    return { kind: 'invalid', fields };
  }

  const token = body['turnstileToken'];
  const turnstileToken =
    typeof token === 'string' && token.length > 0 && token.length <= LIMITS.turnstileTokenMax
      ? token
      : null;

  return {
    kind: 'valid',
    submission: { name, replyEmail, type, message },
    turnstileToken,
  };
}
