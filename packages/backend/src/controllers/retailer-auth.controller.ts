import { Request, Response } from 'express';
import { RetailerService } from '../services/retailer.service';
import { AuthRequest } from '../middleware/auth';

const retailerService = new RetailerService();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const result = await retailerService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Retailer registration error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message === 'Email already registered') {
      res.status(409).json({ error: message });
      return;
    }

    res.status(400).json({ error: message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = await retailerService.login(req.body);
    res.json(result);
  } catch (error) {
    console.error('Retailer login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';

    if (message === 'Invalid credentials') {
      res.status(401).json({ error: message });
      return;
    }

    res.status(400).json({ error: message });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const retailer = await retailerService.getByUserId(req.user.userId);

    if (!retailer) {
      res.status(404).json({ error: 'Retailer profile not found' });
      return;
    }

    res.json({
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role
      },
      retailer
    });
  } catch (error) {
    console.error('Get retailer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch retailer profile' });
  }
}
