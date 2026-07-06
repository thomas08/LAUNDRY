import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/suppliers';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('read'), listSuppliers);
router.get('/:id', requirePermission('read'), getSupplier);
router.post('/', requirePermission('create'), createSupplier);
router.put('/:id', requirePermission('update'), updateSupplier);
router.delete('/:id', requirePermission('delete'), deleteSupplier);

export default router;
