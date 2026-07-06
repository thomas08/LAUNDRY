/**
 * Pure, side-effect-free display/calculation helpers for the Finance pages.
 * Extracted from the page components so they can be unit-tested in isolation
 * (Next.js page modules may not export arbitrary named functions).
 */

import { CheckCircle, Clock, DollarSign, FileText } from 'lucide-react'
import type { ExpenseCategory, InvoiceStatus, PaymentMethod } from '@/lib/types'

/** Mirrors the server's totalAmount = amount + vatAmount (display preview only). */
export function previewTotal(amount?: number, vatAmount?: number): number {
  return (amount || 0) + (vatAmount || 0)
}

/** vatRate is stored as a fraction (0.07); convert for percent display/input. */
export const toPercent = (fraction: number) => fraction * 100
export const toFraction = (percent: number) => percent / 100

export function getCategoryBadgeVariant(category?: ExpenseCategory): 'default' | 'secondary' | 'outline' {
  if (category && ['materials', 'utilities'].includes(category)) return 'default'
  if (category && ['labor', 'rent'].includes(category)) return 'secondary'
  return 'outline'
}

export function getPaymentMethodIcon(method?: PaymentMethod | null): string {
  switch (method) {
    case 'cash': return '💵'
    case 'bank_transfer': return '🏦'
    case 'credit_card': return '💳'
    case 'cheque': return '📋'
    case 'promissory_note': return '📝'
    default: return '💰'
  }
}

export function getStatusBadgeVariant(status?: InvoiceStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'paid': return 'default'
    case 'issued': return 'secondary'
    case 'partially_paid': return 'outline'
    case 'overdue': return 'destructive'
    default: return 'outline'
  }
}

export function getStatusIcon(status?: InvoiceStatus) {
  switch (status) {
    case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'overdue': return <Clock className="h-4 w-4 text-red-500" />
    case 'partially_paid': return <DollarSign className="h-4 w-4 text-yellow-500" />
    case 'issued': return <FileText className="h-4 w-4 text-blue-500" />
    default: return <FileText className="h-4 w-4" />
  }
}
