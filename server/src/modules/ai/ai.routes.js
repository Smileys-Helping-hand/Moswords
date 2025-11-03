import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { summarizeConversation, smartReply, moderateMessage } from './ai.controller.js';
import { validate } from '../utils/validate.js';

const router = Router();

router.post('/summarize', authenticate, [
  body('messages').isArray()
], validate, summarizeConversation);

router.post('/smart-reply', authenticate, [
  body('context').isString()
], validate, smartReply);

router.post('/moderate', authenticate, [
  body('content').isString()
], validate, moderateMessage);

export default router;
