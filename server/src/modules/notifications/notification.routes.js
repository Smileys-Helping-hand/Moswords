import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { notificationService } from './notification.service.js';

const router = Router();

router.get('/', authenticate, (req, res) => {
  res.json({ subscribed: true });
});

router.post('/', authenticate, (req, res) => {
  notificationService.sendToUser(req.user.id, req.body);
  res.json({ ok: true });
});

export default router;
