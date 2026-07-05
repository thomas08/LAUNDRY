import { Router } from 'express';
import { listLinenItems } from '../controllers/linenItems';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

// อ่านรายการผ้า (read-only — การเปลี่ยนสถานะทำผ่าน /sync/batch)
router.get('/', requirePermission('read'), listLinenItems);

export default router;
