import { presenceService } from '../modules/presence/presence.service.js';
import { notificationService } from '../modules/notifications/notification.service.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const { userId } = socket.handshake.auth || {};
    if (userId) {
      socket.join(`user:${userId}`);
      presenceService.setOnline(userId).catch(() => {});
      io.emit('presence:update', { userId, status: 'online' });
    }

    socket.on('channel:join', ({ channelId }) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('typing:start', ({ channelId, user }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, user, typing: true });
    });

    socket.on('typing:stop', ({ channelId, user }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, user, typing: false });
    });

    socket.on('rtc:signal', (payload) => {
      socket.to(payload.target).emit('rtc:signal', payload);
    });

    socket.on('rtc:join', ({ token }) => {
      socket.join(`rtc:${token}`);
    });

    socket.on('disconnect', () => {
      if (userId) {
        io.emit('presence:update', { userId, status: 'offline' });
      }
    });
  });

  notificationService.on('notification', ({ userId, payload }) => {
    io.to(`user:${userId}`).emit('notification', payload);
  });
};
