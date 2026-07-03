import { Router } from 'express';
import { syncBatch, getReference } from '../controllers/sync';
import { authMiddleware } from '../middleware/auth';
import { requireBranchAccess } from '../middleware/rbac';

const router = Router();

// ทุก endpoint ใน /v1/sync ต้อง login ก่อน (handheld เก็บ JWT ไว้บนเครื่องตอน login ครั้งแรก)
router.use(authMiddleware);

// POST /v1/sync/batch - ส่ง scan events ที่สะสมไว้ตอนออฟไลน์
router.post('/batch', syncBatch);

// GET /v1/sync/reference?branchId=... - ดึงข้อมูลอ้างอิงมา cache
router.get('/reference', requireBranchAccess('branchId'), getReference);

export default router;
