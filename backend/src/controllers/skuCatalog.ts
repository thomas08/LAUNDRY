import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SkuCatalogModel, SkuFilters } from '../models/skuCatalog';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// GET /v1/sku-catalog/dimensions — products/sizes/activities สำหรับ filter + ภาพรวม
export async function getDimensions(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const dimensions = await SkuCatalogModel.dimensions();
    res.status(200).json(dimensions);
  } catch (error: any) {
    console.error('SKU catalog dimensions error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SKU_CATALOG_ERROR' });
  }
}

// GET /v1/sku-catalog?search=&category=&productCode=&limit=&offset= — SKU ที่ประกอบเต็ม + total
export async function listSkus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters: SkuFilters = {
      search: (req.query.search as string) || undefined,
      category: (req.query.category as string) || undefined,
      productCode: (req.query.productCode as string) || undefined,
    };

    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const [rows, total] = await Promise.all([
      SkuCatalogModel.list(filters, limit, offset),
      SkuCatalogModel.count(filters),
    ]);

    res.status(200).json({ rows, total, limit, offset });
  } catch (error: any) {
    console.error('SKU catalog list error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SKU_CATALOG_ERROR' });
  }
}
