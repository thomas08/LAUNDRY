/**
 * Suppliers API — backend /v1/suppliers endpoints.
 * Mirrors lib/api/customers.ts (apiFetch + normalize + `{ suppliers }` envelope).
 *
 * Suppliers are ORG-GLOBAL (no branchId). RBAC is by permission only.
 */

import { apiFetch } from './client'
import type { Supplier } from '@/lib/types'

export interface SupplierInput {
  name: string
  nameTh?: string | null
  nameEn?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  taxId?: string | null
  paymentTerms?: number | null
  // NOTE: no `code` (server generates SUP-####) and no `branchId` (org-global).
}

export interface SupplierListOptions {
  includeInactive?: boolean
}

// Build the querystring for GET /suppliers. Empty string when no options set.
// Testable seam: buildSuppliersQuery({}) === '' ; ({ includeInactive: true }) === '?includeInactive=true'
export function buildSuppliersQuery(opts: SupplierListOptions = {}): string {
  const params = new URLSearchParams()
  if (opts.includeInactive) params.set('includeInactive', 'true')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// pg may return NULLs for optional text cols and payment_terms; coerce to the
// shape lib/types.ts `Supplier` expects (required strings default to '',
// optionals to undefined, paymentTerms to a number).
export function normalize(s: any): Supplier {
  return {
    ...s,
    nameTh: s.nameTh ?? undefined,
    nameEn: s.nameEn ?? undefined,
    contactPerson: s.contactPerson ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    address: s.address ?? '',
    taxId: s.taxId ?? undefined,
    paymentTerms: s.paymentTerms != null ? Number(s.paymentTerms) : undefined,
    isActive: Boolean(s.isActive),
  }
}

// --- Request functions: ARCHITECT STUBS (Implementer to fill) ---

/** GET /v1/suppliers — returns the `{ suppliers }` envelope, mapped through normalize(). */
export async function fetchSuppliers(opts: SupplierListOptions = {}): Promise<Supplier[]> {
  const data = await apiFetch<{ suppliers: any[] }>(`/suppliers${buildSuppliersQuery(opts)}`)
  return (data.suppliers || []).map(normalize)
}

/** GET /v1/suppliers/:id — single object (no envelope). */
export async function fetchSupplier(id: string): Promise<Supplier> {
  return normalize(await apiFetch(`/suppliers/${id}`))
}

/** POST /v1/suppliers — returns the created supplier (201). */
export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  return normalize(await apiFetch('/suppliers', { method: 'POST', body: input }))
}

/** PUT /v1/suppliers/:id — returns the updated supplier. */
export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  return normalize(await apiFetch(`/suppliers/${id}`, { method: 'PUT', body: input }))
}

/** DELETE /v1/suppliers/:id — soft delete (deactivate); returns the deactivated supplier. */
export async function deleteSupplier(id: string): Promise<Supplier> {
  return normalize(await apiFetch(`/suppliers/${id}`, { method: 'DELETE' }))
}
