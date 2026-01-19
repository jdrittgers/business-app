import { prisma } from '../prisma/client';
import { PushNotificationService, PushNotificationPayload } from './push-notification.service';
import { EmailService } from './email.service';
import { broadcastToBusinessRoom, emitToUser } from '../config/socket';
import {
  MarketingSignal,
  SignalStrength,
  MarketingSignalType,
  NotificationChannel,
  SignalNotificationPayload,
  CommodityType
} from '@business-app/shared';

interface NotificationResult {
  userId: string;
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

export class SignalNotificationService {
  private pushService: PushNotificationService;
  private emailService: EmailService;

  constructor() {
    this.pushService = new PushNotificationService();
    this.emailService = new EmailService();
  }

  // ===== Main Notification Method =====

  async notifySignal(signal: MarketingSignal): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Get business preferences and members
    const preferences = await prisma.marketingPreferences.findUnique({
      where: { businessId: signal.businessId }
    });

    if (!preferences) {
      console.log(`No marketing preferences found for business ${signal.businessId}`);
      return results;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd)) {
      console.log('Signal notification suppressed due to quiet hours');
      return results;
    }

    // Get business members to notify
    const members = await prisma.businessMember.findMany({
      where: { businessId: signal.businessId },
      include: { user: true }
    });

    const payload = this.buildNotificationPayload(signal);

    for (const member of members) {
      // In-App notification (always sent via socket)
      if (preferences.enableInAppNotifications) {
        const inAppResult = await this.sendInAppNotification(signal, member.userId, payload);
        results.push(inAppResult);
      }

      // Push notification
      if (preferences.enablePushNotifications) {
        const pushResult = await this.sendPushNotification(signal, member.userId, payload);
        results.push(pushResult);
      }

      // Email notification (for strong signals only to avoid spam)
      if (preferences.enableEmailNotifications && this.shouldSendEmail(signal)) {
        const emailResult = await this.sendEmailNotification(signal, member.userId, member.user.email, payload);
        results.push(emailResult);
      }
    }

    return results;
  }

  // ===== Channel-Specific Methods =====

  private async sendInAppNotification(
    signal: MarketingSignal,
    userId: string,
    payload: SignalNotificationPayload
  ): Promise<NotificationResult> {
    try {
      // Emit via socket
      emitToUser(userId, 'marketing:new-signal', {
        signalId: signal.id,
        title: payload.title,
        body: payload.body,
        strength: signal.strength,
        commodityType: signal.commodityType,
        priceAboveBreakeven: signal.priceAboveBreakeven,
        createdAt: new Date()
      });

      // Record notification
      await this.recordNotification(signal.id, userId, NotificationChannel.IN_APP, true);

      return {
        userId,
        channel: NotificationChannel.IN_APP,
        success: true
      };
    } catch (error: any) {
      await this.recordNotification(signal.id, userId, NotificationChannel.IN_APP, false, error.message);
      return {
        userId,
        channel: NotificationChannel.IN_APP,
        success: false,
        error: error.message
      };
    }
  }

  private async sendPushNotification(
    signal: MarketingSignal,
    userId: string,
    payload: SignalNotificationPayload
  ): Promise<NotificationResult> {
    try {
      const pushPayload: PushNotificationPayload = {
        title: payload.title,
        body: payload.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: `marketing-signal-${signal.id}`,
        data: {
          type: 'marketing-signal',
          signalId: signal.id,
          url: `/marketing-ai?signal=${signal.id}`
        },
        requireInteraction: signal.strength === SignalStrength.STRONG_BUY
      };

      const result = await this.pushService.sendToUser(userId, pushPayload);

      const success = result.successful > 0;
      await this.recordNotification(signal.id, userId, NotificationChannel.PUSH, success);

      return {
        userId,
        channel: NotificationChannel.PUSH,
        success
      };
    } catch (error: any) {
      await this.recordNotification(signal.id, userId, NotificationChannel.PUSH, false, error.message);
      return {
        userId,
        channel: NotificationChannel.PUSH,
        success: false,
        error: error.message
      };
    }
  }

  private async sendEmailNotification(
    signal: MarketingSignal,
    userId: string,
    email: string,
    payload: SignalNotificationPayload
  ): Promise<NotificationResult> {
    try {
      const html = this.buildEmailHtml(signal, payload);

      await this.emailService.sendEmail({
        to: email,
        subject: `${this.getStrengthEmoji(signal.strength)} ${payload.title}`,
        html
      });

      await this.recordNotification(signal.id, userId, NotificationChannel.EMAIL, true);

      return {
        userId,
        channel: NotificationChannel.EMAIL,
        success: true
      };
    } catch (error: any) {
      await this.recordNotification(signal.id, userId, NotificationChannel.EMAIL, false, error.message);
      return {
        userId,
        channel: NotificationChannel.EMAIL,
        success: false,
        error: error.message
      };
    }
  }

  // ===== Batch Notifications =====

  async notifyMultipleSignals(signals: MarketingSignal[]): Promise<void> {
    for (const signal of signals) {
      try {
        await this.notifySignal(signal);
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to notify signal ${signal.id}:`, error);
      }
    }
  }

  // ===== Daily Digest =====

  async sendDailyDigest(businessId: string): Promise<void> {
    // Get yesterday's signals
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const signals = await prisma.marketingSignal.findMany({
      where: {
        businessId,
        createdAt: {
          gte: yesterday,
          lt: today
        }
      },
      orderBy: { strength: 'asc' } // STRONG_BUY first
    });

    if (signals.length === 0) {
      return;
    }

    const preferences = await prisma.marketingPreferences.findUnique({
      where: { businessId }
    });

    if (!preferences || !preferences.enableEmailNotifications) {
      return;
    }

    const members = await prisma.businessMember.findMany({
      where: { businessId },
      include: { user: true }
    });

    for (const member of members) {
      const html = this.buildDigestEmailHtml(signals as unknown as MarketingSignal[]);

      await this.emailService.sendEmail({
        to: member.user.email,
        subject: `Daily Marketing Signals Summary - ${signals.length} signal${signals.length > 1 ? 's' : ''}`,
        html
      });
    }
  }

  // ===== Helper Methods =====

  private buildNotificationPayload(signal: MarketingSignal): SignalNotificationPayload {
    const strengthLabels: Record<SignalStrength, string> = {
      STRONG_BUY: 'Strong Opportunity',
      BUY: 'Opportunity',
      HOLD: 'Watch',
      SELL: 'Caution',
      STRONG_SELL: 'Warning'
    };

    const signalTypeLabels: Record<MarketingSignalType, string> = {
      CASH_SALE: 'Cash Sale',
      BASIS_CONTRACT: 'Basis Contract',
      HTA_RECOMMENDATION: 'HTA',
      ACCUMULATOR_STRATEGY: 'Accumulator',
      ACCUMULATOR_INQUIRY: 'Check Accumulator',
      PUT_OPTION: 'Put Option',
      CALL_OPTION: 'Call Option',
      COLLAR_STRATEGY: 'Collar'
    };

    return {
      signalId: signal.id,
      title: `${strengthLabels[signal.strength]}: ${signal.commodityType} ${signalTypeLabels[signal.signalType]}`,
      body: signal.summary,
      strength: signal.strength,
      commodityType: signal.commodityType,
      priceAboveBreakeven: signal.priceAboveBreakeven,
      url: `/marketing-ai?signal=${signal.id}`
    };
  }

  private buildEmailHtml(signal: MarketingSignal, payload: SignalNotificationPayload): string {
    const strengthColors: Record<SignalStrength, string> = {
      STRONG_BUY: '#059669', // green
      BUY: '#10b981',
      HOLD: '#f59e0b', // yellow
      SELL: '#f97316', // orange
      STRONG_SELL: '#ef4444' // red
    };

    const color = strengthColors[signal.strength];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: ${color}; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${payload.title}</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">${signal.summary}</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #111827;">Price Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Current Price:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${signal.currentPrice.toFixed(2)}/bu</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Break-Even:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${signal.breakEvenPrice.toFixed(2)}/bu</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Profit Margin:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${signal.priceAboveBreakeven >= 0 ? '#059669' : '#ef4444'};">
              $${signal.priceAboveBreakeven.toFixed(2)}/bu (${(signal.percentAboveBreakeven * 100).toFixed(1)}%)
            </td>
          </tr>
        </table>
      </div>

      ${signal.rationale ? `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #111827;">Why This Signal?</h3>
        <p style="color: #4b5563; margin: 0;">${signal.rationale}</p>
      </div>
      ` : ''}

      ${signal.recommendedAction ? `
      <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #065f46;">Recommended Action</h3>
        <p style="color: #047857; margin: 0;">${signal.recommendedAction}</p>
        ${signal.recommendedBushels ? `<p style="color: #047857; margin: 8px 0 0 0; font-weight: 600;">${signal.recommendedBushels.toLocaleString()} bushels</p>` : ''}
      </div>
      ` : ''}

      <a href="${process.env.FRONTEND_URL || 'https://app.yourdomain.com'}/marketing-ai?signal=${signal.id}"
         style="display: block; background: ${color}; color: white; text-decoration: none; padding: 16px; text-align: center; border-radius: 8px; font-weight: 600;">
        View Full Details
      </a>
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">This is an automated marketing signal from your Business App.</p>
      <p style="margin: 8px 0 0 0;">Manage your notification preferences in Settings.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private buildDigestEmailHtml(signals: MarketingSignal[]): string {
    const signalRows = signals.map(signal => {
      const emoji = this.getStrengthEmoji(signal.strength);
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emoji} ${signal.commodityType}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${signal.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${signal.priceAboveBreakeven.toFixed(2)}/bu</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #1f2937; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0;">Daily Marketing Signals</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.8;">${signals.length} signal${signals.length > 1 ? 's' : ''} generated</p>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left;">Commodity</th>
            <th style="padding: 12px; text-align: left;">Signal</th>
            <th style="padding: 12px; text-align: right;">Margin</th>
          </tr>
        </thead>
        <tbody>
          ${signalRows}
        </tbody>
      </table>
      <a href="${process.env.FRONTEND_URL || 'https://app.yourdomain.com'}/marketing-ai"
         style="display: block; background: #3b82f6; color: white; text-decoration: none; padding: 16px; text-align: center; border-radius: 8px; font-weight: 600; margin-top: 24px;">
        View All Signals
      </a>
    </div>
  </div>
</body>
</html>`;
  }

  private getStrengthEmoji(strength: SignalStrength): string {
    const emojis: Record<SignalStrength, string> = {
      STRONG_BUY: '🟢',
      BUY: '🔵',
      HOLD: '🟡',
      SELL: '🟠',
      STRONG_SELL: '🔴'
    };
    return emojis[strength];
  }

  private shouldSendEmail(signal: MarketingSignal): boolean {
    // Only send emails for actionable signals
    return signal.strength === SignalStrength.STRONG_BUY ||
           signal.strength === SignalStrength.BUY;
  }

  private isQuietHours(start: string | null, end: string | null): boolean {
    if (!start || !end) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Handle overnight quiet hours (e.g., 22:00 - 06:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  private async recordNotification(
    signalId: string,
    userId: string,
    channel: NotificationChannel,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.signalNotification.upsert({
        where: {
          signalId_userId_channel: { signalId, userId, channel }
        },
        update: {
          sentAt: success ? new Date() : undefined,
          failedAt: success ? undefined : new Date(),
          errorMessage
        },
        create: {
          signalId,
          userId,
          channel,
          sentAt: success ? new Date() : undefined,
          failedAt: success ? undefined : new Date(),
          errorMessage
        }
      });
    } catch (error) {
      console.error('Failed to record notification:', error);
    }
  }
}
