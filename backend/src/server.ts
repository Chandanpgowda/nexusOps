import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { socketManager } from './lib/socket';
import { startAiWorker } from './jobs/ai.queue';

const app = createApp();
const server = createServer(app);

socketManager.initialize(server);
if (env.AI_ENABLED) {
  startAiWorker();
} else {
  logger.info('AI disabled — worker not started');
}

server.listen(env.PORT, () => {
  logger.info(`🚀 NexusOps API listening on http://localhost:${env.PORT}`);
});
