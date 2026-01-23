import { prisma } from '../prisma/client';
import { johnDeereService } from './john-deere.service';
import { NotificationService } from './notification.service';
import { NotificationType, UserRole } from '@business-app/shared';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class JohnDeereSyncService {
  private notificationService: NotificationService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Start sync job (run every 4 hours by default)
  start() {
    if (this.intervalId) {
      console.log('John Deere sync job already running');
      return;
    }

    // Run on start (with a 60-second delay to let other services initialize)
    setTimeout(() => this.runJob(), 60000);

    // Run every 4 hours (14400000 ms)
    const intervalMs = parseInt(process.env.JOHN_DEERE_SYNC_INTERVAL || '14400000');
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMs);

    console.log(`John Deere sync job started - running every ${intervalMs / 1000 / 60 / 60} hours`);
  }

  // Stop the job
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('John Deere sync job stopped');
    }
  }

  // Execute the job
  private async runJob() {
    try {
      console.log(`[${new Date().toISOString()}] Running John Deere sync job...`);

      // Get all active John Deere connections
      const connections = await prisma.johnDeereConnection.findMany({
        where: { isActive: true },
        include: {
          business: {
            select: { id: true, name: true }
          }
        }
      });

      console.log(`Found ${connections.length} active John Deere connections`);

      for (const connection of connections) {
        try {
          console.log(`Syncing John Deere data for business: ${connection.business.name}`);

          // Sync equipment hours
          const result = await johnDeereService.syncAllEquipmentHours(connection.businessId);

          if (result.success) {
            console.log(`Successfully synced ${result.equipmentSynced} equipment for ${connection.business.name}`);
          } else {
            console.warn(`Sync completed with errors for ${connection.business.name}:`, result.errors);
          }

          // Check for maintenance items that are now due based on hours
          await this.checkHoursBasedMaintenance(connection.businessId);

        } catch (error: any) {
          console.error(`Error syncing John Deere for business ${connection.business.name}:`, error.message);

          // Update connection with error
          await prisma.johnDeereConnection.update({
            where: { id: connection.id },
            data: { syncError: error.message }
          });
        }
      }

      console.log(`[${new Date().toISOString()}] John Deere sync job completed`);
    } catch (error) {
      console.error('Error running John Deere sync job:', error);
    }
  }

  // Check for maintenance items due based on equipment hours
  private async checkHoursBasedMaintenance(businessId: string) {
    // Get equipment with current hours and their hours-based maintenance items
    const equipment = await prisma.equipment.findMany({
      where: {
        businessId,
        currentEngineHours: { not: null },
        isActive: true,
        deletedAt: null
      },
      include: {
        maintenance: {
          where: {
            isActive: true,
            frequency: 'BY_HOURS',
            nextDueHours: { not: null }
          }
        }
      }
    });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        members: {
          where: { role: { in: [UserRole.OWNER, UserRole.MANAGER] } },
          select: { userId: true }
        }
      }
    });

    if (!business) return;

    for (const equip of equipment) {
      const currentHours = equip.currentEngineHours!;

      for (const maint of equip.maintenance) {
        const nextDueHours = maint.nextDueHours!;

        // Check if maintenance is due (current hours >= next due hours)
        if (currentHours >= nextDueHours && !maint.reminderSent) {
          // Send notification
          for (const member of business.members) {
            await this.notificationService.create({
              userId: member.userId,
              businessId,
              type: NotificationType.MAINTENANCE_DUE,
              title: `Maintenance Due: ${maint.title}`,
              message: `${equip.name} has reached ${currentHours} hours. ${maint.title} is due at ${nextDueHours} hours.`,
              link: '/loans/maintenance',
              metadata: {
                maintenanceId: maint.id,
                equipmentId: equip.id,
                equipmentName: equip.name,
                currentHours,
                dueHours: nextDueHours
              }
            });
          }

          // Create task if auto-create is enabled and no current task
          if (maint.autoCreateTask && !maint.currentTaskId) {
            const creatorId = business.members[0]?.userId;

            if (creatorId) {
              const task = await prisma.task.create({
                data: {
                  businessId,
                  createdBy: creatorId,
                  title: `${maint.title} - ${equip.name}`,
                  description: `${maint.description || 'Scheduled maintenance'}\n\nCurrent hours: ${currentHours}\nDue at: ${nextDueHours} hours`,
                  status: TaskStatus.OPEN,
                  priority: TaskPriority.HIGH, // High priority since it's due
                  isClaimable: true
                }
              });

              await prisma.equipmentMaintenance.update({
                where: { id: maint.id },
                data: { currentTaskId: task.id }
              });
            }
          }

          // Mark reminder as sent
          await prisma.equipmentMaintenance.update({
            where: { id: maint.id },
            data: { reminderSent: true }
          });

          console.log(`Created maintenance alert for ${maint.title} on ${equip.name} (${currentHours}/${nextDueHours} hours)`);
        }
      }
    }
  }
}

export const johnDeereSyncService = new JohnDeereSyncService();
