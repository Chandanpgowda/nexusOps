import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from './logger';
import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';

interface TokenPayload {
  userId: string;
  roles: string[];
  email: string;
}

export interface PresenceState {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

class SocketManager {
  private io: Server | null = null;
  private presence = new Map<string, PresenceState>();

  initialize(server: HttpServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
        credentials: true,
      },
      pingInterval: 10_000,
      pingTimeout: 30_000,
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Authentication required'));
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
    logger.info('Socket.IO initialized');
    return this.io;
  }

  private async handleConnection(socket: Socket) {
    const user = socket.data.user as TokenPayload;
    const { userId, roles } = user;

    socket.join(`user:${userId}`);
    roles.forEach((role) => socket.join(`role:${role}`));

    const dept = await prisma.userDepartment.findFirst({
      where: { userId, isPrimary: true },
      select: { departmentId: true },
    });
    if (dept) socket.join(`dept:${dept.departmentId}`);

    this.setPresence(userId, 'online');
    socket.broadcast.emit('presence:update', { userId, status: 'online' });

    logger.info({ userId }, 'Socket connected');

    socket.on('ticket:subscribe', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('ticket:unsubscribe', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('presence:away', () => {
      this.setPresence(userId, 'away');
      socket.broadcast.emit('presence:update', { userId, status: 'away' });
    });

    socket.on('presence:online', () => {
      this.setPresence(userId, 'online');
      socket.broadcast.emit('presence:update', { userId, status: 'online' });
    });

    socket.on('disconnect', () => {
      this.setPresence(userId, 'offline');
      socket.broadcast.emit('presence:update', { userId, status: 'offline' });
      logger.info({ userId }, 'Socket disconnected');
    });
  }

  private setPresence(userId: string, status: 'online' | 'away' | 'offline') {
    this.presence.set(userId, { userId, status, lastSeen: Date.now() });
  }

  getPresence(userId: string): PresenceState | undefined {
    return this.presence.get(userId);
  }

  getAllPresence(): PresenceState[] {
    return Array.from(this.presence.values());
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  emitToTicket(ticketId: string, event: string, payload: unknown) {
    this.io?.to(`ticket:${ticketId}`).emit(event, payload);
  }

  emitToRole(role: string, event: string, payload: unknown) {
    this.io?.to(`role:${role}`).emit(event, payload);
  }

  emitToDept(deptId: string, event: string, payload: unknown) {
    this.io?.to(`dept:${deptId}`).emit(event, payload);
  }

  broadcast(event: string, payload: unknown) {
    this.io?.emit(event, payload);
  }
}

export const socketManager = new SocketManager();
