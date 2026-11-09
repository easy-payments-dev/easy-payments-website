import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { EmailMessage, EmailTransport } from './email';

/**
 * Sends plain-text mail through SES v2. Success means SES ACCEPTED the message; it does not
 * guarantee delivery to the inbox. IAM: ses:SendEmail on the verified identity only.
 */
export class SesEmailTransport implements EmailTransport {
  constructor(private readonly client: SESv2Client) {}

  async send(message: EmailMessage): Promise<{ messageId?: string }> {
    const result = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: message.from,
        Destination: { ToAddresses: [message.to] },
        ReplyToAddresses: [message.replyTo],
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
          },
        },
      }),
    );
    return { messageId: result.MessageId };
  }
}
