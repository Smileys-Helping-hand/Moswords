import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getPlugins, dispatchPluginCommand } from './plugin.registry.js';

const router = Router();

router.get('/', authenticate, (req, res) => {
  res.json({ plugins: getPlugins() });
});

router.post('/execute', authenticate, (req, res) => {
  const { command, payload } = req.body;
  dispatchPluginCommand(command, { io: req.io, payload: { ...payload, userId: req.user.id } });
  res.json({ ok: true });
});

export default router;
