import EventEmitter from 'events';

class NotificationService extends EventEmitter {
  sendToUser(userId, payload) {
    this.emit('notification', { userId, payload });
  }
}

export const notificationService = new NotificationService();
