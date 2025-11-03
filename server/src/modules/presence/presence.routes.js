import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { presenceService } from './presence.service.js';

const router = Router();

router.post('/status', authenticate, [
  body('status').isIn(['online', 'offline', 'idle', 'dnd'])
], validate, async (req, res) => {
  await presenceService.setStatus(req.user.id, req.body.status);
  req.io.emit('presence:update', { userId: req.user.id, status: req.body.status });
  res.json({ status: req.body.status });
});

export default router;
