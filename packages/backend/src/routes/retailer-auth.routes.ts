import { Router } from 'express';
import { register, login, getMe } from '../controllers/retailer-auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', (req, res) => {
  console.log('🔵 Register route hit');
  register(req, res);
});

router.post('/login', (req, res) => {
  console.log('🔵 Login route hit');
  login(req, res);
});

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
