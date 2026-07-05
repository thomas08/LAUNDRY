/**
 * Linen Article (SKU master) API — backend /v1/articles endpoints.
 * Uses the shared apiFetch client (Bearer token + silent refresh).
 */

import { apiFetch } from './client'
import type { LinenArticle, LinenCategory, LinenOwnership } from '@/lib/types'

export interface ArticleInput {
  code: string
  name: string
  nameEn?: string | null
  nameTh?: string | null
  category: LinenCategory
  size?: string | null
  color?: string | null
  weightGrams?: number | null
  defaultOwnership?: LinenOwnership
  unitPrice?: number | null
  parLevel?: number | null
  branchId?: string | null
}

// pg NUMERIC (unit_price) comes back as a string — coerce numeric fields to numbers.
function normalize(a: any): LinenArticle {
  return {
    ...a,
    unitPrice: a.unitPrice != null ? Number(a.unitPrice) : undefined,
    weightGrams: a.weightGrams != null ? Number(a.weightGrams) : undefined,
    parLevel: a.parLevel != null ? Number(a.parLevel) : undefined,
  }
}

/** GET /v1/articles — active articles for a branch (+ global). */
export async function fetchArticles(branchId?: string): Promise<LinenArticle[]> {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  const data = await apiFetch<{ articles: any[] }>(`/articles${qs}`)
  return (data.articles || []).map(normalize)
}

export async function createArticle(input: ArticleInput): Promise<LinenArticle> {
  return normalize(await apiFetch('/articles', { method: 'POST', body: input }))
}

export async function updateArticle(
  id: string,
  input: Partial<ArticleInput>
): Promise<LinenArticle> {
  return normalize(await apiFetch(`/articles/${id}`, { method: 'PUT', body: input }))
}

/** DELETE /v1/articles/:id — soft delete (deactivate). */
export async function deleteArticle(id: string): Promise<LinenArticle> {
  return normalize(await apiFetch(`/articles/${id}`, { method: 'DELETE' }))
}
