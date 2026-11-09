import { CONTACT_TYPE_LABELS, ContactSubmission } from './types';

export interface EmailMessage {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
}

export interface EmailTransport {
  /** Resolves when the transport ACCEPTED the message (SES SendEmail OK ≠ delivered). */
  send(message: EmailMessage): Promise<{ messageId?: string }>;
}

export interface EmailMeta {
  receivedAtIso: string;
  requestId: string;
}

/**
 * Builds the plain-text email. Subject is composed server-side from the allowlisted type only;
 * visitor-provided strings go into the body (and Reply-To, which is validated header-safe).
 * `From` is always the configured verified identity, never the visitor.
 */
export function buildContactEmail(
  submission: ContactSubmission,
  settings: { toEmail: string; fromEmail: string },
  meta: EmailMeta,
): EmailMessage {
  const label = CONTACT_TYPE_LABELS[submission.type];
  const text = [
    'New message from the Easy Payments website contact form.',
    '',
    `Type: ${label}`,
    `Name: ${submission.name}`,
    `Reply-To: ${submission.replyEmail}`,
    `Received: ${meta.receivedAtIso}`,
    `Request ID: ${meta.requestId}`,
    '',
    '--- Message ---',
    submission.message,
    '--- End of message ---',
    '',
    'Reply to this email to answer the visitor. No automatic confirmation was sent to them.',
  ].join('\n');

  return {
    to: settings.toEmail,
    from: settings.fromEmail,
    replyTo: submission.replyEmail,
    subject: `[Easy Payments] ${label}`,
    text,
  };
}

/**
 * Local/test sink. Keeps messages in memory; optionally prints them when explicitly asked.
 * Refused outside local/test stages by `config.ts` — it can never run in a deployed stage.
 */
export class LocalMockEmailTransport implements EmailTransport {
  readonly sent: EmailMessage[] = [];

  constructor(
    private readonly options: {
      printBody?: boolean;
      write?: (line: string) => void;
    } = {},
  ) {}

  async send(message: EmailMessage): Promise<{ messageId?: string }> {
    this.sent.push(message);
    const write = this.options.write ?? ((line: string) => console.log(line));
    write(`[contact:local-mock] captured email subject="${message.subject}" (no email sent)`);
    if (this.options.printBody) {
      write(`[contact:local-mock] reply-to=${message.replyTo}\n${message.text}`);
    }
    return { messageId: `local-mock-${this.sent.length}` };
  }
}
