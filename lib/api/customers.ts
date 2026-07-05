/**
 * Customers API — backend /v1/customers endpoints.
 * Branch scoping is enforced server-side from the caller's role/branches.
 */

import { apiFetch } from './client'
import type { Customer, CustomerType } from '@/lib/types'

export interface CustomerInput {
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  customerType?: CustomerType
  taxId?: string | null
  creditLimit?: number | null
  paymentTerms?: number | null
  branchId: string
}

// pg NUMERIC (credit_limit/current_balance) comes back as strings — coerce.
function normalize(c: any): Customer {
  return {
    ...c,
    creditLimit: c.creditLimit != null ? Number(c.creditLimit) : undefined,
    currentBalance: c.currentBalance != null ? Number(c.currentBalance) : undefined,
    paymentTerms: c.paymentTerms != null ? Number(c.paymentTerms) : undefined,
  }
}

export async function fetchCustomers(): Promise<Customer[]> {
  const data = await apiFetch<{ customers: any[] }>('/customers')
  return (data.customers || []).map(normalize)
}

export async function fetchCustomer(id: string): Promise<Customer> {
  return normalize(await apiFetch(`/customers/${id}`))
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  return normalize(await apiFetch('/customers', { method: 'POST', body: input }))
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  return normalize(await apiFetch(`/customers/${id}`, { method: 'PUT', body: input }))
}

/** DELETE /v1/customers/:id — soft delete (deactivate). */
export async function deleteCustomer(id: string): Promise<Customer> {
  return normalize(await apiFetch(`/customers/${id}`, { method: 'DELETE' }))
}
