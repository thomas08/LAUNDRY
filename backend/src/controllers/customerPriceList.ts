import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CustomerModel } from '../models/customer';
import {
  CustomerPriceListModel,
  PriceServiceType,
} from '../models/customerPriceList';
import { canUseBranch } from '../utils/branchScope';

const VALID_SERVICE_TYPES: PriceServiceType[] = ['wash', 'rental'];

// ทุก endpoint ของตารางราคาผูกกับลูกค้า จึงต้องเช็คสิทธิ์สาขาของลูกค้าก่อนเสมอ
async function guardCustomer(req: AuthRequest, res: Response): Promise<boolean> {
  const customer = await CustomerModel.findById(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Not Found', message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
    return false;
  }
  if (!canUseBranch(req.user!, customer.branchId)) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
    return false;
  }
  return true;
}

// แถวราคาต้องเป็นของลูกค้าใน path เท่านั้น กัน id ข้ามลูกค้า
async function guardRow(req: AuthRequest, res: Response) {
  const row = await CustomerPriceListModel.findById(req.params.rowId);
  if (!row || row.customerId !== req.params.id) {
    res.status(404).json({ error: 'Not Found', message: 'Price list entry not found', code: 'PRICE_NOT_FOUND' });
    return null;
  }
  return row;
}

function parsePrice(value: any): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// GET /v1/customers/:id/price-list?serviceType=wash|rental&includeInactive=true
export async function listPriceList(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await guardCustomer(req, res))) return;

    const serviceType = req.query.serviceType as PriceServiceType | undefined;
    if (serviceType && !VALID_SERVICE_TYPES.includes(serviceType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `serviceType must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
        code: 'INVALID_INPUT',
      });
      return;
    }
    const prices = await CustomerPriceListModel.list(req.params.id, {
      serviceType,
      includeInactive: req.query.includeInactive === 'true',
    });
    res.status(200).json({ prices });
  } catch (error: any) {
    console.error('List price list error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'PRICE_LIST_ERROR' });
  }
}

// POST /v1/customers/:id/price-list — เพิ่ม/ทับราคาของ SKU หนึ่งรายการ
export async function upsertPrice(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await guardCustomer(req, res))) return;

    const { sku, serviceType } = req.body || {};
    if (!sku || typeof sku !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'sku is required', code: 'INVALID_INPUT' });
      return;
    }
    if (serviceType != null && !VALID_SERVICE_TYPES.includes(serviceType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `serviceType must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
        code: 'INVALID_INPUT',
      });
      return;
    }
    const unitPrice = parsePrice(req.body?.unitPrice);
    if (unitPrice === null) {
      res.status(400).json({ error: 'Bad Request', message: 'unitPrice must be a number >= 0', code: 'INVALID_INPUT' });
      return;
    }

    const row = await CustomerPriceListModel.upsert(req.params.id, { sku, serviceType, unitPrice });
    if (!row) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Unknown SKU: ${sku}`,
        code: 'SKU_NOT_FOUND',
      });
      return;
    }
    res.status(201).json(row);
  } catch (error: any) {
    console.error('Upsert price error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'PRICE_UPSERT_ERROR' });
  }
}

// PUT /v1/customers/:id/price-list/:rowId — แก้เฉพาะราคา
export async function updatePrice(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await guardCustomer(req, res))) return;
    if (!(await guardRow(req, res))) return;

    const unitPrice = parsePrice(req.body?.unitPrice);
    if (unitPrice === null) {
      res.status(400).json({ error: 'Bad Request', message: 'unitPrice must be a number >= 0', code: 'INVALID_INPUT' });
      return;
    }
    const row = await CustomerPriceListModel.updatePrice(req.params.rowId, unitPrice);
    res.status(200).json(row);
  } catch (error: any) {
    console.error('Update price error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'PRICE_UPDATE_ERROR' });
  }
}

// DELETE /v1/customers/:id/price-list/:rowId — soft delete
export async function deletePrice(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await guardCustomer(req, res))) return;
    if (!(await guardRow(req, res))) return;

    const row = await CustomerPriceListModel.deactivate(req.params.rowId);
    res.status(200).json(row);
  } catch (error: any) {
    console.error('Delete price error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'PRICE_DELETE_ERROR' });
  }
}
