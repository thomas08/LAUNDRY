'use client'

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useState, useMemo, useEffect, useCallback } from "react"
import { Supplier } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierInput,
} from "@/lib/api/suppliers"
import { ApiError } from "@/lib/api/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { EmptyState } from '@/components/EmptyState'

const emptyForm: SupplierInput = {
  name: '',
  nameTh: '',
  nameEn: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  paymentTerms: undefined,
}

export default function SuppliersPage() {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const tEmpty = useTranslations('empty')
  const { hasPermission } = useAuth()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSuppliers(await fetchSuppliers())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  // Filter suppliers (client-side search)
  const filteredSuppliers = useMemo(() => {
    let result = suppliers
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.code.toLowerCase().includes(query) ||
          supplier.contactPerson.toLowerCase().includes(query) ||
          supplier.email.toLowerCase().includes(query) ||
          supplier.phone.includes(query) ||
          supplier.nameTh?.toLowerCase().includes(query) ||
          supplier.nameEn?.toLowerCase().includes(query)
      )
    }
    return result
  }, [suppliers, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSuppliers, currentPage])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Metrics (fetchSuppliers returns active-only, so all loaded suppliers are active)
  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length
    const avgPaymentTerms = totalSuppliers
      ? Math.round(
          suppliers.reduce((sum, s) => sum + (s.paymentTerms || 0), 0) / totalSuppliers
        )
      : 0
    return { totalSuppliers, inactiveSuppliers: 0, avgPaymentTerms }
  }, [suppliers])

  const setField = (k: keyof SupplierInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name,
      nameTh: s.nameTh ?? '',
      nameEn: s.nameEn ?? '',
      contactPerson: s.contactPerson ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      taxId: s.taxId ?? '',
      paymentTerms: s.paymentTerms,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.name || !form.name.trim()) {
      setFormError(t('formNameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: SupplierInput = {
        ...form,
        name: form.name.trim(),
        paymentTerms:
          form.paymentTerms === undefined || (form.paymentTerms as any) === ''
            ? null
            : Number(form.paymentTerms),
      }
      if (editing) {
        await updateSupplier(editing.id, payload)
        setSuccess(t('updateSuccess'))
      } else {
        await createSupplier(payload)
        setSuccess(t('createSuccess'))
      }
      setDialogOpen(false)
      await load()
      toast.success(editing ? tCommon('saved') : tCommon('created'))
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await deleteSupplier(deleteTarget.id)
      setSuccess(t('deleteSuccess'))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deleteError'))
    } finally {
      setDeleting(false)
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
            <Plus className="h-4 w-4 mr-2" />
            {t('addSupplier')}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeSuppliers')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {t('inactiveCount', { count: metrics.inactiveSuppliers })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgPaymentTerms')}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgPaymentTerms} {t('days')}</div>
            <p className="text-xs text-muted-foreground">{t('creditPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalContacts')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">{t('supplierContacts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('searchAndFilter')}</CardTitle>
          <CardDescription>{t('searchPlaceholder')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${t('supplierName')}, ${t('supplierCode')}, ${t('email')}...`}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {t('showingOf', { count: filteredSuppliers.length, total: metrics.totalSuppliers })}
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('supplierCode')}</TableHead>
              <TableHead>{t('supplierName')}</TableHead>
              <TableHead>{t('contactPerson')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead className="text-right">{t('paymentTerms')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="mt-2 text-sm text-muted-foreground">{t('loading')}</div>
                </TableCell>
              </TableRow>
            ) : paginatedSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  {suppliers.length === 0 ? (
                    <EmptyState
                      icon={Building2}
                      title={tEmpty('suppliersTitle')}
                      description={tEmpty('suppliersDesc')}
                      actionLabel={hasPermission('create') ? tEmpty('suppliersAction') : undefined}
                      onAction={openCreate}
                    />
                  ) : (
                    <EmptyState icon={Building2} title={tEmpty('noResultsTitle')} description={tEmpty('noResultsDesc')} />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono font-medium">{supplier.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.nameTh && supplier.nameTh !== supplier.name && (
                        <div className="text-xs text-muted-foreground">{supplier.nameTh}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>
                    {supplier.email ? (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.phone ? (
                      <a
                        href={`tel:${supplier.phone}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{supplier.paymentTerms ?? 0} {t('days')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Edit Button */}
                      {hasPermission('update') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('editSupplier')}
                          onClick={() => openEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete Button */}
                      {hasPermission('delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={tCommon('delete')}
                          onClick={() => setDeleteTarget(supplier)}
                        >
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

        {/* Pagination */}
        {filteredSuppliers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              {t('pageOf', { current: currentPage, total: totalPages })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {tCommon('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {tCommon('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tax ID and Address Info */}
      {paginatedSuppliers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('additionalInfo')}</CardTitle>
            <CardDescription>{t('taxIdAndAddresses')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{supplier.address}</span>
                    </div>
                    {supplier.taxId && (
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">{t('taxId')}:</span>{" "}
                        <span className="font-mono">{supplier.taxId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editSupplier') : t('addSupplier')}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {editing && (
              <div className="space-y-2 sm:col-span-2">
                <Label>{t('supplierCode')}</Label>
                <Input value={editing.code} readOnly disabled className="font-mono" />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('supplierName')} *</Label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('nameTh')}</Label>
              <Input value={form.nameTh ?? ''} onChange={(e) => setField('nameTh', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('nameEn')}</Label>
              <Input value={form.nameEn ?? ''} onChange={(e) => setField('nameEn', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('contactPerson')}</Label>
              <Input value={form.contactPerson ?? ''} onChange={(e) => setField('contactPerson', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentTerms')}</Label>
              <Input
                type="number"
                min="0"
                value={form.paymentTerms ?? ''}
                onChange={(e) => setField('paymentTerms', e.target.value === '' ? undefined : e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('address')}</Label>
              <Input value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('taxId')}</Label>
              <Input value={form.taxId ?? ''} onChange={(e) => setField('taxId', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete() }} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
