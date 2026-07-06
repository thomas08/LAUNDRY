import { Router } from 'express';
import {
  listInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  listTransactions,
  createMovement,
} from '../controllers/inventoryItems';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

// ทะเบียนวัสดุ (master CRUD)
router.get('/', requirePermission('read'), listInventoryItems);
router.get('/:id', requirePermission('read'), getInventoryItem);
router.post('/', requirePermission('create'), createInventoryItem);
router.put('/:id', requirePermission('update'), updateInventoryItem);
router.delete('/:id', requirePermission('delete'), deleteInventoryItem);

// การเคลื่อนไหวสต็อก (ledger)
//   POST = 'create' (ไม่ใช่ 'update') เพื่อให้ role 'user' บันทึกงานประจำวันได้
//   และเพราะมันเป็นการ insert แถว transaction ใหม่ (ดูสเปกข้อ 6)
router.get('/:id/transactions', requirePermission('read'), listTransactions);
router.post('/:id/transactions', requirePermission('create'), createMovement);

export default router;
