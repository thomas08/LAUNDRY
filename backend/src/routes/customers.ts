import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('read'), listCustomers);
router.get('/:id', requirePermission('read'), getCustomer);
router.post('/', requirePermission('create'), createCustomer);
router.put('/:id', requirePermission('update'), updateCustomer);
router.delete('/:id', requirePermission('delete'), deleteCustomer);

export default router;
