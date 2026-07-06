import { query } from '../config/database';

// suppliers เป็น org-global (ไม่ผูกสาขา) จึง *ไม่* ใช้ BranchScope เหมือน customers
// ดู migration 007_suppliers.sql สำหรับเหตุผลการตัดสินใจ

export interface SupplierRow {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  nameEn: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierInput {
  name: string;
  nameTh?: string | null;
  nameEn?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  paymentTerms?: number | null;
}

const SELECT_COLS = `
  id, code, name, name_th AS "nameTh", name_en AS "nameEn",
  contact_person AS "contactPerson", email, phone, address,
  tax_id AS "taxId", payment_terms AS "paymentTerms",
  is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
`;

export class SupplierModel {
  // org-global: ไม่มี branch scope, มีแค่ตัวเลือกซ่อน inactive (default ซ่อน)
  static async list(includeInactive = false): Promise<SupplierRow[]> {
    const whereSql = includeInactive ? '' : 'WHERE is_active = true';
    return query<SupplierRow>(
      `SELECT ${SELECT_COLS} FROM suppliers ${whereSql} ORDER BY code`,
      []
    );
  }

  static async findById(id: string): Promise<SupplierRow | null> {
    const rows = await query<SupplierRow>(
      `SELECT ${SELECT_COLS} FROM suppliers WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // รหัส SUP-0001 จาก sequence (เหมือน pattern ของ job-orders / expenses)
  private static async nextCode(): Promise<string> {
    const rows = await query<{ n: string }>(`SELECT nextval('supplier_number_seq') AS n`);
    return `SUP-${String(rows[0].n).padStart(4, '0')}`;
  }

  static async create(input: SupplierInput): Promise<SupplierRow> {
    const id = `sup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const code = await SupplierModel.nextCode();
    const rows = await query<SupplierRow>(
      `INSERT INTO suppliers
        (id, code, name, name_th, name_en, contact_person, email, phone,
         address, tax_id, payment_terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING ${SELECT_COLS}`,
      [
        id,
        code,
        input.name,
        input.nameTh ?? null,
        input.nameEn ?? null,
        input.contactPerson ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.taxId ?? null,
        input.paymentTerms ?? null,
      ]
    );
    return rows[0];
  }

  static async update(id: string, input: Partial<SupplierInput>): Promise<SupplierRow | null> {
    // code ไม่ให้แก้ (ระบบออกให้อัตโนมัติ) จึงไม่อยู่ใน map
    const map: Record<string, string> = {
      name: 'name',
      nameTh: 'name_th',
      nameEn: 'name_en',
      contactPerson: 'contact_person',
      email: 'email',
      phone: 'phone',
      address: 'address',
      taxId: 'tax_id',
      paymentTerms: 'payment_terms',
    };
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(map)) {
      if (key in input) {
        params.push((input as any)[key]);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (sets.length === 0) return SupplierModel.findById(id);

    params.push(id);
    const rows = await query<SupplierRow>(
      `UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING ${SELECT_COLS}`,
      params
    );
    return rows[0] || null;
  }

  static async deactivate(id: string): Promise<SupplierRow | null> {
    const rows = await query<SupplierRow>(
      `UPDATE suppliers SET is_active = false WHERE id = $1 RETURNING ${SELECT_COLS}`,
      [id]
    );
    return rows[0] || null;
  }
}
