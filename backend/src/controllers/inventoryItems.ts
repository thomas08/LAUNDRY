import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  InventoryItemModel,
  InventoryItemInput,
  InventoryItemType,
  InventoryUnit,
  StockTransactionType,
  StockAlertLevel,
  StockMovementInput,
  StockMovementError,
} from '../models/inventoryItem';
import { branchScopeFor, canUseBranch } from '../utils/branchScope';

const VALID_TYPES: InventoryItemType[] = [
  'detergent', 'softener', 'bleach', 'stain_remover', 'packaging',
  'plastic_bag', 'hanger', 'tag', 'gas', 'other',
];
const VALID_UNITS: InventoryUnit[] = ['kg', 'liter', 'piece', 'box', 'bottle', 'tank'];
const VALID_TX_TYPES: StockTransactionType[] = ['stock_in', 'stock_out', 'adjustment', 'transfer', 'return'];
const VALID_ALERTS: StockAlertLevel[] = ['ok', 'low', 'critical', 'out_of_stock'];

// GET /v1/inventory-items?type=&alert=&includeInactive=
export async function listInventoryItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const type = req.query.type as InventoryItemType | undefined;
    const alert = req.query.alert as StockAlertLevel | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    if (type && !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid type', code: 'INVALID_TYPE' });
      return;
    }
    if (alert && !VALID_ALERTS.includes(alert)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid alert', code: 'INVALID_ALERT' });
      return;
    }

    const scope = branchScopeFor(req.user!);
    const items = await InventoryItemModel.list(scope, { type, alert, includeInactive });
    res.status(200).json({ inventoryItems: items });
  } catch (error: any) {
    console.error('List inventory items error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVENTORY_ITEMS_ERROR' });
  }
}

// GET /v1/inventory-items/:id
export async function getInventoryItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await InventoryItemModel.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Not Found', message: 'Inventory item not found', code: 'INVENTORY_ITEM_NOT_FOUND' });
      return;
    }
    if (!canUseBranch(req.user!, item.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    res.status(200).json(item);
  } catch (error: any) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVENTORY_ITEM_ERROR' });
  }
}

function validate(body: any, partial: boolean): string | null {
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string') return 'name is required';
  }
  if (!partial || 'branchId' in body) {
    if (!body.branchId || typeof body.branchId !== 'string') return 'branchId is required';
  }
  if ('type' in body && body.type != null && !VALID_TYPES.includes(body.type)) {
    return `type must be one of: ${VALID_TYPES.join(', ')}`;
  }
  if ('unit' in body && body.unit != null && !VALID_UNITS.includes(body.unit)) {
    return `unit must be one of: ${VALID_UNITS.join(', ')}`;
  }
  return null;
}

// POST /v1/inventory-items
export async function createInventoryItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, false);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    if (!canUseBranch(req.user!, req.body.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const input: InventoryItemInput = req.body;
    const item = await InventoryItemModel.create(input);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Create inventory item error:', error);
    if (error.code === '23505') { // unique_violation (code ซ้ำ)
      res.status(409).json({ error: 'Conflict', message: 'code already exists', code: 'DUPLICATE_CODE' });
      return;
    }
    if (error.code === '23503') { // fk_violation (supplier/branch ไม่ถูกต้อง)
      res.status(400).json({ error: 'Bad Request', message: 'supplierId or branchId does not exist', code: 'INVALID_REFERENCE' });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVENTORY_ITEM_CREATE_ERROR' });
  }
}

// helper: โหลด + เช็คสิทธิ์สาขา
async function loadWithAccess(req: AuthRequest, res: Response) {
  const item = await InventoryItemModel.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not Found', message: 'Inventory item not found', code: 'INVENTORY_ITEM_NOT_FOUND' });
    return null;
  }
  if (!canUseBranch(req.user!, item.branchId)) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
    return null;
  }
  return item;
}

// PUT /v1/inventory-items/:id
export async function updateInventoryItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, true);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    if (!(await loadWithAccess(req, res))) return;
    // ถ้าจะย้ายสาขา ต้องเข้าถึงสาขาปลายทางได้ด้วย
    if (req.body.branchId && !canUseBranch(req.user!, req.body.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to target branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const item = await InventoryItemModel.update(req.params.id, req.body);
    res.status(200).json(item);
  } catch (error: any) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVENTORY_ITEM_UPDATE_ERROR' });
  }
}

// DELETE /v1/inventory-items/:id — soft delete
export async function deleteInventoryItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    const item = await InventoryItemModel.deactivate(req.params.id);
    res.status(200).json(item);
  } catch (error: any) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVENTORY_ITEM_DELETE_ERROR' });
  }
}

// GET /v1/inventory-items/:id/transactions
export async function listTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    const transactions = await InventoryItemModel.listTransactions(req.params.id);
    res.status(200).json({ transactions });
  } catch (error: any) {
    console.error('List transactions error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'TRANSACTIONS_ERROR' });
  }
}

// POST /v1/inventory-items/:id/transactions — บันทึกการเคลื่อนไหวสต็อก (atomic)
export async function createMovement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await loadWithAccess(req, res);
    if (!item) return;

    const body = req.body as StockMovementInput;
    if (!body.type || !VALID_TX_TYPES.includes(body.type)) {
      res.status(400).json({ error: 'Bad Request', message: `type must be one of: ${VALID_TX_TYPES.join(', ')}`, code: 'INVALID_TX_TYPE' });
      return;
    }
    if (body.quantity == null || typeof body.quantity !== 'number' || Number.isNaN(body.quantity)) {
      res.status(400).json({ error: 'Bad Request', message: 'quantity must be a number', code: 'INVALID_QUANTITY' });
      return;
    }
    // transfer ยังไม่รองรับใน v1 (ต้องมี item คู่ที่สาขาปลายทาง) -> 400 ชัดเจน
    if (body.type === 'transfer') {
      res.status(400).json({ error: 'Bad Request', message: 'transfer is not supported in v1', code: 'TRANSFER_NOT_SUPPORTED' });
      return;
    }
    if (body.unit && !VALID_UNITS.includes(body.unit)) {
      res.status(400).json({ error: 'Bad Request', message: 'invalid unit', code: 'INVALID_UNIT' });
      return;
    }

    const result = await InventoryItemModel.recordMovement(req.params.id, body, req.user!.id);
    res.status(201).json(result);
  } catch (error: any) {
    // ตรรกะสต็อก (ติดลบ / ชนิดไม่รองรับ / quantity ผิด) -> 400 พร้อม code
    if (error instanceof StockMovementError) {
      const status = error.code === 'ITEM_NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: status === 404 ? 'Not Found' : 'Bad Request', message: error.message, code: error.code });
      return;
    }
    console.error('Create movement error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'MOVEMENT_ERROR' });
  }
}
