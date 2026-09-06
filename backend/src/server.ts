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

// Graceful shutdown
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
