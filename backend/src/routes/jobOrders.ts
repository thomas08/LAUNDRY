import { Router } from 'express';
import {
  listJobOrders,
  getJobOrder,
  createJobOrder,
  updateJobOrder,
  updateJobOrderStatus,
  cancelJobOrder,
} from '../controllers/jobOrders';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('read'), listJobOrders);
router.get('/:id', requirePermission('read'), getJobOrder);
router.post('/', requirePermission('create'), createJobOrder);
router.put('/:id', requirePermission('update'), updateJobOrder);
router.patch('/:id/status', requirePermission('update'), updateJobOrderStatus);
router.delete('/:id', requirePermission('delete'), cancelJobOrder);

export default router;
