import { query, transaction } from '../config/database';
import { PoolClient } from 'pg';

export type ScanEventType = 'item_receive' | 'item_status_change' | 'job_order_link' | 'stock_check';
export type LinenItemStatus = 'In Stock' | 'Washing' | 'On-Rent';
export type LinenOwnership = 'rental' | 'customer_owned'; // rental = ผ้าเช่าของโรงซัก, customer_owned = COG ผ้าลูกค้าเอง
export type SyncResultStatus = 'applied' | 'rejected';

export interface ScanEventInput {
  clientUuid: string;
  eventType: ScanEventType;
  tagId: string;
  jobOrderId?: string | null;
  branchId: string;
  newStatus?: LinenItemStatus | null;
  scannedAt: string; // ISO8601, ตั้งขึ้นบนตัวเครื่อง handheld
  payload?: Record<string, any> | null;
}

export interface SyncEventResult {
  clientUuid: string;
  result: SyncResultStatus;
  reason?: string;
  currentStatus?: LinenItemStatus;
}

export interface LinenItem {
  tagId: string;
  type: string;
  articleId: string | null;        // FK -> linen_articles (แม่แบบประเภทผ้า)
  customerId: string | null;
  branchId: string;
  status: LinenItemStatus;
  ownership: LinenOwnership;        // rental vs customer_owned (COG)
  washCycles: number;
  version: number;
  updatedAt: Date;
}

// สถานะที่เปลี่ยนได้ตามกฎธุรกิจ (กัน transition ที่ไม่สมเหตุผล เช่น receive ซ้ำตอน On-Rent)
// key = สถานะปัจจุบัน, value = event type ที่อนุญาตให้ทำจากสถานะนั้น
const ALLOWED_TRANSITIONS: Record<LinenItemStatus, ScanEventType[]> = {
  'In Stock': ['item_receive', 'item_status_change', 'job_order_link', 'stock_check'],
  'Washing': ['item_status_change', 'stock_check'],
  'On-Rent': ['item_status_change', 'stock_check'],
};

export class SyncModel {
  /**
   * ประมวลผล scan events เป็น batch แบบ idempotent
   * แต่ละ event ผ่าน/ตกอิสระจากกัน (partial success ได้)
   */
  static async processBatch(
    deviceId: string,
    performedBy: string,
    events: ScanEventInput[]
  ): Promise<SyncEventResult[]> {
    const results: SyncEventResult[] = [];

    for (const event of events) {
      const result = await transaction(async (client) => {
        return SyncModel.processSingleEvent(client, deviceId, performedBy, event);
      });
      results.push(result);
    }

    return results;
  }

  private static async processSingleEvent(
    client: PoolClient,
    deviceId: string,
    performedBy: string,
    event: ScanEventInput
  ): Promise<SyncEventResult> {
    // 1. Idempotency check: เคย apply event นี้ไปแล้วหรือยัง (client_uuid ซ้ำ)
    const existing = await client.query(
      `SELECT id, result FROM scan_events WHERE id = $1`,
      [event.clientUuid]
    );
    if (existing.rows.length > 0) {
      return { clientUuid: event.clientUuid, result: existing.rows[0].result || 'applied' };
    }

    // 2. ดึงสถานะปัจจุบันของ tag (ถ้ามี) เพื่อเช็ค transition rule
    const itemRes = await client.query(
      `SELECT tag_id, status, version FROM linen_items WHERE tag_id = $1 FOR UPDATE`,
      [event.tagId]
    );
    const existingItem = itemRes.rows[0];

    let resultStatus: SyncResultStatus = 'applied';
    let rejectionReason: string | undefined;

    if (event.eventType === 'item_receive' && !existingItem) {
      // รับผ้าเข้าครั้งแรก: สร้าง linen_items ใหม่
      // articleId/ownership มาจาก context ที่เครื่องตั้งไว้ตอนลงทะเบียน (แบบชิ้น/แบบกลุ่ม)
      // ownership default = 'rental' ให้ตรงกับ DB ถ้าเครื่องไม่ส่งมา
      //
      // กันซ้ำระดับ DB: ใช้ ON CONFLICT บน PK (tag_id) เป็นตัวกันซ้ำตัวจริง — ถ้ามีอีก
      // request สร้าง tag เดียวกันแทรกเข้ามาหลังจากเรา SELECT (race) INSERT จะไม่ชน error
      // แต่ rowCount = 0 แทน แล้วเรา reject อย่างสุภาพ (ไม่ทำให้ทั้ง batch ล้ม)
      const insertRes = await client.query(
        `INSERT INTO linen_items (tag_id, type, article_id, customer_id, branch_id, status, ownership, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         ON CONFLICT (tag_id) DO NOTHING`,
        [
          event.tagId,
          event.payload?.type || 'unknown',
          event.payload?.articleId || null,
          event.payload?.customerId || null,
          event.branchId,
          event.newStatus || 'In Stock',
          event.payload?.ownership || 'rental',
        ]
      );
      if (insertRes.rowCount === 0) {
        resultStatus = 'rejected';
        rejectionReason = 'tag already exists';
      }
    } else if (existingItem) {
      // เช็คว่า transition นี้ทำได้จากสถานะปัจจุบันไหม
      const currentStatus = existingItem.status as LinenItemStatus;
      const allowed = ALLOWED_TRANSITIONS[currentStatus]?.includes(event.eventType);

      if (!allowed) {
        resultStatus = 'rejected';
        rejectionReason = `event_type '${event.eventType}' not allowed from status '${currentStatus}'`;
      } else if (event.eventType === 'item_receive') {
        // รับผ้าซ้ำทั้งที่มี record อยู่แล้วและสถานะไม่ใช่ In Stock -> reject
        resultStatus = 'rejected';
        rejectionReason = `tag already exists with status '${currentStatus}'`;
      } else if (event.newStatus) {
        await client.query(
          `UPDATE linen_items SET status = $1, version = version + 1 WHERE tag_id = $2`,
          [event.newStatus, event.tagId]
        );
      }
      // stock_check / job_order_link ไม่แก้ status ก็ไม่ต้อง UPDATE linen_items
    } else {
      // event ไม่ใช่ item_receive แต่ tag ยังไม่เคยมีในระบบ -> reject
      resultStatus = 'rejected';
      rejectionReason = `tag_id '${event.tagId}' not found; must be 'item_receive' first`;
    }

    // 3. บันทึก event log เสมอ (ไม่ว่า applied หรือ rejected) เพื่อ audit trail ครบ
    await client.query(
      `INSERT INTO scan_events
        (id, event_type, tag_id, job_order_id, branch_id, new_status, performed_by,
         device_id, scanned_at, payload, result, rejection_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        event.clientUuid,
        event.eventType,
        event.tagId,
        event.jobOrderId || null,
        event.branchId,
        event.newStatus || null,
        performedBy,
        deviceId,
        event.scannedAt,
        event.payload ? JSON.stringify(event.payload) : null,
        resultStatus,
        rejectionReason || null,
      ]
    );

    return {
      clientUuid: event.clientUuid,
      result: resultStatus,
      reason: rejectionReason,
      currentStatus: existingItem?.status,
    };
  }

  /**
   * ข้อมูลอ้างอิงให้ handheld (Chainway C72) cache ไว้ใช้ตอนออฟไลน์:
   *   - branch: สาขาที่กำลังทำงาน
   *   - customers: ลูกค้าของสาขา (ใช้ตอน pickup/COG เลือกเจ้าของผ้า)
   *   - jobOrders: ใบสั่งงานที่ยัง "เปิด" อยู่ (ใช้ตอน job_order_link ผูกผ้ากับงาน)
   * ปรับ sync/reference version ทุกครั้งที่เพิ่ม field เพื่อให้เครื่องรู้ว่าต้อง refresh cache
   */
  static async getReferenceData(branchId: string) {
    const branch = await query(
      `SELECT id, code, name FROM branches WHERE id = $1 AND is_active = true`,
      [branchId]
    );
    const customers = await query(
      `SELECT id, name, customer_type AS "customerType", phone
         FROM customers
        WHERE branch_id = $1 AND is_active = true
        ORDER BY name`,
      [branchId]
    );
    const jobOrders = await query(
      `SELECT id, order_number AS "orderNumber", customer_id AS "customerId", status
         FROM job_orders
        WHERE branch_id = $1 AND status NOT IN ('delivered', 'cancelled')
        ORDER BY created_at DESC`,
      [branchId]
    );
    // Article/SKU master for the handheld Register flow (branch-specific + global).
    const articles = await query(
      `SELECT id, code, name, name_en AS "nameEn", category
         FROM linen_articles
        WHERE (branch_id = $1 OR branch_id IS NULL) AND is_active = true
        ORDER BY name`,
      [branchId]
    );
    return {
      branch: branch[0] || null,
      customers,
      jobOrders,
      articles,
      syncedAt: new Date().toISOString(),
    };
  }
}
