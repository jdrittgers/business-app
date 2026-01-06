import { Router } from 'express';
import { TasksController } from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const tasksController = new TasksController();

// All task routes require authentication
router.use(authenticate);

// Business task routes
router.get('/businesses/:businessId/tasks', (req, res) =>
  tasksController.getBusinessTasks(req, res)
);
router.post('/businesses/:businessId/tasks', (req, res) =>
  tasksController.createTask(req, res)
);

// Individual task routes
router.patch('/tasks/:taskId', (req, res) =>
  tasksController.updateTask(req, res)
);
router.post('/tasks/:taskId/claim', (req, res) =>
  tasksController.claimTask(req, res)
);
router.post('/tasks/:taskId/complete', (req, res) =>
  tasksController.completeTask(req, res)
);
router.delete('/tasks/:taskId', (req, res) =>
  tasksController.deleteTask(req, res)
);

export default router;
