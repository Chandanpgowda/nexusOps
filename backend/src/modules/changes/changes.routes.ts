import { Router } from 'express';
import { changesController } from './changes.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createChangeSchema, listChangesQuerySchema, updateChangeSchema, approveChangeSchema, transitionChangeSchema } from './changes.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listChangesQuerySchema), changesController.list);
router.post('/', validate(createChangeSchema), changesController.create);
router.get('/:id', changesController.getById);
router.patch('/:id', validate(updateChangeSchema), changesController.update);
router.post('/:id/transition', validate(transitionChangeSchema), changesController.transition);
router.post('/:id/approve', validate(approveChangeSchema), changesController.approve);
router.delete('/:id', changesController.delete);

export default router;
