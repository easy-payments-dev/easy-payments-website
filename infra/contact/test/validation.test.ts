import { describe, expect, it } from 'vitest';
import { isHoneypotTriggered, isValidEmail, parseContactBody } from '../lambda/validation';
import { validBody } from './helpers';

describe('parseContactBody', () => {
  it('accepts a valid body and normalizes whitespace', () => {
    const result = parseContactBody(
      validBody({ name: '  Ada   Lovelace ', message: ' Hello\r\nworld ', replyEmail: ' ada@example.org ' }),
    );
    expect(result).toEqual({
      kind: 'valid',
      submission: {
        name: 'Ada Lovelace',
        replyEmail: 'ada@example.org',
        type: 'suggestion',
        message: 'Hello\nworld',
      },
      turnstileToken: 'tok-valid-123',
    });
  });

  it('enforces required fields', () => {
    const result = parseContactBody({});
    expect(result).toEqual({
      kind: 'invalid',
      fields: { name: 'required', replyEmail: 'required', type: 'required', message: 'required' },
    });
  });

  it('enforces max lengths (name 100, email 254, message 3000)', () => {
    expect(parseContactBody(validBody({ name: 'a'.repeat(100) })).kind).toBe('valid');
    expect(parseContactBody(validBody({ name: 'a'.repeat(101) }))).toMatchObject({
      kind: 'invalid',
      fields: { name: 'too_long' },
    });
    expect(parseContactBody(validBody({ message: 'm'.repeat(3000) })).kind).toBe('valid');
    expect(parseContactBody(validBody({ message: 'm'.repeat(3001) }))).toMatchObject({
      kind: 'invalid',
      fields: { message: 'too_long' },
    });
    const longEmail = `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(60)}.com`;
    expect(longEmail.length).toBeGreaterThan(254);
    expect(parseContactBody(validBody({ replyEmail: longEmail }))).toMatchObject({
      kind: 'invalid',
      fields: { replyEmail: 'too_long' },
    });
  });

  it('allowlists the type', () => {
    for (const type of ['suggestion', 'problem', 'inquiry', 'other']) {
      expect(parseContactBody(validBody({ type })).kind).toBe('valid');
    }
    expect(parseContactBody(validBody({ type: 'billing' }))).toMatchObject({
      kind: 'invalid',
      fields: { type: 'invalid_type' },
    });
    expect(parseContactBody(validBody({ type: ['other'] }))).toMatchObject({
      kind: 'invalid',
      fields: { type: 'invalid_type' },
    });
  });

  it('rejects non-string values and non-object bodies', () => {
    expect(parseContactBody(validBody({ name: 42 }))).toMatchObject({
      kind: 'invalid',
      fields: { name: 'invalid_type' },
    });
    expect(parseContactBody(null).kind).toBe('invalid');
    expect(parseContactBody([]).kind).toBe('invalid');
    expect(parseContactBody('x').kind).toBe('invalid');
  });

  it('rejects control characters in the message and header-unsafe emails', () => {
    expect(parseContactBody(validBody({ message: 'bad\u0000text' }))).toMatchObject({
      kind: 'invalid',
      fields: { message: 'invalid_characters' },
    });
    expect(parseContactBody(validBody({ replyEmail: 'a@example.org\r\nBcc: x@evil.test' }))).toMatchObject({
      kind: 'invalid',
      fields: { replyEmail: 'invalid_email' },
    });
  });

  it('returns a null Turnstile token when absent or oversized', () => {
    expect(parseContactBody(validBody({ turnstileToken: undefined }))).toMatchObject({
      kind: 'valid',
      turnstileToken: null,
    });
    expect(parseContactBody(validBody({ turnstileToken: 't'.repeat(2049) }))).toMatchObject({
      kind: 'valid',
      turnstileToken: null,
    });
  });
});

describe('honeypot', () => {
  it('triggers on any filled website value and ignores empty/blank', () => {
    expect(isHoneypotTriggered({ website: 'https://spam.test' })).toBe(true);
    expect(isHoneypotTriggered({ website: ' x ' })).toBe(true);
    expect(isHoneypotTriggered({ website: { a: 1 } })).toBe(true);
    expect(isHoneypotTriggered({ website: '' })).toBe(false);
    expect(isHoneypotTriggered({ website: '   ' })).toBe(false);
    expect(isHoneypotTriggered({})).toBe(false);
  });

  it('short-circuits before field validation so bots get no field feedback', () => {
    expect(parseContactBody({ website: 'bot' })).toEqual({ kind: 'honeypot' });
    expect(parseContactBody(validBody({ website: 'bot', name: '' }))).toEqual({ kind: 'honeypot' });
  });
});

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last+tag@example.org', "o'brien@sub.example.com"])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each(['', 'plain', '@example.org', 'a@', 'a@localhost', 'a b@example.org', 'a..b@example.org', '.a@example.org', 'a@-bad.com'])(
    'rejects %j',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});
