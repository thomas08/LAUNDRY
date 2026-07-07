-- Migration 011: Web-driven registration station (real-time C72 ↔ web link)
--
-- ใช้ตอนลงทะเบียนผ้าใหม่ "ในร้านตัวเอง": เว็บที่เคาน์เตอร์สร้าง session (ถือ context
-- ประเภทผ้า/ownership ที่เลือก) แล้วโชว์ "รหัสสถานี" สั้น ๆ เครื่อง C72 พิมพ์รหัสเพื่อ
-- ลิงก์เข้า session → ดึง context ไปใช้ → ยิงแท็ก UHF ลงทะเบียนภายใต้ context นั้น
-- และ stamp session_id ไว้ทุก event เพื่อให้เว็บ poll เห็นผลแบบเรียลไทม์.
-- (idempotent — runner รันซ้ำได้)

CREATE TABLE IF NOT EXISTS registration_sessions (
  code         VARCHAR(12) PRIMARY KEY,                 -- รหัสสั้นที่พิมพ์บน handheld
  branch_id    VARCHAR(50) NOT NULL REFERENCES branches(id),
  article_id   VARCHAR(50),                             -- context ที่ handheld จะลงทะเบียนด้วย
  article_name VARCHAR(100),
  ownership    VARCHAR(20) NOT NULL DEFAULT 'rental',   -- 'rental' | 'customer_owned'
  customer_id  VARCHAR(50),                             -- COG เท่านั้น
  created_by   VARCHAR(50) NOT NULL REFERENCES users(id),
  status       VARCHAR(12) NOT NULL DEFAULT 'active',   -- 'active' | 'closed'
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

-- ผูก scan แต่ละครั้งกับ session (nullable — เฉพาะ scan ที่ลิงก์สถานีเท่านั้นที่ตั้งค่า)
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS session_id VARCHAR(12);
CREATE INDEX IF NOT EXISTS idx_scan_events_session ON scan_events(session_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_reg_sessions_active ON registration_sessions(status, expires_at);
