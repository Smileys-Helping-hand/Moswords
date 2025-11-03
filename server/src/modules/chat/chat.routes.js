import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { fetchMessages, createMessage } from './chat.controller.js';
import { validate } from '../utils/validate.js';

const router = Router();

router.get('/:channelId/messages', authenticate, fetchMessages);

router.post('/:channelId/messages', authenticate, [
  body('content').optional().isString(),
  body('attachments').optional().isArray()
], validate, createMessage);

export default router;
