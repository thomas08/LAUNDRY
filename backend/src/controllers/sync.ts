import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SyncModel, ScanEventInput } from '../models/sync';

// POST /v1/sync/batch - รับ scan events เป็น batch จาก handheld
export async function syncBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { deviceId, events } = req.body as { deviceId: string; events: ScanEventInput[] };

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'deviceId is required',
        code: 'DEVICE_ID_REQUIRED',
      });
      return;
    }

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'events must be a non-empty array',
        code: 'EVENTS_REQUIRED',
      });
      return;
    }

    // Validate required fields ต่อ event ก่อนประมวลผล
    for (const e of events) {
      if (!e.clientUuid || !e.eventType || !e.tagId || !e.branchId || !e.scannedAt) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Each event requires clientUuid, eventType, tagId, branchId, scannedAt',
          code: 'INVALID_EVENT',
          event: e,
        });
        return;
      }
    }

    // การลงทะเบียนผ้า (item_receive) จำกัดเฉพาะ admin/superadmin —
    // พนักงานหน้างาน (role 'user') ทำได้แค่รับ/ส่งผ้า (item_status_change) เท่านั้น
    const role = req.user!.role;
    if (role !== 'admin' && role !== 'superadmin' && events.some((e) => e.eventType === 'item_receive')) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Linen registration (item_receive) requires admin privileges',
        code: 'REGISTER_FORBIDDEN',
      });
      return;
    }

    const performedBy = req.user!.id;
    const results = await SyncModel.processBatch(deviceId, performedBy, events);

    res.status(200).json({ results });
  } catch (error: any) {
    console.error('Sync batch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to process sync batch',
      code: 'SYNC_ERROR',
    });
  }
}

// GET /v1/sync/reference?branchId=branch-1 - ข้อมูลอ้างอิงให้ cache ไว้ใช้ตอนออฟไลน์
export async function getReference(req: AuthRequest, res: Response): Promise<void> {
  try {
    const branchId = req.query.branchId as string;
    if (!branchId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'branchId query param is required',
        code: 'BRANCH_ID_REQUIRED',
      });
      return;
    }

    const data = await SyncModel.getReferenceData(branchId);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Get reference error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch reference data',
      code: 'REFERENCE_ERROR',
    });
  }
}
