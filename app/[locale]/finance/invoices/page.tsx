'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuth, useUser } from '@/contexts/AuthContext'
import { useBranch, useCurrentBranchId } from '@/contexts/BranchContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, DollarSign, Clock, CheckCircle, Plus, Edit, XCircle, Wallet, Loader2, AlertCircle , Receipt} from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { Customer, InvoiceStatus, JobOrder } from '@/lib/types'
import {
  fetchInvoices, createInvoice, updateInvoice, recordInvoicePayment,
  updateInvoiceStatus, cancelInvoice, type InvoiceRow, type InvoiceInput, type InvoiceFilters,
} from '@/lib/api/invoices'
import { fetchCustomers } from '@/lib/api/customers'
import { fetchJobOrders } from '@/lib/api/job-orders'
import { ApiError } from '@/lib/api/client'
import { toPercent, toFraction, getStatusBadgeVariant, getStatusIcon } from '@/lib/finance/helpers'

const STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled']
const statusKey = (s: InvoiceStatus) => (s === 'partially_paid' ? 'partiallyPaid' : s)

interface InvoiceFormState {
  customerId: string
  jobOrderIds: string[]
  vatPercent: string
  discount: string
  issuedDate: string
  dueDate: string
  notes: string
}

const emptyForm: InvoiceFormState = {
  customerId: '',
  jobOrderIds: [],
  vatPercent: '7',
  discount: '',
  issuedDate: '',
  dueDate: '',
  notes: '',
}

export default function InvoicesPage() {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tEmpty = useTranslations('empty')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch, availableBranches } = useBranch()
  const branchId = useCurrentBranchId()

  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceFormState>(emptyForm)
  const [customerOrders, setCustomerOrders] = useState<JobOrder[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [paymentTarget, setPaymentTarget] = useState<InvoiceRow | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const [cancelTarget, setCancelTarget] = useState<InvoiceRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: InvoiceFilters = {
        status: statusFilter === 'all' ? undefined : (statusFilter as InvoiceStatus),
      }
      const [inv, cus] = await Promise.all([fetchInvoices(filters), fetchCustomers()])
      setInvoices(inv)
      setCustomers(cus)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => { load() }, [load])

  const branchCode = (id: string) => availableBranches.find((b) => b.id === id)?.code || id
  const customerName = (inv: InvoiceRow) =>
    inv.customerName ?? customers.find((c) => c.id === inv.customerId)?.name ?? '-'

  // Client-side search only (server applied the status filter).
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (!q) return true
      return (
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        (invoice.customerName ?? '').toLowerCase().includes(q)
      )
    })
  }, [invoices, searchQuery])

  const summaryMetrics = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const outstanding = filteredInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0)
    const paid = filteredInvoices.filter((inv) => inv.status === 'paid').length
    const overdue = filteredInvoices.filter((inv) => inv.status === 'overdue').length
    return { totalValue: total, outstandingAmount: outstanding, paidInvoices: paid, overdueInvoices: overdue }
  }, [filteredInvoices])

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage))
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const set = (k: keyof InvoiceFormState, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const numOrUndef = (v: any) => (v === undefined || v === '' ? undefined : Number(v))

  const loadCustomerOrders = useCallback(async (customerId: string) => {
    if (!customerId) { setCustomerOrders([]); return }
    try {
      const orders = await fetchJobOrders({ customerId })
      setCustomerOrders(orders.filter((o) => o.status !== 'cancelled'))
    } catch {
      setCustomerOrders([])
    }
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setCustomerOrders([])
    setFormError(null)
    setDialogOpen(true)
  }
  const openEdit = (inv: InvoiceRow) => {
    setEditingId(inv.id)
    setForm({
      customerId: inv.customerId,
      jobOrderIds: inv.jobOrderIds ?? [],
      vatPercent: inv.vatRate != null ? String(toPercent(inv.vatRate)) : '7',
      discount: inv.discount != null ? String(inv.discount) : '',
      issuedDate: inv.issuedDate ? inv.issuedDate.slice(0, 10) : '',
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      notes: inv.notes ?? '',
    })
    setFormError(null)
    setDialogOpen(true)
    loadCustomerOrders(inv.customerId)
  }

  const onSelectCustomer = (customerId: string) => {
    setForm((f) => ({ ...f, customerId, jobOrderIds: [] }))
    loadCustomerOrders(customerId)
  }
  const toggleJobOrder = (id: string) => {
    setForm((f) => ({
      ...f,
      jobOrderIds: f.jobOrderIds.includes(id)
        ? f.jobOrderIds.filter((x) => x !== id)
        : [...f.jobOrderIds, id],
    }))
  }

  const save = async () => {
    setFormError(null)
    if (!form.customerId) { setFormError(t('selectCustomer')); return }
    setSaving(true)
    try {
      const percent = numOrUndef(form.vatPercent)
      const payload: InvoiceInput = {
        customerId: form.customerId,
        branchId: branchId ?? '',
        jobOrderIds: form.jobOrderIds,
        vatRate: percent != null ? toFraction(percent) : undefined,
        discount: numOrUndef(form.discount) ?? 0,
        issuedDate: form.issuedDate ? new Date(form.issuedDate).toISOString() : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes ? form.notes : null,
      }
      if (editingId) await updateInvoice(editingId, payload)
      else await createInvoice(payload)
      setDialogOpen(false)
      toast.success(editingId ? tCommon('saved') : tCommon('created'))
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (inv: InvoiceRow, status: InvoiceStatus) => {
    try {
      await updateInvoiceStatus(inv.id, status)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveFailed'))
    }
  }

  const openPayment = (inv: InvoiceRow) => {
    setPaymentTarget(inv)
    setPaymentAmount('')
    setPaymentError(null)
  }
  const submitPayment = async () => {
    if (!paymentTarget) return
    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) { setPaymentError(t('saveFailed')); return }
    setPaying(true)
    try {
      await recordInvoicePayment(paymentTarget.id, amount)
      setPaymentTarget(null)
      await load()
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : t('saveFailed'))
    } finally {
      setPaying(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelInvoice(cancelTarget.id)
      setCancelTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveFailed'))
      setCancelTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('invoices')}</h1>
          <p className="text-muted-foreground">{t('invoicesSubtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button onClick={openCreate} disabled={customers.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createInvoice')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {tCommon('value')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.length} {t('invoices').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('outstanding')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.outstandingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('unpaid')} {tCommon('amount')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invoiceStatus.paid')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryMetrics.paidInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('completed')} {t('invoices').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invoiceStatus.overdue')}</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryMetrics.overdueInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('needsAttention')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{tCommon('filters')}</CardTitle>
          <CardDescription>{tCommon('filterDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('search')}</label>
              <Input
                placeholder={`${tCommon('searchBy')} ${t('invoiceNumber')} ${tCommon('or')} ${tCommon('customer')}`}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('status')}</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`invoiceStatus.${statusKey(s)}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoices')} {tCommon('list')}</CardTitle>
          <CardDescription>
            {tCommon('showing')} {paginatedInvoices.length} {tCommon('of')} {filteredInvoices.length} {t('invoices').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoiceNumber')}</TableHead>
                  <TableHead>{tCommon('customer')}</TableHead>
                  <TableHead>{t('issuedDate')}</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead>{t('totalAmount')}</TableHead>
                  <TableHead>{t('paidAmount')}</TableHead>
                  <TableHead>{t('remainingAmount')}</TableHead>
                  <TableHead className="w-[160px]">{tCommon('status')}</TableHead>
                  {user?.role !== 'user' && <TableHead>{tCommon('branch')}</TableHead>}
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      {invoices.length === 0 ? (
                        <EmptyState
                          icon={Receipt}
                          title={tEmpty('invoicesTitle')}
                          description={tEmpty('invoicesDesc')}
                          actionLabel={hasPermission('create') ? tEmpty('invoicesAction') : undefined}
                          onAction={openCreate}
                        />
                      ) : (
                        <EmptyState icon={Receipt} title={tEmpty('noResultsTitle')} description={tEmpty('noResultsDesc')} />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{customerName(invoice)}</TableCell>
                      <TableCell>{invoice.issuedDate ? new Date(invoice.issuedDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                        {invoice.status === 'overdue' && invoice.dueDate && (
                          <span className="ml-2 text-xs text-red-500">
                            ({Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))}d {t('invoiceStatus.overdue')})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ฿{(invoice.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        ฿{(invoice.paidAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={invoice.remainingAmount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                        ฿{(invoice.remainingAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {hasPermission('update') && invoice.status !== 'cancelled' ? (
                          <Select value={invoice.status} onValueChange={(v) => changeStatus(invoice, v as InvoiceStatus)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{t(`invoiceStatus.${statusKey(s)}` as any)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invoice.status)}
                            <Badge variant={getStatusBadgeVariant(invoice.status)}>
                              {t(`invoiceStatus.${statusKey(invoice.status)}` as any)}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      {user?.role !== 'user' && (
                        <TableCell>
                          <Badge variant="outline">{branchCode(invoice.branchId)}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('update') && invoice.status !== 'cancelled' && (
                            <Button variant="ghost" size="icon" onClick={() => openPayment(invoice)} title={t('recordPayment')}>
                              <Wallet className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('update') && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(invoice)} title={tCommon('edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('delete') && invoice.status !== 'cancelled' && (
                            <Button variant="ghost" size="icon" onClick={() => setCancelTarget(invoice)} title={t('cancelInvoiceConfirm')}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {tCommon('page')} {currentPage} {tCommon('of')} {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {tCommon('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {tCommon('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('editInvoice') : t('createInvoice')}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{tCommon('customer')} *</Label>
              <Select value={form.customerId} onValueChange={onSelectCustomer}>
                <SelectTrigger><SelectValue placeholder={t('selectCustomer')} /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>{t('selectJobOrders')}</Label>
              {form.customerId === '' ? (
                <p className="text-sm text-muted-foreground">{t('selectCustomer')}</p>
              ) : customerOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                  {customerOrders.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.jobOrderIds.includes(o.id)}
                        onCheckedChange={() => toggleJobOrder(o.id)}
                      />
                      <span className="font-mono">{o.orderNumber}</span>
                      <span className="ml-auto">฿{(o.totalPrice || 0).toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('vatRate')} (%)</Label>
              <Input type="number" min="0" step="0.01" value={form.vatPercent} onChange={(e) => set('vatPercent', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('discount')}</Label>
              <Input type="number" min="0" step="0.01" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('issuedDate')}</Label>
              <Input type="date" value={form.issuedDate} onChange={(e) => set('issuedDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('dueDate')}</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('notes')}</Label>
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{tCommon('cancel')}</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={!!paymentTarget} onOpenChange={(open) => { if (!open) setPaymentTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('recordPayment')}</DialogTitle>
          </DialogHeader>
          {paymentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>{t('paymentAmount')}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            {paymentTarget && (
              <p className="text-xs text-muted-foreground">
                {t('remainingAmount')}: ฿{(paymentTarget.remainingAmount || 0).toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentTarget(null)} disabled={paying}>{tCommon('cancel')}</Button>
            <Button onClick={submitPayment} disabled={paying}>
              {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cancelInvoiceConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
