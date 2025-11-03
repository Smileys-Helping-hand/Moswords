import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { registerSocketHandlers } from './sockets/index.js';

const bootstrap = async () => {
  await connectDatabase();

  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: env.allowedOrigin,
      credentials: true
    }
  });

  const app = createApp(io);
  httpServer.on('request', app);

  registerSocketHandlers(io);

  httpServer.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  logger.error('Failed to start server %s', error.stack || error.message);
  process.exit(1);
});
