import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import mediaRoutes from '../modules/media/media.routes.js';
import presenceRoutes from '../modules/presence/presence.routes.js';
import rtcRoutes from '../modules/rtc/rtc.routes.js';
import pluginRoutes from '../modules/plugins/plugin.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/channels', chatRoutes);
router.use('/ai', aiRoutes);
router.use('/files', mediaRoutes);
router.use('/presence', presenceRoutes);
router.use('/rtc', rtcRoutes);
router.use('/plugins', pluginRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
