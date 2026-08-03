'use client'

/**
 * CustomerPriceList — the per-customer rate card on the customer detail page.
 *
 * Laundry pricing is negotiated per account: the same SKU is billed at
 * different unit prices to different hotels, so there is no single global rate
 * card to fall back on. This is where an operator checks and changes what a
 * given customer actually pays, split by ค่าซัก (wash) vs ค่าเช่า (rental).
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Tag, Pencil, Trash2, Plus, Search, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import {
  fetchPriceList,
  savePrice,
  updatePrice,
  deletePrice,
  type PriceListEntry,
  type PriceServiceType,
} from '@/lib/api/price-list'
import { fetchSkus, type SkuRow } from '@/lib/api/sku-catalog'
import { ApiError } from '@/lib/api/client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/EmptyState'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Props = { customerId: string }

const baht = (n: number) =>
  `฿${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export function CustomerPriceList({ customerId }: Props) {
  const t = useTranslations('priceList')
  const tc = useTranslations('common')
  const { hasPermission } = useAuth()

  const [rows, setRows] = useState<PriceListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')

  // dialog state — one dialog for both "add SKU" and "change price"
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PriceListEntry | null>(null)
  const [sku, setSku] = useState('')
  const [serviceType, setServiceType] = useState<PriceServiceType>('wash')
  const [unitPrice, setUnitPrice] = useState('')
  const [suggestions, setSuggestions] = useState<SkuRow[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = hasPermission('update')
  const canCreate = hasPermission('create')
  const canDelete = hasPermission('delete')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    fetchPriceList(customerId)
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => { if (!cancelled) setLoadError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [customerId])

  // SKU suggestions while typing — the catalog is too large for a plain <Select>
  useEffect(() => {
    if (editing || sku.trim().length < 1) { setSuggestions([]); return }
    let cancelled = false
    const timer = setTimeout(() => {
      fetchSkus({ search: sku.trim(), limit: 8 })
        .then((r) => { if (!cancelled) setSuggestions(r.rows) })
        .catch(() => { if (!cancelled) setSuggestions([]) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [sku, editing])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.sku.toLowerCase().includes(q) || (r.displayName || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  function openAdd() {
    setEditing(null)
    setSku('')
    setServiceType('wash')
    setUnitPrice('')
    setSuggestions([])
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: PriceListEntry) {
    setEditing(row)
    setSku(row.sku)
    setServiceType(row.serviceType)
    setUnitPrice(String(row.unitPrice))
    setSuggestions([])
    setFormError(null)
    setOpen(true)
  }

  async function handleSave() {
    const price = Number(unitPrice)
    if (!Number.isFinite(price) || price < 0) { setFormError(t('invalidPrice')); return }
    if (!editing && !sku.trim()) { setFormError(t('skuRequired')); return }

    setSaving(true)
    setFormError(null)
    try {
      const saved = editing
        ? await updatePrice(customerId, editing.id, price)
        : await savePrice(customerId, { sku: sku.trim(), serviceType, unitPrice: price })
      // upsert may either replace an existing row or append a new one
      setRows((prev) => {
        const rest = prev.filter((r) => r.id !== saved.id)
        return [...rest, saved].sort(
          (a, b) => a.serviceType.localeCompare(b.serviceType) || a.sku.localeCompare(b.sku)
        )
      })
      toast.success(editing ? tc('saved') : tc('created'))
      setOpen(false)
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 400 ? t('unknownSku', { sku: sku.trim() }) : tc('error')
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: PriceListEntry) {
    try {
      await deletePrice(customerId, row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      toast.success(tc('deleted'))
    } catch {
      toast.error(tc('error'))
    }
  }

  const washCount = rows.filter((r) => r.serviceType === 'wash').length
  const rentalCount = rows.filter((r) => r.serviceType === 'rental').length

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Tag className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          {canCreate && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addPrice')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t('washCount', { count: washCount })}</Badge>
            {rentalCount > 0 && <Badge variant="outline">{t('rentalCount', { count: rentalCount })}</Badge>}
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-8"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('loadError')}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t('sku')}</TableHead>
                  <TableHead>{t('itemName')}</TableHead>
                  <TableHead>{t('serviceType')}</TableHead>
                  <TableHead className="text-right">{t('unitPrice')}</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      {rows.length === 0 ? (
                        <EmptyState
                          icon={Tag}
                          title={t('emptyTitle')}
                          description={t('emptyDescription')}
                          actionLabel={canCreate ? t('addPrice') : undefined}
                          onAction={canCreate ? openAdd : undefined}
                        />
                      ) : (
                        <EmptyState icon={Search} title={t('noResults')} description={t('noResultsHint')} />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                      <TableCell>{row.displayName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={row.serviceType === 'rental' ? 'secondary' : 'outline'}>
                          {t(`serviceTypes.${row.serviceType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{baht(row.unitPrice)}</TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={tc('edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} aria-label={tc('delete')}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('editPrice') : t('addPrice')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpl-sku">{t('sku')}</Label>
              <Input
                id="cpl-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={!!editing}
                placeholder={t('skuPlaceholder')}
                className="font-mono"
              />
              {editing ? (
                <p className="text-xs text-muted-foreground">{editing.displayName || '—'}</p>
              ) : (
                suggestions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border">
                    {suggestions.map((s) => (
                      <button
                        key={s.sku}
                        type="button"
                        onClick={() => { setSku(s.sku); setSuggestions([]) }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-mono text-xs">{s.sku}</span>
                        <span className="truncate text-muted-foreground">{s.displayName}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpl-service">{t('serviceType')}</Label>
              <Select
                value={serviceType}
                onValueChange={(v) => setServiceType(v as PriceServiceType)}
                disabled={!!editing}
              >
                <SelectTrigger id="cpl-service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wash">{t('serviceTypes.wash')}</SelectItem>
                  <SelectItem value="rental">{t('serviceTypes.rental')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpl-price">{t('unitPrice')}</Label>
              <Input
                id="cpl-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
