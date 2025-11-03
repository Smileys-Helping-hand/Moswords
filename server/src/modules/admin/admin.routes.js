import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { Server } from '../../models/Server.js';
import { Message } from '../../models/Message.js';
import { User } from '../../models/User.js';

const router = Router();

router.get('/metrics', authenticate, async (req, res) => {
  const [serverCount, messageCount, activeUsers] = await Promise.all([
    Server.countDocuments(),
    Message.countDocuments(),
    User.countDocuments({ status: { $in: ['online', 'idle'] } })
  ]);

  res.json({
    serverCount,
    messageCount,
    activeUsers
  });
});

export default router;
