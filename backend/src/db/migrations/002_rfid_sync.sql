-- LinenFlow™ Database Schema
-- Migration 002: RFID Sync (linen items + offline scan events from handheld devices)

-- Enum for the kinds of events a handheld can produce
DO $$ BEGIN
  CREATE TYPE scan_event_type AS ENUM (
    'item_receive',       -- รับผ้าเข้าระบบครั้งแรก (ผูก tag กับลูกค้า/job order)
    'item_status_change',  -- เปลี่ยนสถานะ (In Stock / Washing / On-Rent)
    'job_order_link',      -- ผูก tag เข้ากับ job order ภายหลัง
    'stock_check'           -- ตรวจนับสต็อก/audit เฉยๆ ไม่เปลี่ยนสถานะ
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_result_status AS ENUM ('applied', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE linen_item_status AS ENUM ('In Stock', 'Washing', 'On-Rent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- หมายเหตุ: ตาราง customers และ job_orders ยังไม่ถูกสร้างในระบบนี้ (เป็นโมดูลที่ยังไม่ implement)
-- customer_id / job_order_id ด้านล่างจึงเก็บเป็น VARCHAR เฉยๆ ก่อน "ไม่ใส่ FK constraint"
-- เมื่อสร้างตาราง customers/job_orders จริงในอนาคต ค่อยรัน ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY เพิ่ม

-- Master state ของผ้าแต่ละชิ้น หนึ่งแถวต่อหนึ่ง RFID tag
CREATE TABLE IF NOT EXISTS linen_items (
  tag_id       VARCHAR(100) PRIMARY KEY,          -- EPC ที่อ่านจาก RFID
  type         VARCHAR(100) NOT NULL,
  customer_id  VARCHAR(50),                        -- จะเป็น FK -> customers(id) เมื่อ module ลูกค้าถูกสร้าง
  branch_id    VARCHAR(50) NOT NULL REFERENCES branches(id),
  status       linen_item_status NOT NULL DEFAULT 'In Stock',
  wash_cycles  INT NOT NULL DEFAULT 0,
  version      INT NOT NULL DEFAULT 1,              -- optimistic locking
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Event log แบบ append-only ทุกครั้งที่ handheld สแกน (idempotency key = id)
CREATE TABLE IF NOT EXISTS scan_events (
  id               UUID PRIMARY KEY,                -- = client_uuid ที่ handheld gen เอง
  event_type       scan_event_type NOT NULL,
  tag_id           VARCHAR(100) NOT NULL,
  job_order_id     VARCHAR(50),                     -- จะเป็น FK -> job_orders(id) เมื่อ module job order ถูกสร้าง
  branch_id        VARCHAR(50) NOT NULL REFERENCES branches(id),
  new_status       linen_item_status,
  performed_by     VARCHAR(50) NOT NULL REFERENCES users(id),
  device_id        VARCHAR(100) NOT NULL,
  scanned_at       TIMESTAMPTZ NOT NULL,             -- เวลาจริงตอนสแกน (client clock)
  received_at      TIMESTAMPTZ DEFAULT now(),        -- เวลาที่ backend รับ (debug delay ได้)
  payload          JSONB,
  result           sync_result_status,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_events_tag_id ON scan_events(tag_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_job_order ON scan_events(job_order_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_branch_id ON scan_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_linen_items_branch_id ON linen_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_linen_items_customer_id ON linen_items(customer_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_linen_items_updated_at ON linen_items;
CREATE TRIGGER update_linen_items_updated_at BEFORE UPDATE ON linen_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
