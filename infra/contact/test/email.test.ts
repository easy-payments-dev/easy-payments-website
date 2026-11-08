import { describe, expect, it } from 'vitest';
import { LocalMockEmailTransport, buildContactEmail } from '../lambda/email';

const settings = { toEmail: 'owner@example.com', fromEmail: 'no-reply@easypayments.dev' };
const meta = { receivedAtIso: '2026-11-08T20:00:00.000Z', requestId: 'req-1' };

describe('buildContactEmail', () => {
  const message = buildContactEmail(
    { name: 'Ada', replyEmail: 'ada@example.org', type: 'problem', message: 'It broke\n<b>x</b>' },
    settings,
    meta,
  );

  it('uses the fixed recipient, verified sender, and visitor only as Reply-To', () => {
    expect(message.to).toBe('owner@example.com');
    expect(message.from).toBe('no-reply@easypayments.dev');
    expect(message.replyTo).toBe('ada@example.org');
  });

  it('builds the subject server-side from the allowlisted type label', () => {
    expect(message.subject).toBe('[Easy Payments] Problem');
    for (const [type, label] of [
      ['suggestion', 'Suggestion'],
      ['inquiry', 'Inquiry'],
      ['other', 'Other'],
    ] as const) {
      expect(
        buildContactEmail({ name: 'n', replyEmail: 'a@b.co', type, message: 'm' }, settings, meta).subject,
      ).toBe(`[Easy Payments] ${label}`);
    }
  });

  it('is plain text and keeps visitor content out of the subject', () => {
    expect(message.text).toContain('Name: Ada');
    expect(message.text).toContain('<b>x</b>'); // plain text: no HTML interpretation
    expect(message.subject).not.toContain('Ada');
  });
});

describe('LocalMockEmailTransport', () => {
  it('captures in memory without printing the body by default', async () => {
    const lines: string[] = [];
    const transport = new LocalMockEmailTransport({ write: (line) => lines.push(line) });
    const result = await transport.send(
      buildContactEmail({ name: 'Ada', replyEmail: 'ada@example.org', type: 'other', message: 'secret body' }, settings, meta),
    );
    expect(result.messageId).toBe('local-mock-1');
    expect(transport.sent).toHaveLength(1);
    expect(lines.join('\n')).not.toContain('secret body');
    expect(lines.join('\n')).not.toContain('ada@example.org');
  });
});
