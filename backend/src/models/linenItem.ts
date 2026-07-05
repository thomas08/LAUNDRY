import { query } from '../config/database';
import { BranchScope } from '../utils/branchScope';
import { LinenItemStatus, LinenOwnership } from './sync';

export interface LinenItemRow {
  tagId: string;
  type: string;
  articleId: string | null;
  articleName: string | null;
  customerId: string | null;
  customerName: string | null;
  branchId: string;
  status: LinenItemStatus;
  ownership: LinenOwnership;
  washCycles: number;
  version: number;
  updatedAt: Date;
}

const SELECT_COLS = `
  li.tag_id       AS "tagId",
  li.type         AS "type",
  li.article_id   AS "articleId",
  a.name          AS "articleName",
  li.customer_id  AS "customerId",
  c.name          AS "customerName",
  li.branch_id    AS "branchId",
  li.status       AS "status",
  li.ownership    AS "ownership",
  li.wash_cycles  AS "washCycles",
  li.version      AS "version",
  li.updated_at   AS "updatedAt"
`;

export class LinenItemModel {
  /**
   * รายการผ้าตามสาขาที่เข้าถึงได้ + join ชื่อ article/customer มาแสดง
   * filters: status (In Stock / Washing / On-Rent), ownership
   */
  static async list(
    scope: BranchScope,
    filters: { status?: LinenItemStatus; ownership?: LinenOwnership } = {}
  ): Promise<LinenItemRow[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (scope !== 'all') {
      if (scope.length === 0) return [];
      params.push(scope);
      where.push(`li.branch_id = ANY($${params.length})`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`li.status = $${params.length}`);
    }
    if (filters.ownership) {
      params.push(filters.ownership);
      where.push(`li.ownership = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return query<LinenItemRow>(
      `SELECT ${SELECT_COLS}
         FROM linen_items li
         LEFT JOIN linen_articles a ON li.article_id = a.id
         LEFT JOIN customers c ON li.customer_id = c.id
         ${whereSql}
         ORDER BY li.updated_at DESC`,
      params
    );
  }
}
