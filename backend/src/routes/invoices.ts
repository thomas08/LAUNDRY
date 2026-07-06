import { Router } from 'express';
import {
  listInvoices, getInvoice, createInvoice, updateInvoice,
  recordPayment, updateInvoiceStatus, cancelInvoice,
} from '../controllers/invoices';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
router.use(authMiddleware);

router.get('/', requirePermission('read'), listInvoices);
router.get('/:id', requirePermission('read'), getInvoice);
router.post('/', requirePermission('create'), createInvoice);
router.put('/:id', requirePermission('update'), updateInvoice);
router.patch('/:id/payment', requirePermission('update'), recordPayment);
router.patch('/:id/status', requirePermission('update'), updateInvoiceStatus);
router.delete('/:id', requirePermission('delete'), cancelInvoice);

export default router;
