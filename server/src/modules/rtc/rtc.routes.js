import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/token', authenticate, (req, res) => {
  res.json({ token: `rtc-${req.user.id}-${Date.now()}` });
});

export default router;
