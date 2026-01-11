import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import invitationRoutes from './routes/invitation.routes';
import teamRoutes from './routes/team.routes';
import userRoutes from './routes/user.routes';
import calendarRoutes from './routes/calendar.routes';
import tasksRoutes from './routes/tasks.routes';
import pushNotificationRoutes from './routes/push-notification.routes';
import grainContractRoutes from './routes/grain-contract.routes';
import grainProductionRoutes from './routes/grain-production.routes';
import grainAnalyticsRoutes from './routes/grain-analytics.routes';
import marketPriceRoutes from './routes/market-price.routes';
import breakevenRoutes from './controllers/breakeven.controller';
import retailerAuthRoutes from './routes/retailer-auth.routes';
import bidRequestRoutes from './routes/bid-request.routes';
import retailerBidRoutes from './routes/retailer-bid.routes';
import invoiceRoutes from './routes/invoice.routes';
import grainBinRoutes from './routes/grain-bin.routes';
import scaleTicketRoutes from './routes/scale-ticket.routes';
import { initializeSocket } from './config/socket';
import { GrainPriceJobService } from './services/grain-price-job.service';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN.split(','),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Debug middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Routes - More specific routes first!
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/user', userRoutes);
app.use('/api/retailer', retailerAuthRoutes); // Retailer auth routes MUST come before generic /api routes
app.use('/api', bidRequestRoutes); // Bid request routes before grain routes to avoid middleware conflicts
app.use('/api', retailerBidRoutes);
app.use('/api', calendarRoutes);
app.use('/api', tasksRoutes);
app.use('/api', pushNotificationRoutes);
app.use('/api', grainContractRoutes);
app.use('/api', grainProductionRoutes);
app.use('/api', grainAnalyticsRoutes);
app.use('/api', marketPriceRoutes);
app.use('/api', breakevenRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', grainBinRoutes);
app.use('/api', scaleTicketRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize Socket.io
initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS enabled for: ${CORS_ORIGIN}`);

  // Start background job for market price fetching
  const priceJob = new GrainPriceJobService();
  priceJob.start();
});
