import { Router } from 'express';
import { assetsController } from './assets.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createAssetSchema, listAssetsQuerySchema, updateAssetSchema, assignAssetSchema } from './assets.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listAssetsQuerySchema), assetsController.list);
router.post('/', validate(createAssetSchema), assetsController.create);
router.get('/:id', assetsController.getById);
router.patch('/:id', validate(updateAssetSchema), assetsController.update);
router.delete('/:id', assetsController.delete);
router.post('/:id/assign', validate(assignAssetSchema), assetsController.assign);
router.get('/:id/history', assetsController.getHistory);

export default router;
