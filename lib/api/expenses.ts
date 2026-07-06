/**
 * Expenses API — backend /v1/expenses endpoints.
 * Branch scoping is enforced server-side from the caller's role/branches.
 *
 * NOTE: This module is an Architect INTERFACE STUB. Every exported function
 * throws NOT_IMPLEMENTED; the Implementer fills in the bodies (mirroring the
 * job-orders.ts pattern). Signatures, input/filter types, and normalize() are
 * final — build the page against these.
 */

import { apiFetch } from './client'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/types'

/**
 * Request body for creating/updating an expense.
 * Server computes `totalAmount = amount + vatAmount` and assigns `expenseNumber`
 * (EXP-YYYY-NNNN); do NOT send those. `category`, `description`, `branchId` are
 * required on create; all fields are optional on update (Partial<ExpenseInput>).
 */
export interface ExpenseInput {
  category: ExpenseCategory
  description: string
  amount?: number
  vatAmount?: number
  branchId: string
  paymentMethod?: PaymentMethod
  /** ISO date string (YYYY-MM-DD or full ISO). */
  paymentDate?: string
  supplierId?: string | null
  jobOrderId?: string | null
  notes?: string | null
}

/** Query filters for GET /expenses (branch scoping is applied server-side). */
export interface ExpenseFilters {
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
}

/**
 * pg NUMERIC fields (amount/vatAmount/totalAmount) come back as strings — coerce
 * to numbers so the page can do arithmetic (.toLocaleString(), reduce sums).
 */
function normalize(e: any): Expense {
  const num = (v: any) => (v != null ? Number(v) : v)
  return {
    ...e,
    amount: num(e.amount),
    vatAmount: num(e.vatAmount),
    totalAmount: num(e.totalAmount),
  }
}

/**
 * GET /v1/expenses?category=&paymentMethod= → { expenses: [...] }.
 * Returns the branch-scoped expense list for the current user.
 */
export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const qs = new URLSearchParams()
  if (filters.category) qs.set('category', filters.category)
  if (filters.paymentMethod) qs.set('paymentMethod', filters.paymentMethod)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ expenses: any[] }>(`/expenses${suffix}`)
  return (data.expenses || []).map(normalize)
}

/** POST /v1/expenses → created Expense (201). */
export async function createExpense(input: ExpenseInput): Promise<Expense> {
  return normalize(await apiFetch('/expenses', { method: 'POST', body: input }))
}

/** PUT /v1/expenses/:id → updated Expense. */
export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  return normalize(await apiFetch(`/expenses/${id}`, { method: 'PUT', body: input }))
}

/** DELETE /v1/expenses/:id — hard delete; backend returns { ok: true } (discarded). */
export async function deleteExpense(id: string): Promise<void> {
  await apiFetch(`/expenses/${id}`, { method: 'DELETE' })
}
