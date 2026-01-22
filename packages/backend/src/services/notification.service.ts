import { prisma } from '../prisma/client';
import { Notification, NotificationType, CreateNotificationRequest } from '@business-app/shared';
import { UserRole } from '@business-app/shared';

export class NotificationService {
  /**
   * Get all notifications for a user
   */
  async getAll(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false })
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to most recent 50
    });

    return notifications.map(n => this.mapNotification(n));
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  /**
   * Create a notification
   */
  async create(data: CreateNotificationRequest): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        businessId: data.businessId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata
      }
    });

    return this.mapNotification(notification);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id, userId }
    });
  }

  /**
   * Notify business owners and managers about a farm plan change
   */
  async notifyFarmPlanChange(
    businessId: string,
    farmId: string,
    farmName: string,
    changeDescription: string,
    changedByUserId: string
  ): Promise<void> {
    // Get owners and managers for this business
    const members = await prisma.businessMember.findMany({
      where: {
        businessId,
        role: { in: [UserRole.OWNER, UserRole.MANAGER] }
      },
      select: { userId: true }
    });

    // Don't notify the user who made the change
    const recipientIds = members
      .map(m => m.userId)
      .filter(id => id !== changedByUserId);

    // Create notifications for each recipient
    for (const userId of recipientIds) {
      await this.create({
        userId,
        businessId,
        type: NotificationType.FARM_PLAN_CHANGE,
        title: 'Farm Plan Changed',
        message: `${farmName}: ${changeDescription}`,
        link: `/farm-plans/${farmId}`,
        metadata: { farmId, farmName }
      });
    }
  }

  /**
   * Notify business owners about a product needing pricing
   */
  async notifyProductNeedsPricing(
    businessId: string,
    productType: 'fertilizer' | 'chemical' | 'seed',
    productName: string,
    addedByUserId: string
  ): Promise<void> {
    // Get owners for this business
    const owners = await prisma.businessMember.findMany({
      where: {
        businessId,
        role: UserRole.OWNER
      },
      select: { userId: true }
    });

    // Don't notify the user who added it (if they're an owner)
    const recipientIds = owners
      .map(m => m.userId)
      .filter(id => id !== addedByUserId);

    // Create notifications for each recipient
    for (const userId of recipientIds) {
      await this.create({
        userId,
        businessId,
        type: NotificationType.PRODUCT_NEEDS_PRICING,
        title: 'New Product Needs Pricing',
        message: `${productName} (${productType}) was added and needs a price set`,
        link: '/breakeven/products',
        metadata: { productType, productName }
      });
    }
  }

  private mapNotification(n: any): Notification {
    return {
      id: n.id,
      userId: n.userId,
      businessId: n.businessId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      link: n.link || undefined,
      isRead: n.isRead,
      metadata: n.metadata as Record<string, any> || undefined,
      createdAt: n.createdAt
    };
  }
}
