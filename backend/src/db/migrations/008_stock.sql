-- LinenFlow™ Database Schema
-- Migration 008: Consumable Stock (วัสดุสิ้นเปลือง) — ผงซักฟอก / น้ำยา / บรรจุภัณฑ์ ฯลฯ
--
-- สองตารางที่สัมพันธ์กัน:
--   1) inventory_items      = ทะเบียนวัสดุ (master) เก็บ current_stock ปัจจุบันของแต่ละสาขา
--   2) stock_transactions   = สมุดบัญชีการเคลื่อนไหวสต็อก (ledger) — insert-only, ไม่แก้ย้อนหลัง
--
-- การตัดสินใจเรื่องขอบเขต (scope):
--   inventory_items *ผูกกับสาขา* (มี branch_id) เหมือน customers — สต็อกของแต่ละสาขาแยกกัน
--   จึง scope ตามสาขา (branchScopeFor / canUseBranch) ต่างจาก suppliers ที่เป็น org-global
--
-- กติกาการอัปเดต current_stock (ทำใน transaction เดียวกับการ insert ledger เสมอ):
--   stock_in / return -> current_stock += quantity
--   stock_out         -> current_stock -= quantity  (ห้ามติดลบ -> reject)
--   adjustment        -> current_stock += quantity  (quantity เป็น "ผลต่างแบบมีเครื่องหมาย", ติดลบได้; ผลลัพธ์ห้ามติดลบ)
--   transfer          -> ยังไม่รองรับใน v1 (controller ตอบ 400) — ดูสเปก
--   *ตรรกะทั้งหมดอยู่ใน applyStockMovement() (pure fn) ใน models/inventoryItem.ts*

-- ประเภทวัสดุสิ้นเปลือง (ตรงกับ InventoryItemType ใน lib/types.ts)
DO $$ BEGIN
  CREATE TYPE inventory_item_type AS ENUM (
    'detergent',      -- ผงซักฟอก
    'softener',       -- น้ำยาปรับผ้านุ่ม
    'bleach',         -- น้ำยาฟอกขาว
    'stain_remover',  -- น้ำยาขจัดคราบ
    'packaging',      -- วัสดุบรรจุภัณฑ์
    'plastic_bag',    -- ถุงพลาสติก
    'hanger',         -- ไม้แขวน
    'tag',            -- ป้ายสินค้า
    'gas',            -- แก๊ส
    'other'           -- อื่นๆ
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- หน่วยนับ (ตรงกับ InventoryUnit ใน lib/types.ts)
DO $$ BEGIN
  CREATE TYPE inventory_unit AS ENUM (
    'kg',      -- กิโลกรัม
    'liter',   -- ลิตร
    'piece',   -- ชิ้น
    'box',     -- กล่อง
    'bottle',  -- ขวด
    'tank'     -- ถัง
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ประเภทการเคลื่อนไหวสต็อก (ตรงกับ StockTransactionType ใน lib/types.ts)
DO $$ BEGIN
  CREATE TYPE stock_transaction_type AS ENUM (
    'stock_in',    -- รับเข้า
    'stock_out',   -- เบิกจ่าย
    'adjustment',  -- ปรับปรุง (ผลต่างแบบมีเครื่องหมาย)
    'transfer',    -- โอนย้าย (ยังไม่รองรับ v1)
    'return'       -- คืน
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ลำดับเลขรหัสวัสดุ (ใช้ต่อท้าย INV-) เช่น INV-0001
-- ตัดสินใจ: ใช้ sequence เดียว (INV-####) แทน prefix ตามชนิด (DET-/SOF-) เพราะ
--   หน้าเว็บแสดง code เป็นข้อความเฉยๆ ไม่พึ่ง prefix ให้ตรงชนิด — เลือกแบบที่ง่ายสุด
CREATE SEQUENCE IF NOT EXISTS inventory_number_seq;

-- ============================================================
-- 1) ทะเบียนวัสดุ (master)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id             VARCHAR(50) PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,          -- รหัสวัสดุ เช่น INV-0001 (จาก sequence)
  name           VARCHAR(255) NOT NULL,                -- ชื่อวัสดุ (หลัก)
  name_th        VARCHAR(255),                         -- ชื่อภาษาไทย
  name_en        VARCHAR(255),                         -- ชื่อภาษาอังกฤษ
  type           inventory_item_type NOT NULL DEFAULT 'other',
  unit           inventory_unit NOT NULL DEFAULT 'piece',
  current_stock  NUMERIC(14,2) NOT NULL DEFAULT 0,     -- สต็อกปัจจุบัน (เปลี่ยนผ่าน ledger เท่านั้น)
  minimum_stock  NUMERIC(14,2) NOT NULL DEFAULT 0,     -- สต็อกขั้นต่ำ (critical ถ้า <=)
  maximum_stock  NUMERIC(14,2),                        -- สต็อกสูงสุด (optional)
  reorder_point  NUMERIC(14,2) NOT NULL DEFAULT 0,     -- จุดสั่งซื้อใหม่ (low ถ้า <=)
  unit_cost      NUMERIC(14,2) NOT NULL DEFAULT 0,     -- ต้นทุนต่อหน่วย (บาท)
  supplier_id    VARCHAR(50),                          -- ผูก FK ด้านล่าง (idempotent)
  branch_id      VARCHAR(50) NOT NULL REFERENCES branches(id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);

-- reuse ฟังก์ชัน trigger updated_at เดิม (นิยามใน schema.sql)
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2) สมุดบัญชีการเคลื่อนไหวสต็อก (ledger — insert-only, ไม่มี updated_at)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id                VARCHAR(50) PRIMARY KEY,
  inventory_item_id VARCHAR(50) NOT NULL REFERENCES inventory_items(id),
  type              stock_transaction_type NOT NULL,
  quantity          NUMERIC(14,2) NOT NULL,            -- + สำหรับ in/return, magnitude สำหรับ out, signed สำหรับ adjustment
  unit              inventory_unit NOT NULL,
  unit_cost         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(14,2) NOT NULL DEFAULT 0,  -- = round(|unit_cost| * |quantity|, 2) คำนวณฝั่ง server
  reference_type    VARCHAR(30),                       -- 'job_order' | 'supplier_invoice' | 'manual'
  reference_id      VARCHAR(50),
  from_branch_id    VARCHAR(50),                        -- ใช้กับ transfer (v1 ยังไม่รองรับ)
  to_branch_id      VARCHAR(50),
  branch_id         VARCHAR(50) NOT NULL REFERENCES branches(id),  -- สาขาที่ทำธุรกรรม (= สาขาของ item)
  performed_by      VARCHAR(50) REFERENCES users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_item_id ON stock_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_branch_id ON stock_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at);

-- ผูก FK inventory_items.supplier_id -> suppliers(id)
--   suppliers มีแล้ว (migration 007 < 008) และ inventory_items เป็นตารางใหม่ (ข้อมูลว่าง/สะอาด)
--   จึงเพิ่ม FK ได้ปลอดภัย เขียนแบบ idempotent (กัน duplicate_object ตอน re-run) เหมือน 007
DO $$ BEGIN
  ALTER TABLE inventory_items
    ADD CONSTRAINT fk_inventory_items_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;   -- constraint มีอยู่แล้ว (re-run) -> ข้าม
END $$;
