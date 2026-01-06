import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';

interface SocketUser {
  userId: string;
  email: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export let io: Server;

export function initializeSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token as string, JWT_ACCESS_SECRET) as { userId: string; email: string };

      // Attach user info to socket
      socket.user = {
        userId: decoded.userId,
        email: decoded.email
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.user?.email})`);

    if (!socket.user) {
      socket.disconnect();
      return;
    }

    try {
      // Get user's business memberships
      const memberships = await prisma.businessMember.findMany({
        where: { userId: socket.user.userId },
        include: { business: true }
      });

      // Join room for each business the user belongs to
      memberships.forEach(membership => {
        const roomName = `business:${membership.businessId}`;
        socket.join(roomName);
        console.log(`📍 User ${socket.user?.email} joined room: ${roomName}`);
      });

      // Notify the user they're connected
      socket.emit('connected', {
        message: 'Successfully connected to real-time updates',
        businesses: memberships.map(m => ({
          id: m.businessId,
          name: m.business.name
        }))
      });

    } catch (error) {
      console.error('Error joining business rooms:', error);
      socket.disconnect();
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id} (User: ${socket.user?.email})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.io initialized with authentication');
  return io;
}

// Utility function to broadcast to a business room
export function broadcastToBusinessRoom(businessId: string, event: string, data: any) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const roomName = `business:${businessId}`;
  io.to(roomName).emit(event, data);
  console.log(`📤 Broadcast to ${roomName}: ${event}`);
}

// Utility function to emit to a specific user (all their connected sockets)
export async function emitToUser(userId: string, event: string, data: any) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  // Find all sockets belonging to this user
  const sockets = await io.fetchSockets();
  const userSockets = sockets.filter((s: any) => s.user?.userId === userId);

  userSockets.forEach(socket => {
    socket.emit(event, data);
  });

  console.log(`📤 Emitted to user ${userId} (${userSockets.length} sockets): ${event}`);
}
