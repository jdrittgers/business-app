import { prisma } from '../prisma/client';
import { NotificationService } from './notification.service';
import { NotificationType, UserRole } from '@business-app/shared';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class MaintenanceReminderService {
  private notificationService: NotificationService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Start reminder job (run daily)
  start() {
    if (this.intervalId) {
      console.log('Maintenance reminder job already running');
      return;
    }

    // Run on start (with a 45-second delay to let other services initialize)
    setTimeout(() => this.runJob(), 45000);

    // Run daily (24 hours = 86400000 ms)
    const intervalMs = parseInt(process.env.MAINTENANCE_REMINDER_INTERVAL || '86400000');
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMs);

    console.log(`Maintenance reminder job started - running every ${intervalMs / 1000 / 60 / 60} hours`);
  }

  // Stop the job
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Maintenance reminder job stopped');
    }
  }

  // Execute the job
  private async runJob() {
    try {
      console.log(`[${new Date().toISOString()}] Running maintenance reminder job...`);

      await this.checkUpcomingMaintenance();
      await this.createTasksForOverdueMaintenance();

      console.log(`[${new Date().toISOString()}] Maintenance reminder job completed`);
    } catch (error) {
      console.error('Error running maintenance reminder job:', error);
    }
  }

  // Check for upcoming maintenance and send reminders
  private async checkUpcomingMaintenance() {
    // Find all active maintenance items that need reminders
    const items = await prisma.equipmentMaintenance.findMany({
      where: {
        isActive: true,
        reminderSent: false,
        nextDueDate: { not: null }
      },
      include: {
        equipment: {
          include: {
            business: {
              include: {
                members: {
                  where: { role: { in: [UserRole.OWNER, UserRole.MANAGER] } },
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    const now = new Date();

    for (const item of items) {
      // Check if we're within the reminder window
      const reminderDate = new Date(item.nextDueDate!);
      reminderDate.setDate(reminderDate.getDate() - item.reminderDays);

      if (now >= reminderDate) {
        const memberIds = item.equipment.business.members.map(m => m.userId);
        const dueDate = item.nextDueDate!;
        const isOverdue = now > item.nextDueDate!;

        for (const userId of memberIds) {
          await this.notificationService.create({
            userId,
            businessId: item.equipment.businessId,
            type: NotificationType.MAINTENANCE_DUE,
            title: isOverdue
              ? `Overdue: ${item.title}`
              : `Maintenance Due: ${item.title}`,
            message: `${item.equipment.name} - ${item.title} ${isOverdue ? 'was' : 'is'} due on ${dueDate.toLocaleDateString()}`,
            link: '/loans/maintenance',
            metadata: {
              maintenanceId: item.id,
              equipmentId: item.equipmentId,
              equipmentName: item.equipment.name,
              maintenanceType: item.maintenanceType,
              dueDate: dueDate.toISOString()
            }
          });
        }

        // Mark reminder as sent
        await prisma.equipmentMaintenance.update({
          where: { id: item.id },
          data: { reminderSent: true }
        });

        console.log(`Sent maintenance reminder for ${item.title} on ${item.equipment.name}`);
      }
    }
  }

  // Auto-create tasks for overdue maintenance if autoCreateTask is enabled
  private async createTasksForOverdueMaintenance() {
    const now = new Date();

    // Find maintenance items that are due and don't have a current task
    const items = await prisma.equipmentMaintenance.findMany({
      where: {
        isActive: true,
        autoCreateTask: true,
        currentTaskId: null,
        nextDueDate: { lte: now }
      },
      include: {
        equipment: {
          select: {
            name: true,
            businessId: true,
            business: {
              include: {
                members: {
                  where: { role: UserRole.OWNER },
                  take: 1,
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    for (const item of items) {
      const businessId = item.equipment.businessId;
      const creatorId = item.equipment.business.members[0]?.userId;

      if (!creatorId) {
        console.warn(`No owner found for business ${businessId}, skipping task creation for ${item.title}`);
        continue;
      }

      // Create the task
      const task = await prisma.task.create({
        data: {
          businessId,
          createdBy: creatorId,
          title: `${item.title} - ${item.equipment.name}`,
          description: item.description || `Scheduled maintenance: ${item.title}`,
          status: TaskStatus.OPEN,
          priority: TaskPriority.MEDIUM,
          dueDate: item.nextDueDate,
          isClaimable: true
        }
      });

      // Link the task to the maintenance item
      await prisma.equipmentMaintenance.update({
        where: { id: item.id },
        data: { currentTaskId: task.id }
      });

      console.log(`Created task for maintenance: ${item.title} on ${item.equipment.name}`);
    }
  }
}

export const maintenanceReminderService = new MaintenanceReminderService();
