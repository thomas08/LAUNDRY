import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { JobOrderModel, JobOrderInput, JobOrderStatus, ServiceType } from '../models/jobOrder';
import { branchScopeFor, canUseBranch } from '../utils/branchScope';

const VALID_STATUS: JobOrderStatus[] = [
  'pending', 'in_progress', 'washing', 'drying', 'ironing',
  'quality_check', 'completed', 'delivered', 'cancelled',
];
const VALID_SERVICE: ServiceType[] = ['wash_fold', 'dry_clean', 'iron_only', 'wash_iron', 'express'];

// GET /v1/job-orders?status=&serviceType=&customerId=
export async function listJobOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = req.query.status as JobOrderStatus | undefined;
    const serviceType = req.query.serviceType as ServiceType | undefined;
    const customerId = req.query.customerId as string | undefined;

    if (status && !VALID_STATUS.includes(status)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid status', code: 'INVALID_STATUS' });
      return;
    }
    if (serviceType && !VALID_SERVICE.includes(serviceType)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid serviceType', code: 'INVALID_SERVICE_TYPE' });
      return;
    }

    const scope = branchScopeFor(req.user!);
    const orders = await JobOrderModel.list(scope, { status, serviceType, customerId });
    res.status(200).json({ jobOrders: orders });
  } catch (error: any) {
    console.error('List job orders error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDERS_ERROR' });
  }
}

// GET /v1/job-orders/:id
export async function getJobOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const jo = await JobOrderModel.findById(req.params.id);
    if (!jo) {
      res.status(404).json({ error: 'Not Found', message: 'Job order not found', code: 'JOB_ORDER_NOT_FOUND' });
      return;
    }
    if (!canUseBranch(req.user!, jo.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    res.status(200).json(jo);
  } catch (error: any) {
    console.error('Get job order error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDER_ERROR' });
  }
}

// POST /v1/job-orders
export async function createJobOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as JobOrderInput;
    if (!body.customerId || !body.branchId || !body.serviceType) {
      res.status(400).json({ error: 'Bad Request', message: 'customerId, branchId, serviceType are required', code: 'INVALID_INPUT' });
      return;
    }
    if (!VALID_SERVICE.includes(body.serviceType)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid serviceType', code: 'INVALID_SERVICE_TYPE' });
      return;
    }
    if (!canUseBranch(req.user!, body.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const jo = await JobOrderModel.create(body, req.user!.id);
    res.status(201).json(jo);
  } catch (error: any) {
    console.error('Create job order error:', error);
    // FK violation = customer/branch ไม่ถูกต้อง
    if (error.code === '23503') {
      res.status(400).json({ error: 'Bad Request', message: 'customerId or branchId does not exist', code: 'INVALID_REFERENCE' });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDER_CREATE_ERROR' });
  }
}

// helper: โหลด + เช็คสิทธิ์สาขา
async function loadWithAccess(req: AuthRequest, res: Response) {
  const jo = await JobOrderModel.findById(req.params.id);
  if (!jo) {
    res.status(404).json({ error: 'Not Found', message: 'Job order not found', code: 'JOB_ORDER_NOT_FOUND' });
    return null;
  }
  if (!canUseBranch(req.user!, jo.branchId)) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
    return null;
  }
  return jo;
}

// PUT /v1/job-orders/:id
export async function updateJobOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    if (req.body.serviceType && !VALID_SERVICE.includes(req.body.serviceType)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid serviceType', code: 'INVALID_SERVICE_TYPE' });
      return;
    }
    const jo = await JobOrderModel.update(req.params.id, req.body);
    res.status(200).json(jo);
  } catch (error: any) {
    console.error('Update job order error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDER_UPDATE_ERROR' });
  }
}

// PATCH /v1/job-orders/:id/status
export async function updateJobOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: JobOrderStatus };
    if (!status || !VALID_STATUS.includes(status)) {
      res.status(400).json({ error: 'Bad Request', message: `status must be one of: ${VALID_STATUS.join(', ')}`, code: 'INVALID_STATUS' });
      return;
    }
    if (!(await loadWithAccess(req, res))) return;
    const jo = await JobOrderModel.updateStatus(req.params.id, status);
    res.status(200).json(jo);
  } catch (error: any) {
    console.error('Update job order status error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDER_STATUS_ERROR' });
  }
}

// DELETE /v1/job-orders/:id — ยกเลิก (status = cancelled)
export async function cancelJobOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    const jo = await JobOrderModel.updateStatus(req.params.id, 'cancelled');
    res.status(200).json(jo);
  } catch (error: any) {
    console.error('Cancel job order error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'JOB_ORDER_CANCEL_ERROR' });
  }
}
