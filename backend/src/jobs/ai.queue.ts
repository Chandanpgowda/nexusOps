import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { socketManager } from '../lib/socket';
import { ollamaProvider } from '../ai/ollama.provider';
import { heuristicAnalyze } from '../ai/heuristics';
import { ragService } from '../modules/ai/rag.service';

export interface AiAnalysisJobData {
  incidentId: string;
}

export const redisConnection = {
  host: new URL(env.REDIS_URL).hostname,
  port: new URL(env.REDIS_URL).port ? Number(new URL(env.REDIS_URL).port) : 6379,
};

let queue: Queue<AiAnalysisJobData> | null = null;

function getQueue(): Queue<AiAnalysisJobData> {
  if (!queue) {
    queue = new Queue<AiAnalysisJobData>('ai-analysis', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return queue;
}

export async function enqueueAiAnalysis(incidentId: string): Promise<void> {
  try {
    await getQueue().add('analyze', { incidentId });
    logger.info({ incidentId }, 'AI analysis job queued');
    socketManager.emitToTicket(incidentId, 'ai:status', { incidentId, status: 'QUEUED' });
  } catch (err) {
    // Redis down must never break incident creation — run heuristics inline instead.
    logger.error({ err }, 'Failed to queue AI analysis — running heuristic fallback');
    await runAnalysis(incidentId);
  }
}

export function startAiWorker(): Worker<AiAnalysisJobData> {
  const worker = new Worker<AiAnalysisJobData>(
    'ai-analysis',
    async (job: Job<AiAnalysisJobData>) => runAnalysis(job.data.incidentId),
    { connection: redisConnection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, incidentId: job?.data.incidentId, err: err.message }, 'AI analysis job failed');
    if (job) {
      socketManager.emitToTicket(job.data.incidentId, 'ai:status', { incidentId: job.data.incidentId, status: 'FAILED' });
    }
  });
  logger.info('AI worker started');
  return worker;
}

async function runAnalysis(incidentId: string): Promise<void> {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return;

  socketManager.emitToTicket(incidentId, 'ai:status', { incidentId, status: 'PROCESSING' });

  let analysis;
  if (await ollamaProvider.isAvailable()) {
    try {
      analysis = await ollamaProvider.analyzeIncident({
        title: incident.title,
        description: incident.description,
      });
    } catch (err) {
      logger.warn({ err }, 'Ollama analysis failed — using heuristics');
      analysis = heuristicAnalyze(incident);
    }
  } else {
    analysis = heuristicAnalyze(incident);
  }

  const existing = await prisma.aiInteraction.findFirst({
    where: { incidentId, type: 'CLASSIFY' },
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    output: analysis as unknown as object,
    model: analysis.model,
  };

  if (existing) {
    await prisma.aiInteraction.update({ where: { id: existing.id }, data });
  } else {
    await prisma.aiInteraction.create({
      data: { incidentId, type: 'CLASSIFY', input: { title: incident.title }, ...data },
    });
  }

  socketManager.emitToTicket(incidentId, 'ai:status', { incidentId, status: 'DONE' });
  socketManager.emitToTicket(incidentId, 'ai:analysis', { incidentId, analysis });
  logger.info({ incidentId, source: analysis.source }, 'AI analysis complete');

  // Generate embedding for duplicate detection (fire-and-forget — best effort)
  try {
    await ragService.storeIncidentEmbedding(incidentId);
  } catch (err) {
    logger.warn({ err, incidentId }, 'Failed to store incident embedding');
  }
}
