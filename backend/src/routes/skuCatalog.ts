import { Router } from 'express';
import { getDimensions, listSkus } from '../controllers/skuCatalog';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

// SKU catalog เป็น reference data ระดับองค์กร — read-only (ทุก role ที่มีสิทธิ์ read)
router.get('/dimensions', requirePermission('read'), getDimensions);
router.get('/', requirePermission('read'), listSkus);

export default router;
