import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { socketManager } from './lib/socket';

const app = createApp();
const server = createServer(app);

socketManager.initialize(server);

server.listen(env.PORT, () => {
  logger.info(`🚀 NexusOps API listening on http://localhost:${env.PORT}`);
});
