import { Router } from 'express';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenses';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
router.use(authMiddleware);

router.get('/', requirePermission('read'), listExpenses);
router.post('/', requirePermission('create'), createExpense);
router.put('/:id', requirePermission('update'), updateExpense);
router.delete('/:id', requirePermission('delete'), deleteExpense);

export default router;
