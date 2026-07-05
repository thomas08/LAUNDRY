'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Customer, CustomerType } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import {
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerInput,
} from '@/lib/api/customers'
import { ApiError } from '@/lib/api/client'
import { CustomerDataTable } from '@/components/CustomerDataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Loader2, AlertCircle } from 'lucide-react'

const TYPES: CustomerType[] = ['hotel', 'hospital', 'resort', 'restaurant', 'individual', 'other']

const emptyForm: CustomerInput = {
  name: '', contactPerson: '', email: '', phone: '', address: '',
  customerType: 'hotel', taxId: '', creditLimit: undefined, paymentTerms: undefined,
  branchId: '',
}

export default function CustomersPage() {
  const t = useTranslations('customers')
  const tc = useTranslations('common')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setCustomers(await fetchCustomers())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, branchId: branchId ?? '' })
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditingId(c.id)
    setForm({
      name: c.name, contactPerson: c.contactPerson ?? '', email: c.email ?? '',
      phone: c.phone ?? '', address: c.address ?? '', customerType: c.customerType ?? 'other',
      taxId: c.taxId ?? '', creditLimit: c.creditLimit ?? undefined,
      paymentTerms: c.paymentTerms ?? undefined, branchId: c.branchId,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const set = (k: keyof CustomerInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setFormError(null)
    if (!form.name.trim() || !form.branchId) {
      setFormError(t('nameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: CustomerInput = {
        ...form,
        name: form.name.trim(),
        creditLimit: form.creditLimit === undefined || (form.creditLimit as any) === '' ? null : Number(form.creditLimit),
        paymentTerms: form.paymentTerms === undefined || (form.paymentTerms as any) === '' ? null : Number(form.paymentTerms),
      }
      if (editingId) await updateCustomer(editingId, payload)
      else await createCustomer(payload)
      setDialogOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c: Customer) => {
    if (!confirm(t('confirmDelete', { name: c.name }))) return
    try {
      await deleteCustomer(c.id)
      await load()
    } catch {
      setLoadError(t('deleteError'))
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addCustomer')}
          </Button>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <CustomerDataTable customers={customers} onEdit={openEdit} onDelete={remove} />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('editCustomer') : t('addCustomer')}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('name')} *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('customerType')}</Label>
              <Select value={form.customerType} onValueChange={(v) => set('customerType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>{t(`customerTypes.${ty}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('contactPerson')}</Label>
              <Input value={form.contactPerson ?? ''} onChange={(e) => set('contactPerson', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('address')}</Label>
              <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('taxId')}</Label>
              <Input className="font-mono" value={form.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('creditLimit')} (฿)</Label>
              <Input type="number" min="0" value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentTerms')} ({tc('days')})</Label>
              <Input type="number" min="0" value={form.paymentTerms ?? ''} onChange={(e) => set('paymentTerms', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
