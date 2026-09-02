import { Router } from 'express';
import { problemsController } from './problems.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createProblemSchema, listProblemsQuerySchema, updateProblemSchema, linkIncidentSchema } from './problems.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listProblemsQuerySchema), problemsController.list);
router.post('/', validate(createProblemSchema), problemsController.create);
router.get('/:id', problemsController.getById);
router.patch('/:id', validate(updateProblemSchema), problemsController.update);
router.post('/:id/incidents', validate(linkIncidentSchema), problemsController.linkIncident);
router.delete('/:id/incidents', validate(linkIncidentSchema), problemsController.unlinkIncident);
router.delete('/:id', problemsController.delete);

export default router;
