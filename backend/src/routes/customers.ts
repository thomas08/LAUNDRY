import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers';
import {
  listPriceList,
  upsertPrice,
  updatePrice,
  deletePrice,
} from '../controllers/customerPriceList';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

// ตารางราคาต่อลูกค้า (ราคาซัก/เช่า เฉพาะรายลูกค้า)
router.get('/:id/price-list', requirePermission('read'), listPriceList);
router.post('/:id/price-list', requirePermission('create'), upsertPrice);
router.put('/:id/price-list/:rowId', requirePermission('update'), updatePrice);
router.delete('/:id/price-list/:rowId', requirePermission('delete'), deletePrice);

router.get('/', requirePermission('read'), listCustomers);
router.get('/:id', requirePermission('read'), getCustomer);
router.post('/', requirePermission('create'), createCustomer);
router.put('/:id', requirePermission('update'), updateCustomer);
router.delete('/:id', requirePermission('delete'), deleteCustomer);

export default router;
