/**
 * Job Orders API — backend /v1/job-orders endpoints.
 * Branch scoping + total-price calculation are enforced server-side.
 */

import { apiFetch } from './client'
import type { JobOrder, JobOrderStatus, ServiceType } from '@/lib/types'

export interface JobOrderInput {
  customerId: string
  branchId: string
  serviceType: ServiceType
  weight?: number
  itemCount?: number
  receivedAt?: string
  dueDate?: string | null
  servicePrice?: number
  additionalCharges?: number
  discount?: number
  assignedTo?: string | null
  notes?: string | null
}

// pg NUMERIC fields come back as strings — coerce to numbers.
function normalize(j: any): JobOrder {
  const num = (v: any) => (v != null ? Number(v) : v)
  return {
    ...j,
    weight: num(j.weight),
    itemCount: num(j.itemCount),
    servicePrice: num(j.servicePrice),
    additionalCharges: num(j.additionalCharges),
    discount: num(j.discount),
    totalPrice: num(j.totalPrice),
  }
}

export interface JobOrderFilters {
  status?: JobOrderStatus
  serviceType?: ServiceType
  customerId?: string
}

export async function fetchJobOrders(filters: JobOrderFilters = {}): Promise<JobOrder[]> {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.serviceType) qs.set('serviceType', filters.serviceType)
  if (filters.customerId) qs.set('customerId', filters.customerId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ jobOrders: any[] }>(`/job-orders${suffix}`)
  return (data.jobOrders || []).map(normalize)
}

export async function fetchJobOrder(id: string): Promise<JobOrder> {
  return normalize(await apiFetch(`/job-orders/${id}`))
}

export async function createJobOrder(input: JobOrderInput): Promise<JobOrder> {
  return normalize(await apiFetch('/job-orders', { method: 'POST', body: input }))
}

export async function updateJobOrder(id: string, input: Partial<JobOrderInput>): Promise<JobOrder> {
  return normalize(await apiFetch(`/job-orders/${id}`, { method: 'PUT', body: input }))
}

export async function updateJobOrderStatus(id: string, status: JobOrderStatus): Promise<JobOrder> {
  return normalize(await apiFetch(`/job-orders/${id}/status`, { method: 'PATCH', body: { status } }))
}

/** DELETE /v1/job-orders/:id — cancels the order (status = cancelled). */
export async function cancelJobOrder(id: string): Promise<JobOrder> {
  return normalize(await apiFetch(`/job-orders/${id}`, { method: 'DELETE' }))
}
