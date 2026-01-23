import { prisma } from '../prisma/client';
import {
  EquipmentMaintenance,
  MaintenanceHistory,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  CompleteMaintenanceRequest,
  MaintenanceFrequency
} from '@business-app/shared';
import { TaskStatus, TaskPriority } from '@prisma/client';

class MaintenanceService {
  /**
   * Get all maintenance items for a specific equipment
   */
  async getByEquipment(equipmentId: string): Promise<EquipmentMaintenance[]> {
    const items = await prisma.equipmentMaintenance.findMany({
      where: {
        equipmentId,
        isActive: true
      },
      include: {
        equipment: { select: { name: true } },
        history: {
          orderBy: { completedDate: 'desc' },
          take: 5,
          include: {
            completedBy: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { nextDueDate: 'asc' }
    });

    return items.map(this.mapToResponse);
  }

  /**
   * Get all maintenance items for a business
   */
  async getByBusiness(businessId: string): Promise<EquipmentMaintenance[]> {
    const items = await prisma.equipmentMaintenance.findMany({
      where: {
        equipment: { businessId },
        isActive: true
      },
      include: {
        equipment: { select: { name: true } },
        history: {
          orderBy: { completedDate: 'desc' },
          take: 5,
          include: {
            completedBy: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { nextDueDate: 'asc' }
    });

    return items.map(this.mapToResponse);
  }

  /**
   * Get upcoming maintenance items (due within X days)
   */
  async getUpcoming(businessId: string, days: number = 14): Promise<EquipmentMaintenance[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const items = await prisma.equipmentMaintenance.findMany({
      where: {
        equipment: { businessId },
        isActive: true,
        OR: [
          { nextDueDate: { lte: futureDate } },
          { nextDueHours: { not: null } } // Hours-based items always included
        ]
      },
      include: {
        equipment: { select: { name: true } },
        history: {
          orderBy: { completedDate: 'desc' },
          take: 1,
          include: {
            completedBy: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { nextDueDate: 'asc' }
    });

    return items.map(this.mapToResponse);
  }

  /**
   * Get a single maintenance item by ID
   */
  async getById(id: string): Promise<EquipmentMaintenance | null> {
    const item = await prisma.equipmentMaintenance.findUnique({
      where: { id },
      include: {
        equipment: { select: { name: true } },
        history: {
          orderBy: { completedDate: 'desc' },
          include: {
            completedBy: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    return item ? this.mapToResponse(item) : null;
  }

  /**
   * Create a new maintenance schedule
   */
  async create(data: CreateMaintenanceRequest): Promise<EquipmentMaintenance> {
    const item = await prisma.equipmentMaintenance.create({
      data: {
        equipmentId: data.equipmentId,
        title: data.title,
        description: data.description,
        maintenanceType: data.maintenanceType,
        frequency: data.frequency,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
        intervalHours: data.intervalHours,
        nextDueHours: data.nextDueHours,
        estimatedCost: data.estimatedCost,
        reminderDays: data.reminderDays ?? 7,
        autoCreateTask: data.autoCreateTask ?? true
      },
      include: {
        equipment: { select: { name: true } }
      }
    });

    return this.mapToResponse(item);
  }

  /**
   * Update a maintenance schedule
   */
  async update(id: string, data: UpdateMaintenanceRequest): Promise<EquipmentMaintenance> {
    const item = await prisma.equipmentMaintenance.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        maintenanceType: data.maintenanceType,
        frequency: data.frequency,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
        intervalHours: data.intervalHours,
        nextDueHours: data.nextDueHours,
        estimatedCost: data.estimatedCost,
        reminderDays: data.reminderDays,
        autoCreateTask: data.autoCreateTask,
        isActive: data.isActive,
        // Reset reminder flag if date changed
        reminderSent: data.nextDueDate !== undefined ? false : undefined
      },
      include: {
        equipment: { select: { name: true } }
      }
    });

    return this.mapToResponse(item);
  }

  /**
   * Delete a maintenance schedule
   */
  async delete(id: string): Promise<void> {
    await prisma.equipmentMaintenance.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Complete a maintenance item and schedule the next occurrence
   */
  async complete(
    id: string,
    data: CompleteMaintenanceRequest,
    userId: string
  ): Promise<EquipmentMaintenance> {
    const maintenance = await prisma.equipmentMaintenance.findUnique({
      where: { id },
      include: { equipment: { select: { name: true, businessId: true } } }
    });

    if (!maintenance) {
      throw new Error('Maintenance item not found');
    }

    const completedDate = data.completedDate ? new Date(data.completedDate) : new Date();
    const businessId = maintenance.equipment.businessId;

    // Create history record
    await prisma.maintenanceHistory.create({
      data: {
        maintenanceId: id,
        completedDate,
        completedByUserId: userId,
        hoursAtCompletion: data.hoursAtCompletion,
        actualCost: data.actualCost,
        notes: data.notes
      }
    });

    // Calculate next due date/hours based on frequency
    let nextDueDate: Date | null = null;
    let nextDueHours: number | null = maintenance.nextDueHours;

    if (maintenance.frequency !== 'BY_HOURS') {
      nextDueDate = this.calculateNextDueDate(completedDate, maintenance.frequency as MaintenanceFrequency);
    }

    if (maintenance.frequency === 'BY_HOURS' && maintenance.intervalHours && data.hoursAtCompletion) {
      nextDueHours = data.hoursAtCompletion + maintenance.intervalHours;
    }

    // Complete existing task if linked
    if (maintenance.currentTaskId) {
      await prisma.task.update({
        where: { id: maintenance.currentTaskId },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: completedDate
        }
      });
    }

    // Create new task if auto-create enabled
    let newTaskId: string | null = null;
    if (maintenance.autoCreateTask) {
      const task = await prisma.task.create({
        data: {
          businessId,
          createdBy: userId,
          title: `${maintenance.title} - ${maintenance.equipment.name}`,
          description: maintenance.description || `Scheduled maintenance: ${maintenance.title}`,
          status: TaskStatus.OPEN,
          priority: TaskPriority.MEDIUM,
          dueDate: nextDueDate,
          isClaimable: true
        }
      });
      newTaskId = task.id;
    }

    // Update maintenance with new dates and task link
    const updated = await prisma.equipmentMaintenance.update({
      where: { id },
      data: {
        lastCompletedDate: completedDate,
        lastCompletedHours: data.hoursAtCompletion,
        nextDueDate,
        nextDueHours,
        currentTaskId: newTaskId,
        reminderSent: false // Reset for next reminder
      },
      include: {
        equipment: { select: { name: true } },
        history: {
          orderBy: { completedDate: 'desc' },
          take: 5,
          include: {
            completedBy: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get maintenance history
   */
  async getHistory(maintenanceId: string): Promise<MaintenanceHistory[]> {
    const history = await prisma.maintenanceHistory.findMany({
      where: { maintenanceId },
      include: {
        completedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { completedDate: 'desc' }
    });

    return history.map(h => ({
      id: h.id,
      maintenanceId: h.maintenanceId,
      completedDate: h.completedDate,
      completedByUserId: h.completedByUserId || undefined,
      completedByName: h.completedBy ? `${h.completedBy.firstName} ${h.completedBy.lastName}` : undefined,
      hoursAtCompletion: h.hoursAtCompletion || undefined,
      actualCost: h.actualCost ? Number(h.actualCost) : undefined,
      notes: h.notes || undefined,
      createdAt: h.createdAt
    }));
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(fromDate: Date, frequency: MaintenanceFrequency): Date {
    const next = new Date(fromDate);

    switch (frequency) {
      case MaintenanceFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case MaintenanceFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case MaintenanceFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case MaintenanceFrequency.SEMI_ANNUAL:
        next.setMonth(next.getMonth() + 6);
        break;
      case MaintenanceFrequency.ANNUAL:
        next.setFullYear(next.getFullYear() + 1);
        break;
      case MaintenanceFrequency.ONE_TIME:
      default:
        // One-time items don't reschedule
        return next;
    }

    return next;
  }

  /**
   * Map Prisma model to response type
   */
  private mapToResponse(item: any): EquipmentMaintenance {
    return {
      id: item.id,
      equipmentId: item.equipmentId,
      equipmentName: item.equipment?.name,
      title: item.title,
      description: item.description || undefined,
      maintenanceType: item.maintenanceType,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate || undefined,
      lastCompletedDate: item.lastCompletedDate || undefined,
      intervalHours: item.intervalHours || undefined,
      lastCompletedHours: item.lastCompletedHours || undefined,
      nextDueHours: item.nextDueHours || undefined,
      estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : undefined,
      reminderSent: item.reminderSent,
      reminderDays: item.reminderDays,
      autoCreateTask: item.autoCreateTask,
      currentTaskId: item.currentTaskId || undefined,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      history: item.history?.map((h: any) => ({
        id: h.id,
        maintenanceId: h.maintenanceId,
        completedDate: h.completedDate,
        completedByUserId: h.completedByUserId || undefined,
        completedByName: h.completedBy ? `${h.completedBy.firstName} ${h.completedBy.lastName}` : undefined,
        hoursAtCompletion: h.hoursAtCompletion || undefined,
        actualCost: h.actualCost ? Number(h.actualCost) : undefined,
        notes: h.notes || undefined,
        createdAt: h.createdAt
      }))
    };
  }
}

export const maintenanceService = new MaintenanceService();
