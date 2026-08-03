import { query } from '../config/database';

export type CustomerType =
  | 'hotel' | 'hospital' | 'resort' | 'restaurant' | 'individual' | 'other';

export interface Customer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  customerType: CustomerType;
  taxId: string | null;
  creditLimit: number | null;
  currentBalance: number | null;
  paymentTerms: number | null;
  vatRate: number;
  branchId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInput {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customerType?: CustomerType;
  taxId?: string | null;
  creditLimit?: number | null;
  paymentTerms?: number | null;
  vatRate?: number | null;   // อัตรา VAT เศษส่วน เช่น 0.07 (บางรายไม่คิด VAT = 0)
  branchId: string;
}

const SELECT_COLS = `
  id, name, contact_person AS "contactPerson", email, phone, address,
  customer_type AS "customerType", tax_id AS "taxId",
  credit_limit AS "creditLimit", current_balance AS "currentBalance",
  payment_terms AS "paymentTerms", vat_rate AS "vatRate", branch_id AS "branchId",
  is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
`;

// 'all' = superadmin (ทุกสาขา); array = เฉพาะสาขาที่เข้าถึงได้
export type BranchScope = string[] | 'all';

export class CustomerModel {
  static async list(scope: BranchScope, includeInactive = false): Promise<Customer[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (scope !== 'all') {
      if (scope.length === 0) return []; // ไม่มีสาขาที่เข้าถึงได้
      params.push(scope);
      where.push(`branch_id = ANY($${params.length})`);
    }
    if (!includeInactive) where.push('is_active = true');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<Customer>(
      `SELECT ${SELECT_COLS} FROM customers ${whereSql} ORDER BY name`,
      params
    );
  }

  static async findById(id: string): Promise<Customer | null> {
    const rows = await query<Customer>(
      `SELECT ${SELECT_COLS} FROM customers WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async create(input: CustomerInput): Promise<Customer> {
    const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const rows = await query<Customer>(
      `INSERT INTO customers
        (id, name, contact_person, email, phone, address, customer_type,
         tax_id, credit_limit, payment_terms, vat_rate, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING ${SELECT_COLS}`,
      [
        id,
        input.name,
        input.contactPerson ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.customerType ?? 'other',
        input.taxId ?? null,
        input.creditLimit ?? null,
        input.paymentTerms ?? null,
        input.vatRate ?? 0.07,
        input.branchId,
      ]
    );
    return rows[0];
  }

  static async update(id: string, input: Partial<CustomerInput>): Promise<Customer | null> {
    const map: Record<string, string> = {
      name: 'name',
      contactPerson: 'contact_person',
      email: 'email',
      phone: 'phone',
      address: 'address',
      customerType: 'customer_type',
      taxId: 'tax_id',
      creditLimit: 'credit_limit',
      paymentTerms: 'payment_terms',
      vatRate: 'vat_rate',
      branchId: 'branch_id',
    };
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(map)) {
      if (key in input) {
        params.push((input as any)[key]);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (sets.length === 0) return CustomerModel.findById(id);

    params.push(id);
    const rows = await query<Customer>(
      `UPDATE customers SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING ${SELECT_COLS}`,
      params
    );
    return rows[0] || null;
  }

  static async deactivate(id: string): Promise<Customer | null> {
    const rows = await query<Customer>(
      `UPDATE customers SET is_active = false WHERE id = $1 RETURNING ${SELECT_COLS}`,
      [id]
    );
    return rows[0] || null;
  }
}
