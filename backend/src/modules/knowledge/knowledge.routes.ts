import { Router } from 'express';
import { knowledgeController } from './knowledge.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createArticleSchema, listKnowledgeQuerySchema, updateArticleSchema } from './knowledge.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listKnowledgeQuerySchema), knowledgeController.list);
router.post('/', validate(createArticleSchema), knowledgeController.create);
router.get('/:id', knowledgeController.getById);
router.patch('/:id', validate(updateArticleSchema), knowledgeController.update);
router.post('/:id/publish', knowledgeController.publish);
router.delete('/:id', knowledgeController.delete);

export default router;
