import { query } from '../config/database';
import { BranchScope } from '../utils/branchScope';

export type JobOrderStatus =
  | 'pending' | 'in_progress' | 'washing' | 'drying' | 'ironing'
  | 'quality_check' | 'completed' | 'delivered' | 'cancelled';

export type ServiceType =
  | 'wash_fold' | 'dry_clean' | 'iron_only' | 'wash_iron' | 'express';

export interface JobOrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  branchId: string;
  serviceType: ServiceType;
  status: JobOrderStatus;
  weight: number;
  itemCount: number;
  receivedAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
  deliveredAt: Date | null;
  servicePrice: number;
  additionalCharges: number;
  discount: number;
  totalPrice: number;
  assignedTo: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobOrderInput {
  customerId: string;
  branchId: string;
  serviceType: ServiceType;
  weight?: number;
  itemCount?: number;
  receivedAt?: string;
  dueDate?: string | null;
  servicePrice?: number;
  additionalCharges?: number;
  discount?: number;
  assignedTo?: string | null;
  notes?: string | null;
}

const SELECT_COLS = `
  jo.id, jo.order_number AS "orderNumber", jo.customer_id AS "customerId",
  c.name AS "customerName", jo.branch_id AS "branchId",
  jo.service_type AS "serviceType", jo.status,
  jo.weight, jo.item_count AS "itemCount",
  jo.received_at AS "receivedAt", jo.due_date AS "dueDate",
  jo.completed_at AS "completedAt", jo.delivered_at AS "deliveredAt",
  jo.service_price AS "servicePrice", jo.additional_charges AS "additionalCharges",
  jo.discount, jo.total_price AS "totalPrice",
  jo.assigned_to AS "assignedTo", jo.created_by AS "createdBy", jo.notes,
  jo.created_at AS "createdAt", jo.updated_at AS "updatedAt"
`;

// total = ราคาต่อหน่วย × น้ำหนัก + ค่าใช้จ่ายเพิ่ม − ส่วนลด (คำนวณฝั่ง server เสมอ)
// NOTE: pg คืนค่า NUMERIC มาเป็น string ตอนอ่าน existing row -> ต้อง Number() ทุกตัว
// ไม่งั้น `1950 + "0.00"` จะกลายเป็น string concat ("19500.00")
function computeTotal(servicePrice: number, weight: number, add: number, discount: number): number {
  const t = Number(servicePrice) * Number(weight) + Number(add) - Number(discount);
  return Math.round(Math.max(0, t) * 100) / 100;
}

export class JobOrderModel {
  static async list(
    scope: BranchScope,
    filters: { status?: JobOrderStatus; serviceType?: ServiceType; customerId?: string } = {}
  ): Promise<JobOrderRow[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (scope !== 'all') {
      if (scope.length === 0) return [];
      params.push(scope);
      where.push(`jo.branch_id = ANY($${params.length})`);
    }
    if (filters.status) { params.push(filters.status); where.push(`jo.status = $${params.length}`); }
    if (filters.serviceType) { params.push(filters.serviceType); where.push(`jo.service_type = $${params.length}`); }
    if (filters.customerId) { params.push(filters.customerId); where.push(`jo.customer_id = $${params.length}`); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<JobOrderRow>(
      `SELECT ${SELECT_COLS}
         FROM job_orders jo
         LEFT JOIN customers c ON jo.customer_id = c.id
         ${whereSql}
         ORDER BY jo.received_at DESC`,
      params
    );
  }

  static async findById(id: string): Promise<JobOrderRow | null> {
    const rows = await query<JobOrderRow>(
      `SELECT ${SELECT_COLS} FROM job_orders jo
         LEFT JOIN customers c ON jo.customer_id = c.id WHERE jo.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  private static async nextOrderNumber(): Promise<string> {
    const rows = await query<{ n: string }>(`SELECT nextval('job_order_number_seq') AS n`);
    const seq = String(rows[0].n).padStart(4, '0');
    return `JO-${new Date().getFullYear()}-${seq}`;
  }

  static async create(input: JobOrderInput, createdBy: string): Promise<JobOrderRow> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const orderNumber = await JobOrderModel.nextOrderNumber();
    const weight = input.weight ?? 0;
    const servicePrice = input.servicePrice ?? 0;
    const add = input.additionalCharges ?? 0;
    const discount = input.discount ?? 0;
    const total = computeTotal(servicePrice, weight, add, discount);

    const rows = await query<JobOrderRow>(
      `INSERT INTO job_orders
        (id, order_number, customer_id, branch_id, service_type, status,
         weight, item_count, received_at, due_date, service_price,
         additional_charges, discount, total_price, assigned_to, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,
               COALESCE($8, now()),$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        id, orderNumber, input.customerId, input.branchId, input.serviceType,
        weight, input.itemCount ?? 0, input.receivedAt ?? null, input.dueDate ?? null,
        servicePrice, add, discount, total, input.assignedTo ?? null, createdBy, input.notes ?? null,
      ]
    );
    return (await JobOrderModel.findById(rows[0].id))!;
  }

  static async update(id: string, input: Partial<JobOrderInput>): Promise<JobOrderRow | null> {
    const existing = await JobOrderModel.findById(id);
    if (!existing) return null;

    const map: Record<string, string> = {
      customerId: 'customer_id', branchId: 'branch_id', serviceType: 'service_type',
      weight: 'weight', itemCount: 'item_count', receivedAt: 'received_at',
      dueDate: 'due_date', servicePrice: 'service_price',
      additionalCharges: 'additional_charges', discount: 'discount',
      assignedTo: 'assigned_to', notes: 'notes',
    };
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(map)) {
      if (key in input) { params.push((input as any)[key]); sets.push(`${col} = $${params.length}`); }
    }

    // ถ้ามีการแตะ pricing/weight ให้คำนวณ total ใหม่
    const priceTouched = ['servicePrice', 'weight', 'additionalCharges', 'discount'].some((k) => k in input);
    if (priceTouched) {
      const total = computeTotal(
        input.servicePrice ?? existing.servicePrice,
        input.weight ?? existing.weight,
        input.additionalCharges ?? existing.additionalCharges,
        input.discount ?? existing.discount
      );
      params.push(total); sets.push(`total_price = $${params.length}`);
    }

    if (sets.length === 0) return existing;
    params.push(id);
    await query(`UPDATE job_orders SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return JobOrderModel.findById(id);
  }

  /** เปลี่ยนสถานะ + auto-set completed_at / delivered_at */
  static async updateStatus(id: string, status: JobOrderStatus): Promise<JobOrderRow | null> {
    const sets = ['status = $1'];
    if (status === 'completed') sets.push('completed_at = COALESCE(completed_at, now())');
    if (status === 'delivered') sets.push('delivered_at = COALESCE(delivered_at, now())');
    const rows = await query<{ id: string }>(
      `UPDATE job_orders SET ${sets.join(', ')} WHERE id = $2 RETURNING id`,
      [status, id]
    );
    if (rows.length === 0) return null;
    return JobOrderModel.findById(id);
  }
}
