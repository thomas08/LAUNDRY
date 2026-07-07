import { query } from '../config/database';

// สถานีลงทะเบียนที่เว็บคุม: เว็บสร้าง session ถือ context (ประเภทผ้า/ownership) แล้ว
// C72 ลิงก์เข้าด้วย "รหัสสถานี" เพื่อยิงแท็กภายใต้ context นั้น ดู migration 011.

export interface RegistrationSession {
  code: string;
  branchId: string;
  articleId: string | null;
  articleName: string | null;
  ownership: string;              // 'rental' | 'customer_owned'
  customerId: string | null;
  createdBy: string;
  status: string;                 // 'active' | 'closed'
  expiresAt: Date;
}

export interface SessionScan {
  tagId: string;
  scannedAt: Date;
}

const SESSION_TTL_HOURS = 8;

function rowToSession(r: any): RegistrationSession {
  return {
    code: r.code,
    branchId: r.branch_id,
    articleId: r.article_id,
    articleName: r.article_name,
    ownership: r.ownership,
    customerId: r.customer_id,
    createdBy: r.created_by,
    status: r.status,
    expiresAt: r.expires_at,
  };
}

export class RegistrationSessionModel {
  /** สร้าง session ใหม่ + รหัส 6 หลักที่ไม่ซ้ำกับ session ที่ยัง active (retry กันชน) */
  static async create(input: {
    branchId: string;
    articleId?: string | null;
    articleName?: string | null;
    ownership: string;
    customerId?: string | null;
    createdBy: string;
  }): Promise<RegistrationSession> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 หลัก
      const rows = await query<any>(
        `INSERT INTO registration_sessions
           (code, branch_id, article_id, article_name, ownership, customer_id, created_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '${SESSION_TTL_HOURS} hours')
         ON CONFLICT (code) DO NOTHING
         RETURNING *`,
        [
          code,
          input.branchId,
          input.articleId || null,
          input.articleName || null,
          input.ownership,
          input.customerId || null,
          input.createdBy,
        ]
      );
      if (rows.length > 0) return rowToSession(rows[0]);
      // code ชนกับ session เก่า (รวมที่ปิด/หมดอายุแล้วแต่ยังไม่ถูกลบ) — สุ่มใหม่
    }
    throw new Error('Could not allocate a unique session code');
  }

  /** ดึง session ที่ยัง active และไม่หมดอายุ */
  static async getActive(code: string): Promise<RegistrationSession | null> {
    const rows = await query<any>(
      `SELECT * FROM registration_sessions
       WHERE code = $1 AND status = 'active' AND expires_at > now()`,
      [code]
    );
    return rows.length ? rowToSession(rows[0]) : null;
  }

  /** แท็กที่ลงทะเบียนสำเร็จภายใต้ session นี้ (ให้เว็บ poll เห็นสด) newest first */
  static async scans(code: string, since?: string): Promise<SessionScan[]> {
    const params: any[] = [code];
    let sinceSql = '';
    if (since) { params.push(since); sinceSql = `AND scanned_at > $2`; }
    const rows = await query<any>(
      `SELECT tag_id, scanned_at FROM scan_events
       WHERE session_id = $1 AND event_type = 'item_receive' AND result = 'applied' ${sinceSql}
       ORDER BY scanned_at DESC
       LIMIT 300`,
      params
    );
    return rows.map((r: any) => ({ tagId: r.tag_id, scannedAt: r.scanned_at }));
  }

  /** จำนวนแท็กที่ลงทะเบียนสำเร็จทั้งหมดใน session */
  static async count(code: string): Promise<number> {
    const rows = await query<{ n: number }>(
      `SELECT count(*)::int AS n FROM scan_events
       WHERE session_id = $1 AND event_type = 'item_receive' AND result = 'applied'`,
      [code]
    );
    return rows[0]?.n ?? 0;
  }

  static async close(code: string): Promise<void> {
    await query(`UPDATE registration_sessions SET status = 'closed' WHERE code = $1`, [code]);
  }
}
