import { query, transaction } from '../config/database';
import { BranchScope } from '../utils/branchScope';

// ============================================================
// ประเภท (mirror lib/types.ts) — วัสดุสิ้นเปลือง + การเคลื่อนไหวสต็อก
// ============================================================
export type InventoryItemType =
  | 'detergent' | 'softener' | 'bleach' | 'stain_remover' | 'packaging'
  | 'plastic_bag' | 'hanger' | 'tag' | 'gas' | 'other';

export type InventoryUnit = 'kg' | 'liter' | 'piece' | 'box' | 'bottle' | 'tank';

export type StockTransactionType =
  | 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'return';

// ระดับการแจ้งเตือน (derive จาก current_stock ตอนอ่าน ไม่มีตาราง StockAlert)
export type StockAlertLevel = 'ok' | 'low' | 'critical' | 'out_of_stock';

export interface InventoryItemRow {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  nameEn: string | null;
  type: InventoryItemType;
  unit: InventoryUnit;
  currentStock: number;
  minimumStock: number;
  maximumStock: number | null;
  reorderPoint: number;
  unitCost: number;
  supplierId: string | null;
  supplierName: string | null;   // จาก LEFT JOIN suppliers
  branchId: string;
  isActive: boolean;
  alertLevel: StockAlertLevel;   // derived (ดู ALERT_EXPR)
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransactionRow {
  id: string;
  inventoryItemId: string;
  type: StockTransactionType;
  quantity: number;
  unit: InventoryUnit;
  unitCost: number;
  totalCost: number;
  referenceType: string | null;
  referenceId: string | null;
  fromBranchId: string | null;
  toBranchId: string | null;
  branchId: string;
  performedBy: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface InventoryItemInput {
  code?: string;                 // ปกติเว้นว่าง -> server ออก INV-#### ให้; ถ้าส่งมาต้อง unique
  name: string;
  nameTh?: string | null;
  nameEn?: string | null;
  type?: InventoryItemType;
  unit?: InventoryUnit;
  currentStock?: number;         // ยอดยกมาตอนสร้างเท่านั้น; หลังจากนั้นเปลี่ยนผ่าน movement เท่านั้น
  minimumStock?: number;
  maximumStock?: number | null;
  reorderPoint?: number;
  unitCost?: number;
  supplierId?: string | null;
  branchId: string;
}

export interface StockMovementInput {
  type: StockTransactionType;
  quantity: number;              // ความหมายต่างกันตามชนิด (ดู applyStockMovement)
  unit?: InventoryUnit;          // default = หน่วยของ item
  unitCost?: number;             // default = unit_cost ของ item
  referenceType?: string | null; // 'job_order' | 'supplier_invoice' | 'manual'
  referenceId?: string | null;
  fromBranchId?: string | null;
  toBranchId?: string | null;
  notes?: string | null;
}

export interface StockListFilters {
  type?: InventoryItemType;
  alert?: StockAlertLevel;       // 'low' | 'critical' | 'out_of_stock' (ไม่รวม 'ok')
  includeInactive?: boolean;
}

// ============================================================
// ตรรกะเลขคณิตสต็อก — PURE, EXPORTED, TESTABLE
//   Tester จะ unit-test ฟังก์ชันนี้ตรงๆ (ไม่แตะ DB)
// ============================================================
export class StockMovementError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'StockMovementError';
    this.code = code;
  }
}

// ปัดทศนิยม 2 ตำแหน่ง (half-up) เหมือน computeTotal ใน jobOrder.ts
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * คำนวณสต็อกใหม่จากชนิดธุรกรรม + จำนวน + สต็อกปัจจุบัน (ตรรกะเดียวจบ)
 *  - stock_in / return : quantity ต้อง > 0 -> current + quantity
 *  - stock_out         : quantity ต้อง > 0 -> current - quantity (ห้ามติดลบ -> STOCK_NEGATIVE)
 *  - adjustment        : quantity เป็น signed delta (≠0) -> current + quantity (ผลลัพธ์ห้ามติดลบ)
 *  - transfer          : ไม่รองรับ v1 -> TRANSFER_NOT_SUPPORTED
 * โยน StockMovementError (มี .code) เมื่อ input ไม่ถูกต้อง
 */
export function applyStockMovement(
  type: StockTransactionType,
  quantity: number,
  currentStock: number
): number {
  const q = Number(quantity);
  const cur = Number(currentStock);
  if (!Number.isFinite(q)) throw new StockMovementError('INVALID_QUANTITY', 'quantity must be a finite number');
  if (!Number.isFinite(cur)) throw new StockMovementError('INVALID_QUANTITY', 'currentStock must be a finite number');

  switch (type) {
    case 'stock_in':
    case 'return': {
      if (q <= 0) throw new StockMovementError('INVALID_QUANTITY', `${type} quantity must be > 0`);
      return round2(cur + q);
    }
    case 'stock_out': {
      if (q <= 0) throw new StockMovementError('INVALID_QUANTITY', 'stock_out quantity must be > 0');
      const next = round2(cur - q);
      if (next < 0) throw new StockMovementError('STOCK_NEGATIVE', `insufficient stock: have ${cur}, tried to remove ${q}`);
      return next;
    }
    case 'adjustment': {
      if (q === 0) throw new StockMovementError('INVALID_QUANTITY', 'adjustment quantity must be non-zero (signed delta)');
      const next = round2(cur + q);
      if (next < 0) throw new StockMovementError('STOCK_NEGATIVE', `adjustment would make stock negative: ${cur} + ${q}`);
      return next;
    }
    case 'transfer':
      throw new StockMovementError('TRANSFER_NOT_SUPPORTED', 'transfer is not supported in v1');
    default:
      throw new StockMovementError('INVALID_TYPE', `unknown transaction type: ${String(type)}`);
  }
}

/** ต้นทุนรวม = round(|unitCost| * |quantity|, 2) — ใช้ค่าสัมบูรณ์เผื่อ adjustment ติดลบ */
export function computeTotalCost(unitCost: number, quantity: number): number {
  return round2(Math.abs(Number(unitCost)) * Math.abs(Number(quantity)));
}

// ============================================================
// SQL fragments
// ============================================================
// derive alertLevel: out_of_stock (<=0) > critical (<=min) > low (<=reorder) > ok
const ALERT_EXPR = `
  CASE
    WHEN ii.current_stock <= 0 THEN 'out_of_stock'
    WHEN ii.current_stock <= ii.minimum_stock THEN 'critical'
    WHEN ii.current_stock <= ii.reorder_point THEN 'low'
    ELSE 'ok'
  END`;

const SELECT_COLS = `
  ii.id, ii.code, ii.name, ii.name_th AS "nameTh", ii.name_en AS "nameEn",
  ii.type, ii.unit, ii.current_stock AS "currentStock",
  ii.minimum_stock AS "minimumStock", ii.maximum_stock AS "maximumStock",
  ii.reorder_point AS "reorderPoint", ii.unit_cost AS "unitCost",
  ii.supplier_id AS "supplierId", s.name AS "supplierName",
  ii.branch_id AS "branchId", ii.is_active AS "isActive",
  ${ALERT_EXPR} AS "alertLevel",
  ii.created_at AS "createdAt", ii.updated_at AS "updatedAt"
`;

const TX_SELECT_COLS = `
  id, inventory_item_id AS "inventoryItemId", type, quantity, unit,
  unit_cost AS "unitCost", total_cost AS "totalCost",
  reference_type AS "referenceType", reference_id AS "referenceId",
  from_branch_id AS "fromBranchId", to_branch_id AS "toBranchId",
  branch_id AS "branchId", performed_by AS "performedBy", notes,
  created_at AS "createdAt"
`;

export class InventoryItemModel {
  static async list(scope: BranchScope, filters: StockListFilters = {}): Promise<InventoryItemRow[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (scope !== 'all') {
      if (scope.length === 0) return [];
      params.push(scope);
      where.push(`ii.branch_id = ANY($${params.length})`);
    }
    if (!filters.includeInactive) where.push('ii.is_active = true');
    if (filters.type) { params.push(filters.type); where.push(`ii.type = $${params.length}`); }
    // กรองตาม alert: ใช้ CASE เดียวกับ ALERT_EXPR (ไม่ใช้ alias เพราะ WHERE อ้าง alias ไม่ได้)
    if (filters.alert && filters.alert !== 'ok') {
      if (filters.alert === 'out_of_stock') where.push('ii.current_stock <= 0');
      else if (filters.alert === 'critical') where.push('ii.current_stock > 0 AND ii.current_stock <= ii.minimum_stock');
      else if (filters.alert === 'low') where.push('ii.current_stock > ii.minimum_stock AND ii.current_stock <= ii.reorder_point');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<InventoryItemRow>(
      `SELECT ${SELECT_COLS}
         FROM inventory_items ii
         LEFT JOIN suppliers s ON ii.supplier_id = s.id
         ${whereSql}
         ORDER BY ii.code`,
      params
    );
  }

  static async findById(id: string): Promise<InventoryItemRow | null> {
    const rows = await query<InventoryItemRow>(
      `SELECT ${SELECT_COLS}
         FROM inventory_items ii
         LEFT JOIN suppliers s ON ii.supplier_id = s.id
        WHERE ii.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  private static async nextCode(): Promise<string> {
    const rows = await query<{ n: string }>(`SELECT nextval('inventory_number_seq') AS n`);
    return `INV-${String(rows[0].n).padStart(4, '0')}`;
  }

  static async create(input: InventoryItemInput): Promise<InventoryItemRow> {
    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const code = input.code || (await InventoryItemModel.nextCode());
    const rows = await query<{ id: string }>(
      `INSERT INTO inventory_items
        (id, code, name, name_th, name_en, type, unit, current_stock,
         minimum_stock, maximum_stock, reorder_point, unit_cost, supplier_id, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        id, code, input.name, input.nameTh ?? null, input.nameEn ?? null,
        input.type ?? 'other', input.unit ?? 'piece', input.currentStock ?? 0,
        input.minimumStock ?? 0, input.maximumStock ?? null, input.reorderPoint ?? 0,
        input.unitCost ?? 0, input.supplierId ?? null, input.branchId,
      ]
    );
    return (await InventoryItemModel.findById(rows[0].id))!;
  }

  static async update(id: string, input: Partial<InventoryItemInput>): Promise<InventoryItemRow | null> {
    // หมายเหตุ: current_stock *ไม่* อยู่ใน map — เปลี่ยนได้ผ่าน movement เท่านั้น
    //           code ก็ไม่ให้แก้ (ระบบออกให้)
    const map: Record<string, string> = {
      name: 'name', nameTh: 'name_th', nameEn: 'name_en', type: 'type', unit: 'unit',
      minimumStock: 'minimum_stock', maximumStock: 'maximum_stock',
      reorderPoint: 'reorder_point', unitCost: 'unit_cost',
      supplierId: 'supplier_id', branchId: 'branch_id',
    };
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(map)) {
      if (key in input) { params.push((input as any)[key]); sets.push(`${col} = $${params.length}`); }
    }
    if (sets.length === 0) return InventoryItemModel.findById(id);

    params.push(id);
    await query(`UPDATE inventory_items SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return InventoryItemModel.findById(id);
  }

  static async deactivate(id: string): Promise<InventoryItemRow | null> {
    const rows = await query<{ id: string }>(
      `UPDATE inventory_items SET is_active = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (rows.length === 0) return null;
    return InventoryItemModel.findById(id);
  }

  static async listTransactions(itemId: string, limit = 200): Promise<StockTransactionRow[]> {
    return query<StockTransactionRow>(
      `SELECT ${TX_SELECT_COLS} FROM stock_transactions
        WHERE inventory_item_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [itemId, limit]
    );
  }

  /**
   * บันทึกการเคลื่อนไหวสต็อก + อัปเดต current_stock แบบ atomic (transaction เดียว)
   *  1. lock แถว item (FOR UPDATE) กัน race
   *  2. คำนวณสต็อกใหม่ด้วย applyStockMovement (โยน error ถ้าติดลบ/ชนิดไม่รองรับ)
   *  3. insert stock_transactions (ledger) + update inventory_items.current_stock
   * โยน StockMovementError('ITEM_NOT_FOUND') ถ้าไม่พบ item ที่ active
   */
  static async recordMovement(
    itemId: string,
    input: StockMovementInput,
    performedBy: string
  ): Promise<{ transaction: StockTransactionRow; item: InventoryItemRow }> {
    const txRow = await transaction(async (client) => {
      const cur = await client.query(
        `SELECT id, unit, unit_cost, branch_id, current_stock
           FROM inventory_items WHERE id = $1 AND is_active = true FOR UPDATE`,
        [itemId]
      );
      if (cur.rows.length === 0) {
        throw new StockMovementError('ITEM_NOT_FOUND', 'inventory item not found or inactive');
      }
      const item = cur.rows[0];

      const newStock = applyStockMovement(input.type, input.quantity, Number(item.current_stock));
      const unit = input.unit ?? item.unit;
      const unitCost = input.unitCost != null ? Number(input.unitCost) : Number(item.unit_cost);
      const totalCost = computeTotalCost(unitCost, input.quantity);
      const txId = `stx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const inserted = await client.query(
        `INSERT INTO stock_transactions
          (id, inventory_item_id, type, quantity, unit, unit_cost, total_cost,
           reference_type, reference_id, from_branch_id, to_branch_id,
           branch_id, performed_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING ${TX_SELECT_COLS}`,
        [
          txId, itemId, input.type, input.quantity, unit, unitCost, totalCost,
          input.referenceType ?? null, input.referenceId ?? null,
          input.fromBranchId ?? null, input.toBranchId ?? null,
          item.branch_id, performedBy, input.notes ?? null,
        ]
      );

      await client.query(
        `UPDATE inventory_items SET current_stock = $1 WHERE id = $2`,
        [newStock, itemId]
      );

      return inserted.rows[0] as StockTransactionRow;
    });

    const item = await InventoryItemModel.findById(itemId);
    return { transaction: txRow, item: item! };
  }
}
