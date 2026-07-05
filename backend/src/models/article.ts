import { query } from '../config/database';

// แม่แบบประเภทผ้า (SKU) — ดูตาราง linen_articles ใน migration 003
export type LinenCategory =
  | 'bed_sheet'
  | 'pillow_case'
  | 'towel'
  | 'bath_towel'
  | 'tablecloth'
  | 'napkin'
  | 'uniform'
  | 'apron'
  | 'curtain'
  | 'blanket'
  | 'other';

export type LinenOwnership = 'rental' | 'customer_owned';

export interface LinenArticle {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameTh: string | null;
  category: LinenCategory;
  size: string | null;
  color: string | null;
  weightGrams: number | null;
  defaultOwnership: LinenOwnership;
  unitPrice: number | null;
  parLevel: number | null;
  branchId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleInput {
  code: string;
  name: string;
  nameEn?: string | null;
  nameTh?: string | null;
  category: LinenCategory;
  size?: string | null;
  color?: string | null;
  weightGrams?: number | null;
  defaultOwnership?: LinenOwnership;
  unitPrice?: number | null;
  parLevel?: number | null;
  branchId?: string | null;
}

// SELECT ร่วมกัน — map snake_case -> camelCase
const SELECT_COLS = `
  id, code, name, name_en AS "nameEn", name_th AS "nameTh", category,
  size, color, weight_grams AS "weightGrams",
  default_ownership AS "defaultOwnership", unit_price AS "unitPrice",
  par_level AS "parLevel", branch_id AS "branchId", is_active AS "isActive",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export class ArticleModel {
  /**
   * รายการ article ที่ใช้ได้กับสาขาหนึ่ง = article ของสาขานั้น + article กลาง (branch_id IS NULL)
   * ถ้าไม่ส่ง branchId มา = คืนทั้งหมด (เช่น superadmin ดูรวม)
   * includeInactive = true จะรวมตัวที่ปิดใช้งานด้วย
   */
  static async list(branchId?: string, includeInactive = false): Promise<LinenArticle[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (branchId) {
      params.push(branchId);
      where.push(`(branch_id = $${params.length} OR branch_id IS NULL)`);
    }
    if (!includeInactive) {
      where.push('is_active = true');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<LinenArticle>(
      `SELECT ${SELECT_COLS} FROM linen_articles ${whereSql} ORDER BY category, name`,
      params
    );
  }

  static async findById(id: string): Promise<LinenArticle | null> {
    const rows = await query<LinenArticle>(
      `SELECT ${SELECT_COLS} FROM linen_articles WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByCode(code: string): Promise<LinenArticle | null> {
    const rows = await query<LinenArticle>(
      `SELECT ${SELECT_COLS} FROM linen_articles WHERE code = $1`,
      [code]
    );
    return rows[0] || null;
  }

  static async create(input: ArticleInput): Promise<LinenArticle> {
    const id = `article-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const rows = await query<LinenArticle>(
      `INSERT INTO linen_articles
         (id, code, name, name_en, name_th, category, size, color, weight_grams,
          default_ownership, unit_price, par_level, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING ${SELECT_COLS}`,
      [
        id,
        input.code,
        input.name,
        input.nameEn ?? null,
        input.nameTh ?? null,
        input.category,
        input.size ?? null,
        input.color ?? null,
        input.weightGrams ?? null,
        input.defaultOwnership ?? 'rental',
        input.unitPrice ?? null,
        input.parLevel ?? null,
        input.branchId ?? null,
      ]
    );
    return rows[0];
  }

  /** อัปเดตแบบ partial — เฉพาะ field ที่ส่งมาเท่านั้นถึงจะถูกแก้ */
  static async update(id: string, input: Partial<ArticleInput>): Promise<LinenArticle | null> {
    const map: Record<string, string> = {
      code: 'code',
      name: 'name',
      nameEn: 'name_en',
      nameTh: 'name_th',
      category: 'category',
      size: 'size',
      color: 'color',
      weightGrams: 'weight_grams',
      defaultOwnership: 'default_ownership',
      unitPrice: 'unit_price',
      parLevel: 'par_level',
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

    if (sets.length === 0) {
      return ArticleModel.findById(id);
    }

    params.push(id);
    const rows = await query<LinenArticle>(
      `UPDATE linen_articles SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING ${SELECT_COLS}`,
      params
    );
    return rows[0] || null;
  }

  /** soft delete — ปิดใช้งาน ไม่ลบจริง เพราะ linen_items อาจอ้างถึงอยู่ */
  static async deactivate(id: string): Promise<LinenArticle | null> {
    const rows = await query<LinenArticle>(
      `UPDATE linen_articles SET is_active = false WHERE id = $1 RETURNING ${SELECT_COLS}`,
      [id]
    );
    return rows[0] || null;
  }
}
