import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';

const TOKEN_EXPIRY = '1h';
const REFRESH_EXPIRY = '7d';

const createTokenPair = (userId) => ({
  accessToken: jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: TOKEN_EXPIRY }),
  refreshToken: jwt.sign({ sub: userId, type: 'refresh' }, env.jwtSecret, { expiresIn: REFRESH_EXPIRY })
});

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, username, password: hashed });
  const tokens = createTokenPair(user.id);

  const safeUser = user.toObject();
  delete safeUser.password;
  safeUser.id = user.id;

  return res.status(201).json({ user: safeUser, ...tokens });
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const tokens = createTokenPair(user.id);
  const safeUser = user.toObject();
  delete safeUser.password;
  safeUser.id = user.id;
  return res.status(200).json({ user: safeUser, ...tokens });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken required' });
  }

  try {
    const payload = jwt.verify(refreshToken, env.jwtSecret);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const tokens = createTokenPair(payload.sub);
    return res.status(200).json(tokens);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
};
