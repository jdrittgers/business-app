import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInvitationEmailParams {
  toEmail: string;
  businessName: string;
  invitationCode: string;
  invitationLink: string;
  role: string;
  fromName: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private fromEmail: string;
  private appUrl: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set. Email sending will fail.');
    }
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('Email service not configured. Skipping email send.');
      return;
    }

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html
      });

      console.log(`✅ Email sent to ${params.to}`);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Email service not configured. Please set RESEND_API_KEY.');
    }

    const { toEmail, businessName, invitationCode, invitationLink, role, fromName } = params;

    const html = this.generateInvitationEmailHtml({
      businessName,
      invitationCode,
      invitationLink,
      role,
      fromName
    });

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: toEmail,
        subject: `You've been invited to join ${businessName}`,
        html
      });

      console.log(`✅ Invitation email sent to ${toEmail}`);
    } catch (error: any) {
      console.error('Failed to send invitation email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private generateInvitationEmailHtml(params: {
    businessName: string;
    invitationCode: string;
    invitationLink: string;
    role: string;
    fromName: string;
  }): string {
    const { businessName, invitationCode, invitationLink, role, fromName } = params;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                You've Been Invited!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi there,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                <strong>${fromName}</strong> has invited you to join their team at <strong>${businessName}</strong> as a <strong>${role}</strong>.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                Click the button below to create your account and get started:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 16px 40px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Alternative Method -->
              <p style="margin: 0 0 15px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; color: #374151; word-break: break-all;">
                ${invitationLink}
              </p>

              <p style="margin: 0 0 15px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                You can also use this invitation code:
              </p>

              <p style="margin: 0 0 30px; padding: 16px; background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 6px; text-align: center; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 3px;">
                ${invitationCode}
              </p>

              <!-- Footer Note -->
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #9ca3af;">
                This invitation was sent by ${businessName}. If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Business App. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
