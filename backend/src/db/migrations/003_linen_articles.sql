-- LinenFlow™ Database Schema
-- Migration 003: Linen Article master (SKU) + ownership model on linen items
--
-- แยกโมเดลเป็น 2 ระดับตามมาตรฐานอุตสาหกรรมซักผ้า:
--   linen_articles = "ประเภทผ้า/SKU" (แม่แบบ ใช้ซ้ำได้) เช่น "ผ้าเช็ดตัว 70x140 ขาว"
--   linen_items    = ผ้าแต่ละชิ้น 1 RFID tag (มีอยู่แล้วจาก migration 002) ผูกกับ article
-- และเพิ่มเรื่อง "เจ้าของผ้า": rental (ผ้าเช่าของโรงซัก) vs customer_owned (COG ผ้าลูกค้าเอง)

-- ประเภท/ชนิดผ้า (ให้เลือกจาก dropdown แทนพิมพ์ type เป็น text)
DO $$ BEGIN
  CREATE TYPE linen_category AS ENUM (
    'bed_sheet',   -- ผ้าปูที่นอน
    'pillow_case', -- ปลอกหมอน
    'towel',       -- ผ้าเช็ดตัว/ผ้าขนหนู
    'bath_towel',  -- ผ้าเช็ดตัวใหญ่
    'tablecloth',  -- ผ้าปูโต๊ะ
    'napkin',      -- ผ้าเช็ดปาก
    'uniform',     -- ชุดยูนิฟอร์ม
    'apron',       -- ผ้ากันเปื้อน
    'curtain',     -- ผ้าม่าน
    'blanket',     -- ผ้าห่ม
    'other'        -- อื่นๆ
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- โมเดลเจ้าของผ้า: กันไม่ให้เอาผ้าลูกค้า (COG) ไปปนพูลผ้าเช่า
DO $$ BEGIN
  CREATE TYPE linen_ownership AS ENUM (
    'rental',         -- ผ้าเช่าของโรงซัก คิดเงินต่อรอบเช่า
    'customer_owned'  -- ผ้าลูกค้าเอง (COG) โรงซักแค่รับซัก-คืน คิดต่อรอบซัก
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- แม่แบบประเภทผ้า (SKU). branch_id = NULL หมายถึงใช้ได้ทุกสาขา
CREATE TABLE IF NOT EXISTS linen_articles (
  id                VARCHAR(50) PRIMARY KEY,
  code              VARCHAR(50) UNIQUE NOT NULL,      -- รหัสสินค้า เช่น BST-70140-WHT
  name              VARCHAR(255) NOT NULL,
  name_en           VARCHAR(255),
  name_th           VARCHAR(255),
  category          linen_category NOT NULL,
  size              VARCHAR(50),                       -- เช่น "70x140", "King"
  color             VARCHAR(50),
  weight_grams      INT,                               -- น้ำหนักต่อชิ้น (คิดค่าซักแบบชั่ง)
  default_ownership linen_ownership NOT NULL DEFAULT 'rental',
  unit_price        NUMERIC(12,2),                     -- ราคาเช่า/ซักต่อรอบ (บาท)
  par_level         INT,                               -- ระดับสต็อกที่ควรมี (rental pool)
  branch_id         VARCHAR(50) REFERENCES branches(id),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linen_articles_category ON linen_articles(category);
CREATE INDEX IF NOT EXISTS idx_linen_articles_branch_id ON linen_articles(branch_id);

-- เพิ่มคอลัมน์ให้ linen_items: ผูกกับ article + เก็บโมเดลเจ้าของ
-- ownership มี DEFAULT 'rental' เพื่อให้แถวเดิม/INSERT เดิมยังทำงานได้
ALTER TABLE linen_items
  ADD COLUMN IF NOT EXISTS ownership linen_ownership NOT NULL DEFAULT 'rental';

ALTER TABLE linen_items
  ADD COLUMN IF NOT EXISTS article_id VARCHAR(50) REFERENCES linen_articles(id);

CREATE INDEX IF NOT EXISTS idx_linen_items_article_id ON linen_items(article_id);

-- reuse ฟังก์ชัน trigger เดิมที่ตั้ง updated_at อัตโนมัติ
DROP TRIGGER IF EXISTS update_linen_articles_updated_at ON linen_articles;
CREATE TRIGGER update_linen_articles_updated_at BEFORE UPDATE ON linen_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
