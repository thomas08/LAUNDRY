'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuth, useUser } from '@/contexts/AuthContext'
import { useCurrentBranchId, useBranch } from '@/contexts/BranchContext'
import type { Customer, JobOrder, JobOrderStatus, ServiceType } from '@/lib/types'
import { fetchCustomers } from '@/lib/api/customers'
import {
  fetchJobOrders, createJobOrder, updateJobOrder, updateJobOrderStatus, cancelJobOrder,
  type JobOrderInput,
} from '@/lib/api/job-orders'
import { ApiError } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/EmptyState'
import { Link } from '@/lib/navigation'
import {
  FileText, Clock, CheckCircle2, Plus, Edit, XCircle, Loader2, AlertCircle, Package,
} from 'lucide-react'

const STATUSES: JobOrderStatus[] = [
  'pending', 'in_progress', 'washing', 'drying', 'ironing', 'quality_check', 'completed', 'delivered', 'cancelled',
]
const SERVICE_TYPES: ServiceType[] = ['wash_fold', 'dry_clean', 'iron_only', 'wash_iron', 'express']

const statusKey = (s: JobOrderStatus) =>
  s === 'in_progress' ? 'inProgress' : s === 'quality_check' ? 'qualityCheck' : s
const serviceKey = (s: ServiceType) =>
  s === 'wash_fold' ? 'washFold' : s === 'dry_clean' ? 'dryClean' : s === 'iron_only' ? 'ironOnly' : s === 'wash_iron' ? 'washIron' : s

function statusVariant(s: JobOrderStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (s === 'completed' || s === 'delivered') return 'default'
  if (s === 'cancelled') return 'destructive'
  if (['washing', 'drying', 'ironing', 'quality_check'].includes(s)) return 'secondary'
  return 'outline'
}

const emptyForm: JobOrderInput = {
  customerId: '', branchId: '', serviceType: 'wash_fold',
  weight: undefined, itemCount: undefined, dueDate: '', servicePrice: undefined,
  additionalCharges: undefined, discount: undefined, notes: '',
}

export default function JobOrdersPage() {
  const t = useTranslations('operations')
  const tc = useTranslations('common')
  const tEmpty = useTranslations('empty')
  const { hasPermission } = useAuth()
  const user = useUser()
  const branchId = useCurrentBranchId()
  const { availableBranches } = useBranch()

  const [orders, setOrders] = useState<JobOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<JobOrderInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [o, c] = await Promise.all([fetchJobOrders(), fetchCustomers()])
      setOrders(o)
      setCustomers(c)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || id

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      const name = o.customerName ?? customerName(o.customerId)
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const matchService = serviceFilter === 'all' || o.serviceType === serviceFilter
      return matchSearch && matchStatus && matchService
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, customers, search, statusFilter, serviceFilter])

  const summary = useMemo(() => {
    const active = filtered.filter((o) => !['completed', 'delivered', 'cancelled'].includes(o.status)).length
    const pending = filtered.filter((o) => o.status === 'pending').length
    const completed = filtered.filter((o) => ['completed', 'delivered'].includes(o.status)).length
    return { total: filtered.length, active, pending, completed }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage)
  const branchCode = (id: string) => availableBranches.find((b) => b.id === id)?.code || id

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, branchId: branchId ?? '' })
    setFormError(null)
    setDialogOpen(true)
  }
  const openEdit = (o: JobOrder) => {
    setEditingId(o.id)
    setForm({
      customerId: o.customerId, branchId: o.branchId, serviceType: o.serviceType,
      weight: o.weight, itemCount: o.itemCount,
      dueDate: o.dueDate ? o.dueDate.slice(0, 10) : '',
      servicePrice: o.servicePrice, additionalCharges: o.additionalCharges,
      discount: o.discount, notes: o.notes ?? '',
    })
    setFormError(null)
    setDialogOpen(true)
  }
  const set = (k: keyof JobOrderInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const numOrNull = (v: any) => (v === undefined || v === '' ? null : Number(v))

  const save = async () => {
    setFormError(null)
    if (!form.customerId) { setFormError(t('customerRequired')); return }
    if (!form.branchId) { setForm((f) => ({ ...f, branchId: branchId ?? '' })) }
    setSaving(true)
    try {
      const payload: JobOrderInput = {
        ...form,
        branchId: form.branchId || (branchId ?? ''),
        weight: numOrNull(form.weight) ?? 0,
        itemCount: numOrNull(form.itemCount) ?? 0,
        servicePrice: numOrNull(form.servicePrice) ?? 0,
        additionalCharges: numOrNull(form.additionalCharges) ?? 0,
        discount: numOrNull(form.discount) ?? 0,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }
      if (editingId) await updateJobOrder(editingId, payload)
      else await createJobOrder(payload)
      setDialogOpen(false)
      toast.success(editingId ? tc('saved') : tc('created'))
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (o: JobOrder, status: JobOrderStatus) => {
    try {
      await updateJobOrderStatus(o.id, status)
      toast.success(tc('saved'))
      await load()
    } catch {
      setLoadError(t('saveError'))
    }
  }

  const cancel = async (o: JobOrder) => {
    if (!confirm(t('confirmCancel', { number: o.orderNumber }))) return
    try {
      await cancelJobOrder(o.id)
      await load()
    } catch {
      setLoadError(t('cancelError'))
    }
  }

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('jobOrders')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button onClick={openCreate} disabled={customers.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createJobOrder')}
          </Button>
        )}
      </div>

      {customers.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t('noCustomers')}</span>
            {/* The warning used to be a dead end — give it the way out. */}
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/customers">{tEmpty('jobOrdersNeedCustomer')}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={`${tc('total')} ${t('jobOrders')}`} value={summary.total} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label={tc('active')} value={summary.active} icon={<Loader2 className="h-4 w-4 text-blue-500" />} valueClass="text-blue-600" />
        <SummaryCard label={t('jobStatus.pending')} value={summary.pending} icon={<Clock className="h-4 w-4 text-orange-500" />} valueClass="text-orange-600" />
        <SummaryCard label={t('jobStatus.completed')} value={summary.completed} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} valueClass="text-green-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>{tc('filters')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Input placeholder={tc('searchPlaceholder')} value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage() }} />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage() }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`jobStatus.${statusKey(s)}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); resetPage() }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{t(`serviceTypes.${serviceKey(s)}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>{t('jobOrders')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orderNumber')}</TableHead>
                  <TableHead>{tc('customer')}</TableHead>
                  <TableHead>{t('serviceType')}</TableHead>
                  <TableHead className="text-right">{t('weight')}</TableHead>
                  <TableHead className="text-right">{t('itemCount')}</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead className="text-right">{t('totalPrice')}</TableHead>
                  <TableHead className="w-[150px]">{tc('status')}</TableHead>
                  {user?.role !== 'user' && <TableHead>{tc('branch')}</TableHead>}
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      {orders.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title={tEmpty('jobOrdersTitle')}
                          description={tEmpty('jobOrdersDesc')}
                          actionLabel={customers.length === 0 ? tEmpty('jobOrdersNeedCustomer') : tEmpty('jobOrdersAction')}
                          actionHref={customers.length === 0 ? '/customers' : undefined}
                          onAction={customers.length === 0 ? undefined : openCreate}
                        />
                      ) : (
                        <EmptyState
                          icon={FileText}
                          title={tEmpty('noResultsTitle')}
                          description={tEmpty('noResultsDesc')}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono font-medium">{o.orderNumber}</TableCell>
                      <TableCell>{o.customerName ?? customerName(o.customerId)}</TableCell>
                      <TableCell><Badge variant="outline">{t(`serviceTypes.${serviceKey(o.serviceType)}`)}</Badge></TableCell>
                      <TableCell className="text-right">{o.weight} kg</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{o.itemCount}</span>
                      </TableCell>
                      <TableCell>{o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-right font-semibold">฿{o.totalPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        {hasPermission('update') && o.status !== 'cancelled' ? (
                          <Select value={o.status} onValueChange={(v) => changeStatus(o, v as JobOrderStatus)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`jobStatus.${statusKey(s)}`)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={statusVariant(o.status)}>{t(`jobStatus.${statusKey(o.status)}`)}</Badge>
                        )}
                      </TableCell>
                      {user?.role !== 'user' && <TableCell><Badge variant="outline">{branchCode(o.branchId)}</Badge></TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('update') && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title={tc('edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('delete') && o.status !== 'cancelled' && (
                            <Button variant="ghost" size="icon" onClick={() => cancel(o)} title={t('cancelOrder')}>
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

          {filtered.length > perPage && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {tc('showing')} {pageItems.length} {tc('of')} {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>{tc('previous')}</Button>
                <span className="px-2 text-sm">{tc('page')} {page} {tc('of')} {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>{tc('next')}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? t('editJobOrder') : t('createJobOrder')}</DialogTitle></DialogHeader>

          {formError && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{tc('customer')} *</Label>
              <Select value={form.customerId} onValueChange={(v) => set('customerId', v)}>
                <SelectTrigger><SelectValue placeholder={t('selectCustomer')} /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('serviceType')}</Label>
              <Select value={form.serviceType} onValueChange={(v) => set('serviceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{t(`serviceTypes.${serviceKey(s)}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('dueDate')}</Label>
              <Input type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('weightKg')}</Label>
              <Input type="number" min="0" step="0.1" value={form.weight ?? ''} onChange={(e) => set('weight', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('itemCount')}</Label>
              <Input type="number" min="0" value={form.itemCount ?? ''} onChange={(e) => set('itemCount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('servicePrice')}</Label>
              <Input type="number" min="0" step="0.01" value={form.servicePrice ?? ''} onChange={(e) => set('servicePrice', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('additionalCharges')}</Label>
              <Input type="number" min="0" step="0.01" value={form.additionalCharges ?? ''} onChange={(e) => set('additionalCharges', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('discount')}</Label>
              <Input type="number" min="0" step="0.01" value={form.discount ?? ''} onChange={(e) => set('discount', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('notes')}</Label>
              <Input value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{tc('cancel')}</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ label, value, icon, valueClass }: { label: string; value: React.ReactNode; icon: React.ReactNode; valueClass?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent><div className={`text-2xl font-bold ${valueClass ?? ''}`}>{value}</div></CardContent>
    </Card>
  )
}
