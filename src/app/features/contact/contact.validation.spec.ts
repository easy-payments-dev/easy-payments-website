import { CONTACT_LIMITS } from './contact.types';
import { hasContactErrors, isValidEmail, validateContactForm } from './contact.validation';

const valid = {
  name: 'Ada Lovelace',
  replyEmail: 'ada@example.org',
  type: 'suggestion' as const,
  message: 'Hello there',
};

describe('contact validation', () => {
  it('accepts a valid form', () => {
    expect(hasContactErrors(validateContactForm(valid))).toBe(false);
  });

  it('requires name, email, and message (whitespace only is empty)', () => {
    const errors = validateContactForm({ ...valid, name: '  ', replyEmail: '', message: '\n ' });
    expect(errors).toEqual({ name: 'required', replyEmail: 'required', message: 'required' });
  });

  it('enforces max lengths (100 / 254 / 3000)', () => {
    expect(validateContactForm({ ...valid, name: 'a'.repeat(CONTACT_LIMITS.nameMax) }).name).toBeUndefined();
    expect(validateContactForm({ ...valid, name: 'a'.repeat(CONTACT_LIMITS.nameMax + 1) }).name).toBe(
      'tooLong',
    );
    expect(
      validateContactForm({ ...valid, message: 'm'.repeat(CONTACT_LIMITS.messageMax + 1) }).message,
    ).toBe('tooLong');
    const longEmail = `${'a'.repeat(250)}@b.co`;
    expect(validateContactForm({ ...valid, replyEmail: longEmail }).replyEmail).toBe('tooLong');
  });

  it('validates email format', () => {
    expect(validateContactForm({ ...valid, replyEmail: 'nope' }).replyEmail).toBe('invalidEmail');
    expect(isValidEmail('first.last+tag@example.org')).toBe(true);
    expect(isValidEmail('a@localhost')).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(validateContactForm({ ...valid, type: 'billing' as never }).type).toBe('required');
  });
});
