/**
 * SKU Catalog API — backend /v1/sku-catalog (read-only reference data).
 * Composed from the customer's COA.xlsx (product × size × activity).
 */

import { apiFetch } from './client'

export interface CatalogProduct {
  code: string
  name: string
  category: string
}
export interface CatalogDimension {
  code: string
  name: string
}
export interface CatalogDimensions {
  products: CatalogProduct[]
  sizes: CatalogDimension[]
  activities: CatalogDimension[]
}

export interface SkuRow {
  sku: string
  productCode: string
  productName: string
  sizeCode: string
  sizeName: string
  activityCode: string
  activityName: string
  displayName: string
  category: string
}

export interface SkuListResult {
  rows: SkuRow[]
  total: number
  limit: number
  offset: number
}

export interface SkuFilters {
  search?: string
  category?: string
  productCode?: string
  limit?: number
  offset?: number
}

/** GET /v1/sku-catalog/dimensions — products/sizes/activities for filters + overview. */
export async function fetchCatalogDimensions(): Promise<CatalogDimensions> {
  return apiFetch<CatalogDimensions>('/sku-catalog/dimensions')
}

/** GET /v1/sku-catalog — composed SKUs, filtered + paginated. */
export async function fetchSkus(filters: SkuFilters = {}): Promise<SkuListResult> {
  const qs = new URLSearchParams()
  if (filters.search) qs.set('search', filters.search)
  if (filters.category) qs.set('category', filters.category)
  if (filters.productCode) qs.set('productCode', filters.productCode)
  if (filters.limit != null) qs.set('limit', String(filters.limit))
  if (filters.offset != null) qs.set('offset', String(filters.offset))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch<SkuListResult>(`/sku-catalog${suffix}`)
}
