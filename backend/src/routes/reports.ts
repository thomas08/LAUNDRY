import { Router } from 'express';
import { getSummary, getSalesByService, getCostByCategory } from '../controllers/reports';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

// รายงานทั้งหมดเป็น read-only aggregate -> ต้องสิทธิ์ view_reports (มีทุก role)
router.get('/summary', requirePermission('view_reports'), getSummary);
router.get('/sales-by-service', requirePermission('view_reports'), getSalesByService);
router.get('/cost-by-category', requirePermission('view_reports'), getCostByCategory);

export default router;
