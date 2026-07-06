'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth, useUser } from '@/contexts/AuthContext'
import { useBranch, useCurrentBranchId } from '@/contexts/BranchContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { DollarSign, TrendingUp, Calendar, CreditCard, Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/types'
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense,
  type ExpenseInput, type ExpenseFilters,
} from '@/lib/api/expenses'
import { ApiError } from '@/lib/api/client'
import { previewTotal, getCategoryBadgeVariant, getPaymentMethodIcon } from '@/lib/finance/helpers'

const CATEGORIES: ExpenseCategory[] = [
  'materials', 'utilities', 'labor', 'rent', 'maintenance',
  'transportation', 'office_supplies', 'marketing', 'other',
]
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'credit_card', 'cheque', 'promissory_note']

const catKey = (c: ExpenseCategory) => (c === 'office_supplies' ? 'officeSupplies' : c)
const pmKey = (m: PaymentMethod) =>
  m === 'bank_transfer' ? 'bankTransfer'
    : m === 'credit_card' ? 'creditCard'
    : m === 'promissory_note' ? 'promissoryNote'
    : m

const emptyForm: ExpenseInput = {
  category: 'materials',
  description: '',
  amount: undefined,
  vatAmount: undefined,
  branchId: '',
  paymentMethod: undefined,
  paymentDate: '',
  supplierId: '',
  jobOrderId: '',
  notes: '',
}

export default function ExpensesPage() {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch, availableBranches } = useBranch()
  const branchId = useCurrentBranchId()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExpenseInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: ExpenseFilters = {
        category: categoryFilter === 'all' ? undefined : (categoryFilter as ExpenseCategory),
        paymentMethod: paymentMethodFilter === 'all' ? undefined : (paymentMethodFilter as PaymentMethod),
      }
      const data = await fetchExpenses(filters)
      setExpenses(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, paymentMethodFilter, t])

  useEffect(() => { load() }, [load])

  const branchCode = (id: string) => availableBranches.find((b) => b.id === id)?.code || id

  // Client-side search only (server applied category/paymentMethod filters).
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return expenses.filter((expense) => {
      if (!q) return true
      return (
        expense.expenseNumber.toLowerCase().includes(q) ||
        expense.description.toLowerCase().includes(q) ||
        expense.category.toLowerCase().includes(q)
      )
    })
  }, [expenses, searchQuery])

  const summaryMetrics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0)
    const now = new Date()
    const thisMonth = filteredExpenses.filter((exp) => {
      const dateStr = exp.paymentDate ?? exp.createdAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const thisMonthTotal = thisMonth.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0)

    const categoryCounts = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      totalExpenses: total,
      monthlyExpenses: thisMonthTotal,
      expenseCount: filteredExpenses.length,
      topCategory: topCategory ? (topCategory[0] as ExpenseCategory) : null,
    }
  }, [filteredExpenses])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage))
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const set = (k: keyof ExpenseInput, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const numOrUndef = (v: any) => (v === undefined || v === '' ? undefined : Number(v))

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, branchId: branchId ?? '' })
    setFormError(null)
    setDialogOpen(true)
  }
  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setForm({
      category: e.category,
      description: e.description,
      amount: e.amount,
      vatAmount: e.vatAmount,
      branchId: e.branchId,
      paymentMethod: e.paymentMethod ?? undefined,
      paymentDate: e.paymentDate ? e.paymentDate.slice(0, 10) : '',
      supplierId: e.supplierId ?? '',
      jobOrderId: e.jobOrderId ?? '',
      notes: e.notes ?? '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.category) { setFormError(t('saveFailed')); return }
    if (!form.description.trim()) { setFormError(t('saveFailed')); return }
    setSaving(true)
    try {
      const payload: ExpenseInput = {
        category: form.category,
        description: form.description.trim(),
        amount: numOrUndef(form.amount) ?? 0,
        vatAmount: numOrUndef(form.vatAmount),
        branchId: form.branchId || (branchId ?? ''),
        paymentMethod: form.paymentMethod || undefined,
        paymentDate: form.paymentDate ? new Date(form.paymentDate).toISOString() : undefined,
        supplierId: form.supplierId ? form.supplierId : null,
        jobOrderId: form.jobOrderId ? form.jobOrderId : null,
        notes: form.notes ? form.notes : null,
      }
      if (editingId) await updateExpense(editingId, payload)
      else await createExpense(payload)
      setDialogOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteExpense(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveFailed'))
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('expenses')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addExpense')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {t('expenses')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryMetrics.expenseCount} {tCommon('items')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('thisMonth')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.monthlyExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('current')} {tCommon('month')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('topCategory')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryMetrics.topCategory
                ? t(`categories.${catKey(summaryMetrics.topCategory)}` as any)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('mostCommon')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('currentBranch')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentBranch?.code || 'ALL'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentBranch?.name || tCommon('allBranches')}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('search')}</label>
              <Input
                placeholder={tCommon('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('category')}</label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`categories.${catKey(c)}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('paymentMethod')}</label>
              <Select value={paymentMethodFilter} onValueChange={(v) => { setPaymentMethodFilter(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`paymentMethods.${pmKey(m)}` as any)}</SelectItem>
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

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('expenses')} {tCommon('list')}</CardTitle>
          <CardDescription>
            {tCommon('showing')} {paginatedExpenses.length} {tCommon('of')} {filteredExpenses.length} {t('expenses').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('expenseNumber')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('paymentMethod')}</TableHead>
                  <TableHead>{t('paymentDate')}</TableHead>
                  {user?.role !== 'user' && <TableHead>{tCommon('branch')}</TableHead>}
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : paginatedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {tCommon('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.expenseNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(expense.category)}>
                          {t(`categories.${catKey(expense.category)}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell className="font-semibold">
                        ฿{(expense.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {getPaymentMethodIcon(expense.paymentMethod)}
                          {expense.paymentMethod
                            ? t(`paymentMethods.${pmKey(expense.paymentMethod)}` as any)
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {expense.paymentDate ? new Date(expense.paymentDate).toLocaleDateString() : '-'}
                      </TableCell>
                      {user?.role !== 'user' && (
                        <TableCell>
                          <Badge variant="outline">{branchCode(expense.branchId)}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('update') && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} title={tCommon('edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('delete') && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(expense)} title={tCommon('delete')}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogTitle>{editingId ? t('editExpense') : t('addExpense')}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('category')} *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`categories.${catKey(c)}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('paymentMethod')}</Label>
              <Select value={form.paymentMethod ?? ''} onValueChange={(v) => set('paymentMethod', v)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`paymentMethods.${pmKey(m)}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('description')} *</Label>
              <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('amount')}</Label>
              <Input type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('vatAmount')}</Label>
              <Input type="number" min="0" step="0.01" value={form.vatAmount ?? ''} onChange={(e) => set('vatAmount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentDate')}</Label>
              <Input type="date" value={form.paymentDate ?? ''} onChange={(e) => set('paymentDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('totalAmount')}</Label>
              <Input value={`฿${previewTotal(numOrUndef(form.amount), numOrUndef(form.vatAmount)).toLocaleString()}`} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('supplier')}</Label>
              <Input value={form.supplierId ?? ''} onChange={(e) => set('supplierId', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('jobOrder')}</Label>
              <Input value={form.jobOrderId ?? ''} onChange={(e) => set('jobOrderId', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('notes')}</Label>
              <Input value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteExpenseConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{tCommon('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
