import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { incidentsController } from './incidents.controller';
import {
  listIncidentsQuerySchema,
  createIncidentSchema,
  updateIncidentSchema,
  createCommentSchema,
} from './incidents.schemas';

const router = Router();

router.use(authenticate);

// List & create — any authenticated user
router.get(
  '/',
  requirePermission('incident:view_all', 'incident:create'),
  validateQuery(listIncidentsQuerySchema),
  incidentsController.list
);
router.post(
  '/',
  requirePermission('incident:create'),
  validate(createIncidentSchema),
  incidentsController.create
);

// Read one — any authenticated user (authorization checked in service for assignment)
router.get('/:id', incidentsController.getById);

// Update — managers assign/resolve, technicians update
router.patch(
  '/:id',
  requirePermission('incident:update_all', 'incident:assign', 'incident:resolve'),
  validate(updateIncidentSchema),
  incidentsController.update
);

// Comments
router.get('/:id/comments', incidentsController.getComments);
router.post(
  '/:id/comments',
  requirePermission('incident:comment'),
  validate(createCommentSchema),
  incidentsController.addComment
);

// History & SLA
router.get('/:id/history', incidentsController.getHistory);
router.get('/:id/sla', incidentsController.getSlaStatus);

export default router;
