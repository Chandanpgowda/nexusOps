import { problemsRepository } from './problems.repository';
import { CreateProblemInput, ListProblemsQuery, UpdateProblemInput } from './problems.schemas';
import { AppError } from '../../lib/errors';
import { auditService } from '../audit/audit.service';

export class ProblemsService {
  async create(data: CreateProblemInput, ownerId: string) {
    const problem = await problemsRepository.create(data, ownerId);

    await auditService.log({
      actorId: ownerId,
      action: 'PROBLEM_CREATED',
      entityType: 'PROBLEM',
      entityId: problem.id,
      metadata: { title: problem.title, incidentCount: data.incidentIds.length },
    });

    return problem;
  }

  async getById(id: string) {
    const problem = await problemsRepository.findById(id);
    if (!problem) throw new AppError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');
    return problem;
  }

  async list(query: ListProblemsQuery) {
    return problemsRepository.list(query);
  }

  async update(id: string, data: UpdateProblemInput, actorId: string) {
    const existing = await problemsRepository.findById(id);
    if (!existing) throw new AppError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');

    const problem = await problemsRepository.update(id, data);

    await auditService.log({
      actorId,
      action: 'PROBLEM_UPDATED',
      entityType: 'PROBLEM',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return problem;
  }

  async linkIncident(problemId: string, incidentId: string, actorId: string) {
    const problem = await problemsRepository.findById(problemId);
    if (!problem) throw new AppError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');

    return problemsRepository.linkIncident(problemId, incidentId, actorId);
  }

  async unlinkIncident(problemId: string, incidentId: string) {
    return problemsRepository.unlinkIncident(problemId, incidentId);
  }

  async delete(id: string, actorId: string) {
    const existing = await problemsRepository.findById(id);
    if (!existing) throw new AppError(404, 'PROBLEM_NOT_FOUND', 'Problem not found');

    await problemsRepository.delete(id);

    await auditService.log({
      actorId,
      action: 'PROBLEM_DELETED',
      entityType: 'PROBLEM',
      entityId: id,
      metadata: { title: existing.title },
    });
  }
}

export const problemsService = new ProblemsService();
