import { createClient } from 'redis';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

class PresenceService {
  constructor() {
    this.client = createClient({ url: env.redisUrl });
    this.client.on('error', (err) => logger.error('Redis error: %s', err.message));
    this.client.connect().catch((err) => logger.error('Redis connect error %s', err.message));
  }

  async setOnline(userId) {
    await this.client.hSet('presence', userId, JSON.stringify({ status: 'online', updatedAt: new Date().toISOString() }));
  }

  async setStatus(userId, status) {
    await this.client.hSet('presence', userId, JSON.stringify({ status, updatedAt: new Date().toISOString() }));
  }

  async getStatuses(userIds) {
    const values = await this.client.hmGet('presence', userIds);
    return values.map((value) => (value ? JSON.parse(value) : { status: 'offline' }));
  }
}

export const presenceService = new PresenceService();
