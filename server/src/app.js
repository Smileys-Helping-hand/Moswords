import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export const createApp = (io) => {
  const app = express();

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use(cors({ origin: env.allowedOrigin, credentials: true }));
  app.use(helmet());
  app.use(morgan('dev'));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
};
