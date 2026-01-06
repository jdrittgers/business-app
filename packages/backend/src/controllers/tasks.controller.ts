import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TaskService } from '../services/task.service';
import { CreateTaskRequest, UpdateTaskRequest, GetTasksQuery } from '@business-app/shared';
import { TaskEvents } from '../sockets/events.emitter';

const taskService = new TaskService();

export class TasksController {
  async getBusinessTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const query: GetTasksQuery = {
        status: req.query.status as any,
        assignedTo: req.query.assignedTo as string,
        isClaimable: req.query.isClaimable as any
      };

      const tasks = await taskService.getBusinessTasks(businessId, req.user.userId, query);
      res.json(tasks);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const taskData: CreateTaskRequest = req.body;

      if (!taskData.title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      const task = await taskService.createTask(businessId, req.user.userId, taskData);

      // Broadcast task creation to all business members
      TaskEvents.taskCreated(businessId, task);

      // Notify assigned user if task was assigned
      if (task.assignedTo) {
        await TaskEvents.taskAssigned(task.assignedTo, task);
      }

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { taskId } = req.params;
      const taskData: UpdateTaskRequest = req.body;

      const task = await taskService.updateTask(taskId, req.user.userId, taskData);

      // Broadcast task update to all business members
      TaskEvents.taskUpdated(task.businessId, task);

      // Notify newly assigned user if assignment changed
      if (taskData.assignedTo && task.assignedTo) {
        await TaskEvents.taskAssigned(task.assignedTo, task);
      }

      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async claimTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { taskId } = req.params;
      const task = await taskService.claimTask(taskId, req.user.userId);

      // Broadcast task claim to all business members
      TaskEvents.taskClaimed(task.businessId, task);

      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Claim task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async completeTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { taskId } = req.params;
      const task = await taskService.completeTask(taskId, req.user.userId);

      // Broadcast task completion to all business members
      TaskEvents.taskCompleted(task.businessId, task);

      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Complete task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { taskId } = req.params;

      // Get task before deletion to broadcast businessId
      const task = await taskService.getTask(taskId, req.user.userId);
      await taskService.deleteTask(taskId, req.user.userId);

      // Broadcast task deletion to all business members
      TaskEvents.taskDeleted(task.businessId, taskId);

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
