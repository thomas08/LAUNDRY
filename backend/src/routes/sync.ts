import { Router } from 'express';
import { syncBatch, getReference } from '../controllers/sync';
import { createSession, getSession, getSessionEvents, closeSession } from '../controllers/registrationSession';
import { authMiddleware } from '../middleware/auth';
import { requireBranchAccess } from '../middleware/rbac';

const router = Router();

// ทุก endpoint ใน /v1/sync ต้อง login ก่อน (handheld เก็บ JWT ไว้บนเครื่องตอน login ครั้งแรก)
router.use(authMiddleware);

// POST /v1/sync/batch - ส่ง scan events ที่สะสมไว้ตอนออฟไลน์
router.post('/batch', syncBatch);

// GET /v1/sync/reference?branchId=... - ดึงข้อมูลอ้างอิงมา cache
router.get('/reference', requireBranchAccess('branchId'), getReference);

// สถานีลงทะเบียนที่เว็บคุม + C72 ลิงก์เข้า (ดู migration 011)
router.post('/session', createSession);                 // เว็บสร้างสถานี (admin/superadmin)
router.get('/session/:code', getSession);               // handheld ดึง context
router.get('/session/:code/events', getSessionEvents);  // เว็บ poll แท็กที่เข้าสด
router.post('/session/:code/close', closeSession);       // ปิดสถานี

export default router;
