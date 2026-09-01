import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { Permissions } from '../../config/permissions';
import {
  createUserSchema,
  updateUserSchema,
  setUserRolesSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from './users.schemas';
import { usersController } from './users.controller';

const router = Router();

// All routes here require authentication.
router.use(authenticate);

router.get('/users', requirePermission(Permissions.USER_MANAGE), usersController.list);
router.post('/users', requirePermission(Permissions.USER_MANAGE), validate(createUserSchema), usersController.create);
router.patch('/users/:id', requirePermission(Permissions.USER_MANAGE), validate(updateUserSchema), usersController.update);
router.patch('/users/:id/roles', requirePermission(Permissions.ROLE_MANAGE), validate(setUserRolesSchema), usersController.setRoles);

router.get('/roles', requirePermission(Permissions.ROLE_MANAGE), usersController.roles);

router.get('/departments', usersController.listDepartments);
router.post('/departments', requirePermission(Permissions.DEPARTMENT_MANAGE), validate(createDepartmentSchema), usersController.createDepartment);
router.patch('/departments/:id', requirePermission(Permissions.DEPARTMENT_MANAGE), validate(updateDepartmentSchema), usersController.updateDepartment);

export default router;