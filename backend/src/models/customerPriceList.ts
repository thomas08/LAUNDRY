import { query } from '../config/database';

// ตารางราคาต่อลูกค้า — ราคาซัก/เช่าผ้าเป็น "ราคาเฉพาะราย" ไม่ใช่ราคากลาง
// (ข้อมูลจริงจากใบแจ้งหนี้ มิ.ย. 2569: SKU เดียวกันคิดคนละราคาแล้วแต่ลูกค้า)
// รหัส SKU ใช้ชุดเดียวกับ catalog (migration 009) = product + size + activity

export type PriceServiceType = 'wash' | 'rental';

export interface PriceListRow {
  id: string;
  customerId: string;
  sku: string;
  productCode: string;
  sizeCode: string;
  activityCode: string;
  serviceType: PriceServiceType;
  unitPrice: number;
  isActive: boolean;
  displayName: string | null; // ประกอบจาก catalog (product + size + activity)
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceListInput {
  sku: string;
  serviceType?: PriceServiceType;
  unitPrice: number;
}

const SELECT_COLS = `
  p.id, p.customer_id AS "customerId", p.sku,
  p.product_code AS "productCode", p.size_code AS "sizeCode",
  p.activity_code AS "activityCode", p.service_type AS "serviceType",
  p.unit_price AS "unitPrice", p.is_active AS "isActive",
  c.display_name AS "displayName",
  p.created_at AS "createdAt", p.updated_at AS "updatedAt"
`;

// join catalog เพื่อได้ชื่อไทยเต็ม (ผ้าปูที่นอน ใหญ่ - กำจัดพิเศษ) โดยไม่เก็บชื่อซ้ำในตารางราคา
const FROM_SQL = `
  FROM customer_price_lists p
  LEFT JOIN v_sku_catalog c ON c.sku = p.sku
`;

export class CustomerPriceListModel {
  static async list(
    customerId: string,
    opts: { serviceType?: PriceServiceType; includeInactive?: boolean } = {}
  ): Promise<PriceListRow[]> {
    const params: any[] = [customerId];
    const where = ['p.customer_id = $1'];
    if (opts.serviceType) {
      params.push(opts.serviceType);
      where.push(`p.service_type = $${params.length}`);
    }
    if (!opts.includeInactive) where.push('p.is_active = true');

    return query<PriceListRow>(
      `SELECT ${SELECT_COLS} ${FROM_SQL}
        WHERE ${where.join(' AND ')}
        ORDER BY p.service_type, p.product_code, p.size_code, p.activity_code`,
      params
    );
  }

  static async findById(id: string): Promise<PriceListRow | null> {
    const rows = await query<PriceListRow>(
      `SELECT ${SELECT_COLS} ${FROM_SQL} WHERE p.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  /** ราคาที่ใช้จริงตอนออกบิล: ลูกค้า + SKU + ประเภทบริการ */
  static async findPrice(
    customerId: string,
    sku: string,
    serviceType: PriceServiceType = 'wash'
  ): Promise<PriceListRow | null> {
    const rows = await query<PriceListRow>(
      `SELECT ${SELECT_COLS} ${FROM_SQL}
        WHERE p.customer_id = $1 AND upper(p.sku) = upper($2)
          AND p.service_type = $3 AND p.is_active = true`,
      [customerId, sku, serviceType]
    );
    return rows[0] || null;
  }

  /**
   * upsert หนึ่งแถว — ตั้งราคาใหม่ให้ SKU ที่มีอยู่แล้วจะทับของเดิม
   * (UNIQUE customer_id + sku + service_type) และปลุกแถวที่ถูกปิดไว้กลับมา
   * แยกส่วนรหัสจาก v_sku_catalog เพื่อบังคับว่า SKU ต้องมีจริงใน catalog
   * รับรหัสมาแบบพิมพ์ใหญ่/เล็กก็ได้ (ใบแจ้งหนี้พิมพ์ '6SP' / catalog เก็บ '6sp')
   * แต่เก็บลง DB ตามรูปแบบของ catalog เสมอ
   */
  static async upsert(customerId: string, input: PriceListInput): Promise<PriceListRow | null> {
    const sku = input.sku.trim();
    const serviceType = input.serviceType ?? 'wash';
    const id = `cpl-${customerId.replace(/^cust-/, '')}-${serviceType}-${sku.toLowerCase()}`;

    const rows = await query<{ id: string }>(
      `INSERT INTO customer_price_lists
         (id, customer_id, sku, product_code, size_code, activity_code, service_type, unit_price)
       SELECT $1, $2, c.sku, c.product_code, c.size_code, c.activity_code, $4::price_service_type, $5
         FROM v_sku_catalog c
        WHERE upper(c.sku) = upper($3)
       ON CONFLICT (customer_id, sku, service_type) DO UPDATE SET
         unit_price = EXCLUDED.unit_price,
         is_active  = true,
         updated_at = now()
       RETURNING id`,
      [id, customerId, sku, serviceType, input.unitPrice]
    );
    // ไม่มีแถวกลับมา = SKU ไม่มีใน catalog
    if (!rows[0]) return null;
    return CustomerPriceListModel.findById(rows[0].id);
  }

  static async updatePrice(id: string, unitPrice: number): Promise<PriceListRow | null> {
    const rows = await query<{ id: string }>(
      `UPDATE customer_price_lists SET unit_price = $2 WHERE id = $1 RETURNING id`,
      [id, unitPrice]
    );
    if (!rows[0]) return null;
    return CustomerPriceListModel.findById(id);
  }

  /** soft delete — เก็บประวัติราคาเดิมไว้ ไม่ลบทิ้ง */
  static async deactivate(id: string): Promise<PriceListRow | null> {
    const rows = await query<{ id: string }>(
      `UPDATE customer_price_lists SET is_active = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows[0]) return null;
    return CustomerPriceListModel.findById(id);
  }
}
