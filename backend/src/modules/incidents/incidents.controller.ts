import { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { incidentsService } from './incidents.service';
import { SlaService } from './sla.service';
import {
  createIncidentSchema,
  updateIncidentSchema,
  listIncidentsQuerySchema,
  createCommentSchema,
} from './incidents.schemas';

const serialize = (req: Request) => ({
  id: req.user!.id,
  roles: req.user!.roles ?? [],
  ip: req.ip,
});

export const incidentsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createIncidentSchema.parse(req.body);
    const { id, ip } = serialize(req);
    const incident = await incidentsService.create(input, id, ip);
    res.status(201).json({ success: true, data: incident });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = listIncidentsQuerySchema.parse(req.query);
    const result = await incidentsService.list(query);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const incident = await incidentsService.getById(req.params.id!);
    res.json({ success: true, data: incident });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = updateIncidentSchema.parse(req.body);
    const { id, roles, ip } = serialize(req);
    const updated = await incidentsService.update(req.params.id!, input, id, roles, ip);
    res.json({ success: true, data: updated });
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const input = createCommentSchema.parse(req.body);
    const { id, ip } = serialize(req);
    const comment = await incidentsService.addComment(req.params.id!, input, id, ip);
    res.status(201).json({ success: true, data: comment });
  }),

  getComments: asyncHandler(async (req: Request, res: Response) => {
    const comments = await incidentsService.getComments(req.params.id!);
    res.json({ success: true, data: comments });
  }),

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const history = await incidentsService.getHistory(req.params.id!);
    res.json({ success: true, data: history });
  }),

  getSlaStatus: asyncHandler(async (req: Request, res: Response) => {
    const incident = await incidentsService.getById(req.params.id!);
    res.json({
      success: true,
      data: {
        responseDeadline: incident.responseDeadline,
        resolutionDeadline: incident.resolutionDeadline,
        slaBreached: incident.slaBreached,
        responseRemaining: SlaService.formatRemaining(incident.responseDeadline),
        resolutionRemaining: SlaService.formatRemaining(incident.resolutionDeadline),
      },
    });
  }),
};
