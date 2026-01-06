import { PrismaClient, UserRole, TaskStatus } from '@prisma/client';
import { Task, CreateTaskRequest, UpdateTaskRequest, GetTasksQuery } from '@business-app/shared';

const prisma = new PrismaClient();

export class TaskService {
  async getBusinessTasks(
    businessId: string,
    userId: string,
    query: GetTasksQuery
  ): Promise<Task[]> {
    // Verify user is a member of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to view this business tasks');
    }

    // Build query filters
    const whereClause: any = {
      businessId
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.assignedTo === 'me') {
      whereClause.assignedTo = userId;
    } else if (query.assignedTo) {
      whereClause.assignedTo = query.assignedTo;
    }

    if (query.isClaimable !== undefined) {
      whereClause.isClaimable = query.isClaimable === 'true';
      whereClause.status = TaskStatus.OPEN;
      whereClause.assignedTo = null;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return tasks.map(task => ({
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    }));
  }

  async createTask(
    businessId: string,
    userId: string,
    taskData: CreateTaskRequest
  ): Promise<Task> {
    // Verify user is a member of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to create tasks in this business');
    }

    // If assigning to someone, verify they are a member
    if (taskData.assignedTo) {
      const assigneeMembership = await prisma.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId: taskData.assignedTo,
            businessId
          }
        }
      });

      if (!assigneeMembership) {
        throw new Error('Cannot assign task to user not in this business');
      }
    }

    const task = await prisma.task.create({
      data: {
        businessId,
        createdBy: userId,
        assignedTo: taskData.assignedTo,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'MEDIUM',
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        isClaimable: taskData.isClaimable || false
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    };
  }

  async updateTask(
    taskId: string,
    userId: string,
    taskData: UpdateTaskRequest
  ): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { business: true }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check permissions
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: existingTask.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to update this task');
    }

    // Only task creator, assignee, or owner can update
    const isOwner = membership.role === UserRole.OWNER;
    const isCreator = existingTask.createdBy === userId;
    const isAssignee = existingTask.assignedTo === userId;

    if (!isOwner && !isCreator && !isAssignee) {
      throw new Error('Not authorized to update this task');
    }

    const updateData: any = {};
    if (taskData.title !== undefined) updateData.title = taskData.title;
    if (taskData.description !== undefined) updateData.description = taskData.description;
    if (taskData.status !== undefined) {
      updateData.status = taskData.status;
      if (taskData.status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }
    if (taskData.priority !== undefined) updateData.priority = taskData.priority;
    if (taskData.dueDate !== undefined) {
      updateData.dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
    }
    if (taskData.assignedTo !== undefined) {
      // Only owners can reassign tasks
      if (!isOwner && !isCreator) {
        throw new Error('Only owners can assign tasks');
      }
      updateData.assignedTo = taskData.assignedTo;
    }
    if (taskData.isClaimable !== undefined) updateData.isClaimable = taskData.isClaimable;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    };
  }

  async claimTask(taskId: string, userId: string): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (!existingTask.isClaimable) {
      throw new Error('This task is not claimable');
    }

    if (existingTask.assignedTo) {
      throw new Error('Task is already assigned');
    }

    if (existingTask.status !== TaskStatus.OPEN) {
      throw new Error('Only open tasks can be claimed');
    }

    // Verify user is a member of the business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: existingTask.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to claim this task');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo: userId,
        status: TaskStatus.IN_PROGRESS
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    };
  }

  async completeTask(taskId: string, userId: string): Promise<Task> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Verify user is the assignee or owner
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: existingTask.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized');
    }

    const isOwner = membership.role === UserRole.OWNER;
    const isAssignee = existingTask.assignedTo === userId;

    if (!isOwner && !isAssignee) {
      throw new Error('Only assignee or owner can complete this task');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date()
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    };
  }

  async getTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Verify user has access to this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: task.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to view this task');
    }

    return {
      id: task.id,
      businessId: task.businessId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo || undefined,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      completedAt: task.completedAt || undefined,
      isClaimable: task.isClaimable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: task.creator,
      assignee: task.assignee || undefined
    };
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Only creator or owner can delete
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: existingTask.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized');
    }

    const isOwner = membership.role === UserRole.OWNER;
    const isCreator = existingTask.createdBy === userId;

    if (!isOwner && !isCreator) {
      throw new Error('Only creator or owner can delete this task');
    }

    await prisma.task.delete({
      where: { id: taskId }
    });
  }
}
