import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { LoginRequest } from '@business-app/shared';

const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  path: '/'
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export class AuthController {
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const registerData = req.body;

      // Validate required fields
      if (!registerData.email || !registerData.password || !registerData.firstName || !registerData.lastName || !registerData.businessName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerData.email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Validate password length
      if (registerData.password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // Validate disclaimer acceptance
      if (!registerData.disclaimerAccepted) {
        res.status(400).json({ error: 'You must accept the terms and disclaimer' });
        return;
      }

      const result = await authService.registerFarmer(registerData);

      // Send refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;

      if (!loginData.email || !loginData.password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.login(loginData);

      // Send refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Don't expose refresh token in JSON response — it's in the httpOnly cookie
      const { refreshToken: _rt, ...responseData } = result;
      res.json(responseData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refresh(req: AuthRequest, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        console.log('[Auth] Refresh attempt with no cookie');
        res.status(401).json({ error: 'No refresh token provided' });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);

      // Update the refresh token cookie with the rotated token
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      res.json({ accessToken: result.accessToken });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
        console.log('[Auth] Refresh rejected:', error.message);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }
      console.error('[Auth] Refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await authService.getCurrentUser(req.user.userId);
      res.json(user);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
