import { query } from '../config/database';

// SKU catalog เป็นข้อมูล reference ระดับองค์กร (ไม่ผูกสาขา) จาก COA.xlsx ของลูกค้า
// รหัส SKU เก็บแยก 3 ส่วน (product + size + activity) ประกอบตอนแสดงผลผ่าน view v_sku_catalog

export interface CatalogProduct {
  code: string;
  name: string;
  category: string;
}
export interface CatalogDimension {
  code: string;
  name: string;
}
export interface CatalogDimensions {
  products: CatalogProduct[];
  sizes: CatalogDimension[];
  activities: CatalogDimension[];
}

export interface SkuRow {
  sku: string;
  productCode: string;
  productName: string;
  sizeCode: string;
  sizeName: string;
  activityCode: string;
  activityName: string;
  displayName: string;
  category: string;
}

export interface SkuFilters {
  search?: string;
  category?: string;
  productCode?: string;
}

const SKU_COLS = `
  sku            AS "sku",
  product_code   AS "productCode",
  product_name   AS "productName",
  size_code      AS "sizeCode",
  size_name      AS "sizeName",
  activity_code  AS "activityCode",
  activity_name  AS "activityName",
  display_name   AS "displayName",
  category       AS "category"
`;

export class SkuCatalogModel {
  /** มิติสำหรับ dropdown filter + ภาพรวม: products (active), sizes, activities */
  static async dimensions(): Promise<CatalogDimensions> {
    const [products, sizes, activities] = await Promise.all([
      query<CatalogProduct>(
        `SELECT code, name_th AS "name", category
           FROM catalog_products
          WHERE is_active = true
          ORDER BY category, code`
      ),
      query<CatalogDimension>(
        `SELECT code, name_th AS "name" FROM catalog_sizes ORDER BY sort_order`
      ),
      query<CatalogDimension>(
        `SELECT code, name_th AS "name" FROM catalog_activities ORDER BY sort_order`
      ),
    ]);
    return { products, sizes, activities };
  }

  /** สร้าง WHERE + params ร่วมกันระหว่าง list กับ count */
  private static buildWhere(filters: SkuFilters): { sql: string; params: any[] } {
    const where: string[] = [];
    const params: any[] = [];
    if (filters.category) {
      params.push(filters.category);
      where.push(`category = $${params.length}`);
    }
    if (filters.productCode) {
      params.push(filters.productCode);
      where.push(`product_code = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`(display_name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
  }

  /** จำนวน SKU ทั้งหมดที่ตรง filter (สำหรับ pagination) */
  static async count(filters: SkuFilters = {}): Promise<number> {
    const { sql, params } = this.buildWhere(filters);
    const rows = await query<{ count: string }>(
      `SELECT count(*) AS count FROM v_sku_catalog ${sql}`,
      params
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** รายการ SKU ที่ประกอบเต็ม (product × size × activity) ตาม filter + แบ่งหน้า */
  static async list(filters: SkuFilters = {}, limit = 50, offset = 0): Promise<SkuRow[]> {
    const { sql, params } = this.buildWhere(filters);
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;
    return query<SkuRow>(
      `SELECT ${SKU_COLS}
         FROM v_sku_catalog
         ${sql}
         ORDER BY product_code, size_code, activity_code
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
  }
}
