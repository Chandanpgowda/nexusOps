import { socketManager } from '../../lib/socket';
import { logger } from '../../lib/logger';
import { notificationsRepository } from './notifications.repository';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

export class NotificationsService {
  async create(input: CreateNotificationInput) {
    const notification = await notificationsRepository.create(input);
    socketManager.emitToUser(input.userId, 'notification:new', notification);
    const unreadCount = await notificationsRepository.getUnreadCount(input.userId);
    socketManager.emitToUser(input.userId, 'notification:unread_count', { count: unreadCount });
    logger.debug({ userId: input.userId, type: input.type }, 'Notification sent');
    return notification;
  }

  async listForUser(userId: string, page: number, pageSize: number) {
    return notificationsRepository.listForUser(userId, page, pageSize);
  }

  async getUnreadCount(userId: string) {
    return notificationsRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    const result = await notificationsRepository.markAsRead(notificationId, userId);
    const unreadCount = await notificationsRepository.getUnreadCount(userId);
    socketManager.emitToUser(userId, 'notification:unread_count', { count: unreadCount });
    return result;
  }

  async markAllAsRead(userId: string) {
    const result = await notificationsRepository.markAllAsRead(userId);
    socketManager.emitToUser(userId, 'notification:unread_count', { count: 0 });
    return result;
  }
}

export const notificationsService = new NotificationsService();
