import { query } from '../config/database';
import { BranchScope } from '../utils/branchScope';

export type InvoiceStatus =
  | 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string | null;
  branchId: string;
  jobOrderIds: string[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceInput {
  customerId: string;
  branchId: string;
  jobOrderIds?: string[];
  vatRate?: number;
  discount?: number;
  issuedDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

const COLS = `
  inv.id, inv.invoice_number AS "invoiceNumber", inv.customer_id AS "customerId",
  c.name AS "customerName", inv.branch_id AS "branchId", inv.job_order_ids AS "jobOrderIds",
  inv.subtotal, inv.vat_rate AS "vatRate", inv.vat_amount AS "vatAmount", inv.discount,
  inv.total_amount AS "totalAmount", inv.status, inv.issued_date AS "issuedDate",
  inv.due_date AS "dueDate", inv.paid_date AS "paidDate", inv.paid_amount AS "paidAmount",
  inv.remaining_amount AS "remainingAmount", inv.notes, inv.created_by AS "createdBy",
  inv.created_at AS "createdAt", inv.updated_at AS "updatedAt"
`;

const round2 = (n: number) => Math.round(n * 100) / 100;

export class InvoiceModel {
  static async list(scope: BranchScope, filters: { status?: InvoiceStatus; customerId?: string } = {}): Promise<InvoiceRow[]> {
    const where: string[] = [];
    const params: any[] = [];
    if (scope !== 'all') {
      if (scope.length === 0) return [];
      params.push(scope); where.push(`inv.branch_id = ANY($${params.length})`);
    }
    if (filters.status) { params.push(filters.status); where.push(`inv.status = $${params.length}`); }
    if (filters.customerId) { params.push(filters.customerId); where.push(`inv.customer_id = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<InvoiceRow>(
      `SELECT ${COLS} FROM invoices inv LEFT JOIN customers c ON inv.customer_id = c.id
       ${whereSql} ORDER BY inv.issued_date DESC NULLS LAST, inv.created_at DESC`, params
    );
  }

  static async findById(id: string): Promise<InvoiceRow | null> {
    const rows = await query<InvoiceRow>(
      `SELECT ${COLS} FROM invoices inv LEFT JOIN customers c ON inv.customer_id = c.id WHERE inv.id = $1`, [id]
    );
    return rows[0] || null;
  }

  private static async nextNumber(): Promise<string> {
    const rows = await query<{ n: string }>(`SELECT nextval('invoice_number_seq') AS n`);
    return `INV-${new Date().getFullYear()}-${String(rows[0].n).padStart(4, '0')}`;
  }

  // subtotal = ผลรวม total_price ของ job orders ที่ผูกและเป็นของลูกค้าเดียวกัน
  private static async subtotalFromJobOrders(customerId: string, jobOrderIds: string[]): Promise<number> {
    if (jobOrderIds.length === 0) return 0;
    const rows = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(total_price),0) AS sum FROM job_orders
        WHERE id = ANY($1) AND customer_id = $2 AND status <> 'cancelled'`,
      [jobOrderIds, customerId]
    );
    return Number(rows[0].sum);
  }

  static async create(input: InvoiceInput, createdBy: string): Promise<InvoiceRow> {
    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const invoiceNumber = await InvoiceModel.nextNumber();
    const jobOrderIds = input.jobOrderIds ?? [];
    const vatRate = Number(input.vatRate ?? 0.07);
    const discount = Number(input.discount ?? 0);

    const subtotal = await InvoiceModel.subtotalFromJobOrders(input.customerId, jobOrderIds);
    const vatAmount = round2(subtotal * vatRate);
    const totalAmount = round2(subtotal + vatAmount - discount);
    const remaining = totalAmount;

    await query(
      `INSERT INTO invoices (id, invoice_number, customer_id, branch_id, job_order_ids,
        subtotal, vat_rate, vat_amount, discount, total_amount, status,
        issued_date, due_date, paid_amount, remaining_amount, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'issued',COALESCE($11,CURRENT_DATE),$12,0,$13,$14,$15)`,
      [id, invoiceNumber, input.customerId, input.branchId, JSON.stringify(jobOrderIds),
       subtotal, vatRate, vatAmount, discount, totalAmount,
       input.issuedDate ?? null, input.dueDate ?? null, remaining, input.notes ?? null, createdBy]
    );
    return (await InvoiceModel.findById(id))!;
  }

  // แก้ไข header + คำนวณยอดใหม่ถ้าเปลี่ยน job orders / vat / discount
  static async update(id: string, input: Partial<InvoiceInput>): Promise<InvoiceRow | null> {
    const existing = await InvoiceModel.findById(id);
    if (!existing) return null;

    const jobOrderIds = input.jobOrderIds ?? existing.jobOrderIds;
    const vatRate = Number(input.vatRate ?? existing.vatRate);
    const discount = Number(input.discount ?? existing.discount);
    const subtotal = await InvoiceModel.subtotalFromJobOrders(existing.customerId, jobOrderIds);
    const vatAmount = round2(subtotal * vatRate);
    const totalAmount = round2(subtotal + vatAmount - discount);
    const remaining = round2(totalAmount - Number(existing.paidAmount));

    await query(
      `UPDATE invoices SET job_order_ids=$1, vat_rate=$2, discount=$3, subtotal=$4,
        vat_amount=$5, total_amount=$6, remaining_amount=$7, due_date=COALESCE($8,due_date),
        notes=COALESCE($9,notes) WHERE id=$10`,
      [JSON.stringify(jobOrderIds), vatRate, discount, subtotal, vatAmount, totalAmount,
       remaining, input.dueDate ?? null, input.notes ?? null, id]
    );
    return InvoiceModel.findById(id);
  }

  // บันทึกการรับชำระ -> เพิ่ม paid_amount, ปรับ remaining + status
  static async recordPayment(id: string, amount: number): Promise<InvoiceRow | null> {
    const inv = await InvoiceModel.findById(id);
    if (!inv) return null;
    const paid = round2(Number(inv.paidAmount) + amount);
    const remaining = round2(Number(inv.totalAmount) - paid);
    const status: InvoiceStatus = remaining <= 0.009 ? 'paid' : paid > 0 ? 'partially_paid' : inv.status;
    await query(
      `UPDATE invoices SET paid_amount=$1, remaining_amount=$2, status=$3,
        paid_date = CASE WHEN $2 <= 0.009 THEN CURRENT_DATE ELSE paid_date END WHERE id=$4`,
      [paid, Math.max(0, remaining), status, id]
    );
    return InvoiceModel.findById(id);
  }

  static async updateStatus(id: string, status: InvoiceStatus): Promise<InvoiceRow | null> {
    const rows = await query<{ id: string }>(`UPDATE invoices SET status=$1 WHERE id=$2 RETURNING id`, [status, id]);
    if (rows.length === 0) return null;
    return InvoiceModel.findById(id);
  }
}
