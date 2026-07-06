/**
 * Invoices API — backend /v1/invoices endpoints.
 * Branch scoping is enforced server-side from the caller's role/branches.
 *
 * NOTE: This module is an Architect INTERFACE STUB. Every exported function
 * throws NOT_IMPLEMENTED; the Implementer fills in the bodies (mirroring the
 * job-orders.ts pattern). Signatures, types, and normalize() are final.
 */

import { apiFetch } from './client'
import type { Invoice, InvoiceStatus } from '@/lib/types'

/**
 * Backend invoice shape. Extends the domain `Invoice` with two JOIN/audit fields
 * the backend returns but `lib/types.ts` omits:
 *  - `customerName`: denormalized from the customers JOIN (nullable if unmatched).
 *  - `createdBy`: user id that created the invoice.
 * Use this as the return type instead of bare `Invoice`.
 */
export type InvoiceRow = Invoice & {
  customerName?: string | null
  createdBy?: string
}

/**
 * Request body for creating an invoice.
 * Server computes subtotal (SUM of linked non-cancelled job orders' total_price
 * for the same customer), vatAmount (subtotal * vatRate), totalAmount, status
 * (defaults 'issued'), and invoiceNumber (INV-YYYY-NNNN); do NOT send those.
 * `customerId` and `branchId` are required.
 *
 * IMPORTANT: `vatRate` is a FRACTION (e.g. 0.07 for 7%), NOT a percentage.
 * Defaults to 0.07 server-side when omitted.
 */
export interface InvoiceInput {
  customerId: string
  branchId: string
  jobOrderIds?: string[]
  vatRate?: number
  discount?: number
  /** ISO date string. */
  issuedDate?: string
  /** ISO date string. */
  dueDate?: string
  notes?: string | null
}

/** Query filters for GET /invoices (branch scoping is applied server-side). */
export interface InvoiceFilters {
  status?: InvoiceStatus
  customerId?: string
}

/**
 * pg NUMERIC money/rate fields come back as strings — coerce to numbers.
 * `jobOrderIds` is already an array; `customerName`/`createdBy` pass through.
 */
function normalize(i: any): InvoiceRow {
  const num = (v: any) => (v != null ? Number(v) : v)
  return {
    ...i,
    subtotal: num(i.subtotal),
    vatRate: num(i.vatRate),
    vatAmount: num(i.vatAmount),
    discount: num(i.discount),
    totalAmount: num(i.totalAmount),
    paidAmount: num(i.paidAmount),
    remainingAmount: num(i.remainingAmount),
  }
}

/** GET /v1/invoices?status=&customerId= → { invoices: [...] }. Branch-scoped. */
export async function fetchInvoices(filters: InvoiceFilters = {}): Promise<InvoiceRow[]> {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.customerId) qs.set('customerId', filters.customerId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ invoices: any[] }>(`/invoices${suffix}`)
  return (data.invoices || []).map(normalize)
}

/** GET /v1/invoices/:id → InvoiceRow. */
export async function fetchInvoice(id: string): Promise<InvoiceRow> {
  return normalize(await apiFetch(`/invoices/${id}`))
}

/** POST /v1/invoices → created InvoiceRow (201). */
export async function createInvoice(input: InvoiceInput): Promise<InvoiceRow> {
  return normalize(await apiFetch('/invoices', { method: 'POST', body: input }))
}

/** PUT /v1/invoices/:id → updated InvoiceRow (recomputes amounts). */
export async function updateInvoice(id: string, input: Partial<InvoiceInput>): Promise<InvoiceRow> {
  return normalize(await apiFetch(`/invoices/${id}`, { method: 'PUT', body: input }))
}

/**
 * PATCH /v1/invoices/:id/payment body { amount } → updated InvoiceRow.
 * `amount` must be > 0; server adds it to paidAmount and recomputes
 * remainingAmount + status (paid / partially_paid).
 */
export async function recordInvoicePayment(id: string, amount: number): Promise<InvoiceRow> {
  return normalize(await apiFetch(`/invoices/${id}/payment`, { method: 'PATCH', body: { amount } }))
}

/** PATCH /v1/invoices/:id/status body { status } → updated InvoiceRow. */
export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<InvoiceRow> {
  return normalize(await apiFetch(`/invoices/${id}/status`, { method: 'PATCH', body: { status } }))
}

/** DELETE /v1/invoices/:id — cancels the invoice (status = 'cancelled'). */
export async function cancelInvoice(id: string): Promise<InvoiceRow> {
  return normalize(await apiFetch(`/invoices/${id}`, { method: 'DELETE' }))
}
