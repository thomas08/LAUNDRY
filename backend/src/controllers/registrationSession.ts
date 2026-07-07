import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RegistrationSessionModel } from '../models/registrationSession';

const OWNERSHIPS = ['rental', 'customer_owned'];

// POST /v1/sync/session — เว็บสร้างสถานีลงทะเบียน (เลือก context ประเภทผ้า/ownership)
// จำกัดเฉพาะ admin/superadmin ให้ตรงกับกฎลงทะเบียนผ้า (item_receive)
export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    if (role !== 'admin' && role !== 'superadmin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Linen registration requires admin privileges',
        code: 'REGISTER_FORBIDDEN',
      });
      return;
    }

    const { branchId, articleId, articleName, ownership, customerId } = req.body as {
      branchId?: string; articleId?: string; articleName?: string;
      ownership?: string; customerId?: string;
    };

    if (!branchId) {
      res.status(400).json({ error: 'Bad Request', message: 'branchId is required', code: 'BRANCH_ID_REQUIRED' });
      return;
    }
    const own = ownership && OWNERSHIPS.includes(ownership) ? ownership : 'rental';

    const session = await RegistrationSessionModel.create({
      branchId,
      articleId: articleId || null,
      articleName: articleName || null,
      ownership: own,
      customerId: customerId || null,
      createdBy: req.user!.id,
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message || 'Failed to create session', code: 'SESSION_ERROR' });
  }
}

// GET /v1/sync/session/:code — handheld ดึง context ไปใช้ (หรือเว็บเช็คสถานะ)
export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const session = await RegistrationSessionModel.getActive(req.params.code);
    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'Session not found, closed, or expired', code: 'SESSION_NOT_FOUND' });
      return;
    }
    res.status(200).json(session);
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message || 'Failed to fetch session', code: 'SESSION_ERROR' });
  }
}

// GET /v1/sync/session/:code/events?since=ISO — เว็บ poll แท็กที่เข้าสด + จำนวนรวม
export async function getSessionEvents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const code = req.params.code;
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const [scans, count, session] = await Promise.all([
      RegistrationSessionModel.scans(code, since),
      RegistrationSessionModel.count(code),
      RegistrationSessionModel.getActive(code),
    ]);
    res.status(200).json({ events: scans, count, active: !!session });
  } catch (error: any) {
    console.error('Get session events error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message || 'Failed to fetch session events', code: 'SESSION_ERROR' });
  }
}

// POST /v1/sync/session/:code/close — ปิดสถานี
export async function closeSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    await RegistrationSessionModel.close(req.params.code);
    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Close session error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message || 'Failed to close session', code: 'SESSION_ERROR' });
  }
}
