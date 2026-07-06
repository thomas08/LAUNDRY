import { query } from '../config/database';
import { BranchScope } from '../utils/branchScope';

export type ExpenseCategory =
  | 'materials' | 'utilities' | 'labor' | 'rent' | 'maintenance'
  | 'transportation' | 'office_supplies' | 'marketing' | 'other';

export type PaymentMethod =
  | 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'promissory_note';

export interface ExpenseRow {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  branchId: string;
  paymentMethod: PaymentMethod;
  paymentDate: string | null;
  supplierId: string | null;
  jobOrderId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount?: number;
  vatAmount?: number;
  branchId: string;
  paymentMethod?: PaymentMethod;
  paymentDate?: string | null;
  supplierId?: string | null;
  jobOrderId?: string | null;
  notes?: string | null;
}

const COLS = `
  id, expense_number AS "expenseNumber", category, description,
  amount, vat_amount AS "vatAmount", total_amount AS "totalAmount",
  branch_id AS "branchId", payment_method AS "paymentMethod",
  payment_date AS "paymentDate", supplier_id AS "supplierId",
  job_order_id AS "jobOrderId", notes, recorded_by AS "recordedBy",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export class ExpenseModel {
  static async list(scope: BranchScope, filters: { category?: ExpenseCategory; paymentMethod?: PaymentMethod } = {}): Promise<ExpenseRow[]> {
    const where: string[] = [];
    const params: any[] = [];
    if (scope !== 'all') {
      if (scope.length === 0) return [];
      params.push(scope); where.push(`branch_id = ANY($${params.length})`);
    }
    if (filters.category) { params.push(filters.category); where.push(`category = $${params.length}`); }
    if (filters.paymentMethod) { params.push(filters.paymentMethod); where.push(`payment_method = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<ExpenseRow>(`SELECT ${COLS} FROM expenses ${whereSql} ORDER BY payment_date DESC NULLS LAST, created_at DESC`, params);
  }

  static async findById(id: string): Promise<ExpenseRow | null> {
    const rows = await query<ExpenseRow>(`SELECT ${COLS} FROM expenses WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  private static async nextNumber(): Promise<string> {
    const rows = await query<{ n: string }>(`SELECT nextval('expense_number_seq') AS n`);
    return `EXP-${new Date().getFullYear()}-${String(rows[0].n).padStart(4, '0')}`;
  }

  static async create(input: ExpenseInput, recordedBy: string): Promise<ExpenseRow> {
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const expenseNumber = await ExpenseModel.nextNumber();
    const amount = Number(input.amount ?? 0);
    const vat = Number(input.vatAmount ?? 0);
    const total = Math.round((amount + vat) * 100) / 100;
    await query(
      `INSERT INTO expenses (id, expense_number, category, description, amount, vat_amount,
        total_amount, branch_id, payment_method, payment_date, supplier_id, job_order_id, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, expenseNumber, input.category, input.description, amount, vat, total, input.branchId,
       input.paymentMethod ?? 'cash', input.paymentDate ?? null, input.supplierId ?? null,
       input.jobOrderId ?? null, input.notes ?? null, recordedBy]
    );
    return (await ExpenseModel.findById(id))!;
  }

  static async update(id: string, input: Partial<ExpenseInput>): Promise<ExpenseRow | null> {
    const existing = await ExpenseModel.findById(id);
    if (!existing) return null;
    const map: Record<string, string> = {
      category: 'category', description: 'description', amount: 'amount', vatAmount: 'vat_amount',
      branchId: 'branch_id', paymentMethod: 'payment_method', paymentDate: 'payment_date',
      supplierId: 'supplier_id', jobOrderId: 'job_order_id', notes: 'notes',
    };
    const sets: string[] = [];
    const params: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in input) { params.push((input as any)[k]); sets.push(`${col} = $${params.length}`); }
    }
    if ('amount' in input || 'vatAmount' in input) {
      const total = Math.round((Number(input.amount ?? existing.amount) + Number(input.vatAmount ?? existing.vatAmount)) * 100) / 100;
      params.push(total); sets.push(`total_amount = $${params.length}`);
    }
    if (sets.length === 0) return existing;
    params.push(id);
    await query(`UPDATE expenses SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return ExpenseModel.findById(id);
  }

  static async remove(id: string): Promise<boolean> {
    const rows = await query<{ id: string }>(`DELETE FROM expenses WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }
}
