import {
  CONTACT_LIMITS,
  CONTACT_TYPES,
  ContactFieldErrors,
  ContactFormValues,
  ContactType,
} from './contact.types';

/**
 * Pragmatic, ASCII-only email check (HTML-spec style, requires a dot in the domain).
 * Mirrors the backend; the backend remains authoritative.
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isContactType(value: string): value is ContactType {
  return (CONTACT_TYPES as readonly string[]).includes(value);
}

export function isValidEmail(value: string): boolean {
  return value.length <= CONTACT_LIMITS.emailMax && EMAIL_PATTERN.test(value);
}

export function validateContactForm(
  values: Pick<ContactFormValues, 'name' | 'replyEmail' | 'type' | 'message'>,
): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'required';
  } else if (name.length > CONTACT_LIMITS.nameMax) {
    errors.name = 'tooLong';
  }

  const email = values.replyEmail.trim();
  if (!email) {
    errors.replyEmail = 'required';
  } else if (email.length > CONTACT_LIMITS.emailMax) {
    errors.replyEmail = 'tooLong';
  } else if (!isValidEmail(email)) {
    errors.replyEmail = 'invalidEmail';
  }

  if (!isContactType(values.type)) {
    errors.type = 'required';
  }

  const message = values.message.trim();
  if (!message) {
    errors.message = 'required';
  } else if (message.length > CONTACT_LIMITS.messageMax) {
    errors.message = 'tooLong';
  }

  return errors;
}

export function hasContactErrors(errors: ContactFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
