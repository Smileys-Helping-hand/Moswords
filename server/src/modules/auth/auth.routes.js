import { Router } from 'express';
import { body } from 'express-validator';
import { login, register, refresh } from './auth.controller.js';

const router = Router();

router.post('/register', [
  body('email').isEmail(),
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 8 })
], register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], login);

router.post('/refresh', [
  body('refreshToken').notEmpty()
], refresh);

export default router;
