import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * DELETE /api/user/account
 * Delete user account
 */
router.delete('/account', (req, res) => userController.deleteAccount(req, res));

export default router;
