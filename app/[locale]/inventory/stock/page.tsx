'use client'

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useState, useMemo, useEffect } from "react"
import type {
  InventoryItemType,
  InventoryUnit,
  StockTransaction,
  StockTransactionType,
  Supplier,
} from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrentBranchId } from "@/contexts/BranchContext"
import {
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchTransactions,
  recordMovement,
  type InventoryItemWithAlert,
  type InventoryItemInput,
  type StockMovementInput,
} from "@/lib/api/inventory-items"
import { fetchSuppliers } from "@/lib/api/suppliers"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Boxes,
} from "lucide-react"
import { EmptyState } from '@/components/EmptyState'

// Type value -> i18n key under `types.*` (keys are camelCase, values snake_case).
const TYPE_OPTIONS: { value: InventoryItemType; key: string }[] = [
  { value: 'detergent', key: 'detergent' },
  { value: 'softener', key: 'softener' },
  { value: 'bleach', key: 'bleach' },
  { value: 'stain_remover', key: 'stainRemover' },
  { value: 'packaging', key: 'packaging' },
  { value: 'plastic_bag', key: 'plasticBag' },
  { value: 'hanger', key: 'hanger' },
  { value: 'tag', key: 'tag' },
  { value: 'gas', key: 'gas' },
  { value: 'other', key: 'other' },
]

const UNIT_OPTIONS: InventoryUnit[] = ['kg', 'liter', 'piece', 'box', 'bottle', 'tank']

// Movement types (transfer excluded in v1 — backend rejects it).
const MOVEMENT_TYPES: { value: StockTransactionType; key: string }[] = [
  { value: 'stock_in', key: 'stockIn' },
  { value: 'stock_out', key: 'stockOut' },
  { value: 'adjustment', key: 'adjustment' },
  { value: 'return', key: 'return' },
]

const NONE_SUPPLIER = '__none__'

interface ItemForm {
  name: string
  nameTh: string
  nameEn: string
  type: InventoryItemType
  unit: InventoryUnit
  currentStock: string
  minimumStock: string
  maximumStock: string
  reorderPoint: string
  unitCost: string
  supplierId: string
}

const emptyForm: ItemForm = {
  name: '',
  nameTh: '',
  nameEn: '',
  type: 'detergent',
  unit: 'kg',
  currentStock: '',
  minimumStock: '',
  maximumStock: '',
  reorderPoint: '',
  unitCost: '',
  supplierId: NONE_SUPPLIER,
}

interface MovementForm {
  type: StockTransactionType
  quantity: string
  unitCost: string
  notes: string
}

const numOrZero = (s: string) => (s.trim() === '' ? 0 : Number(s))

export default function StockPage() {
  const t = useTranslations('inventoryManagement')
  const tCommon = useTranslations('common')
  const tEmpty = useTranslations('empty')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [items, setItems] = useState<InventoryItemWithAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [alertFilter, setAlertFilter] = useState<string>('all')

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItemWithAlert | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Movement dialog
  const [movementTarget, setMovementTarget] = useState<InventoryItemWithAlert | null>(null)
  const [movementForm, setMovementForm] = useState<MovementForm>({
    type: 'stock_in',
    quantity: '',
    unitCost: '',
    notes: '',
  })
  const [movementError, setMovementError] = useState<string | null>(null)
  const [movementSaving, setMovementSaving] = useState(false)

  // Transactions dialog
  const [txTarget, setTxTarget] = useState<InventoryItemWithAlert | null>(null)
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<InventoryItemWithAlert | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load items — branch scoping is server-side; branchId only triggers a re-fetch.
  // Type + alert filters go to the server (?type=, ?alert=), so items reflect them.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchInventoryItems({
      type: selectedType !== 'all' ? (selectedType as InventoryItemType) : undefined,
      alert:
        alertFilter !== 'all'
          ? (alertFilter as 'low' | 'critical' | 'out_of_stock')
          : undefined,
    })
      .then((d) => {
        if (alive) setItems(d)
      })
      .catch(() => {
        if (alive) setError(t('loadError'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, selectedType, alertFilter])

  // Suppliers for the create/edit picker (best-effort; failure just leaves it empty).
  useEffect(() => {
    let alive = true
    fetchSuppliers()
      .then((s) => {
        if (alive) setSuppliers(s)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const typeLabel = (type: InventoryItemType) => {
    const opt = TYPE_OPTIONS.find((o) => o.value === type)
    return t(`types.${opt ? opt.key : 'other'}` as any)
  }

  // Client-side search only (server has no search param).
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.nameTh?.toLowerCase().includes(q) ||
        item.nameEn?.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  // KPIs from server data (uses alertLevel — no client thresholds). Reflect active filters.
  const metrics = useMemo(() => {
    const totalItems = items.length
    const totalValue = items.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0)
    const lowStockItems = items.filter(
      (i) => i.alertLevel === 'low' || i.alertLevel === 'critical'
    ).length
    const outOfStockItems = items.filter((i) => i.alertLevel === 'out_of_stock').length
    return { totalItems, totalValue, lowStockItems, outOfStockItems }
  }, [items])

  const setField = (k: keyof ItemForm, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (item: InventoryItemWithAlert) => {
    setEditing(item)
    setForm({
      name: item.name,
      nameTh: item.nameTh ?? '',
      nameEn: item.nameEn ?? '',
      type: item.type,
      unit: item.unit,
      currentStock: String(item.currentStock),
      minimumStock: String(item.minimumStock),
      maximumStock: item.maximumStock != null ? String(item.maximumStock) : '',
      reorderPoint: String(item.reorderPoint),
      unitCost: String(item.unitCost),
      supplierId: item.supplierId ?? NONE_SUPPLIER,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError(t('formNameRequired'))
      return
    }
    if (!editing && !branchId) {
      setFormError(t('saveError'))
      return
    }
    setSaving(true)
    try {
      const supplierId = form.supplierId === NONE_SUPPLIER ? null : form.supplierId
      if (editing) {
        // NB: no currentStock (movements only) and no code on update.
        const payload: Partial<InventoryItemInput> = {
          name: form.name.trim(),
          nameTh: form.nameTh.trim() || null,
          nameEn: form.nameEn.trim() || null,
          type: form.type,
          unit: form.unit,
          minimumStock: numOrZero(form.minimumStock),
          maximumStock: form.maximumStock.trim() === '' ? null : Number(form.maximumStock),
          reorderPoint: numOrZero(form.reorderPoint),
          unitCost: numOrZero(form.unitCost),
          supplierId,
        }
        const updated = await updateInventoryItem(editing.id, payload)
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        setSuccess(t('updateSuccess'))
      } else {
        const payload: InventoryItemInput = {
          name: form.name.trim(),
          nameTh: form.nameTh.trim() || null,
          nameEn: form.nameEn.trim() || null,
          type: form.type,
          unit: form.unit,
          currentStock: numOrZero(form.currentStock), // opening balance
          minimumStock: numOrZero(form.minimumStock),
          maximumStock: form.maximumStock.trim() === '' ? null : Number(form.maximumStock),
          reorderPoint: numOrZero(form.reorderPoint),
          unitCost: numOrZero(form.unitCost),
          supplierId,
          branchId: branchId as string,
        }
        const created = await createInventoryItem(payload)
        setItems((prev) => [created, ...prev])
        setSuccess(t('createSuccess'))
      }
      setDialogOpen(false)
      toast.success(editing ? tCommon('saved') : tCommon('created'))
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const openMovement = (item: InventoryItemWithAlert) => {
    setMovementTarget(item)
    setMovementForm({ type: 'stock_in', quantity: '', unitCost: String(item.unitCost), notes: '' })
    setMovementError(null)
  }

  const submitMovement = async () => {
    if (!movementTarget) return
    setMovementError(null)
    const qty = Number(movementForm.quantity)
    if (movementForm.quantity.trim() === '' || Number.isNaN(qty)) {
      setMovementError(t('invalidQuantity'))
      return
    }
    setMovementSaving(true)
    try {
      const input: StockMovementInput = {
        type: movementForm.type,
        quantity: qty,
        unitCost: movementForm.unitCost.trim() === '' ? undefined : Number(movementForm.unitCost),
        referenceType: 'manual',
        notes: movementForm.notes.trim() || null,
      }
      const result = await recordMovement(movementTarget.id, input)
      // Replace the row with the fresh item (new currentStock + alertLevel).
      setItems((prev) => prev.map((i) => (i.id === result.item.id ? result.item : i)))
      setMovementTarget(null)
      setSuccess(t('movementRecorded'))
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'STOCK_NEGATIVE') setMovementError(t('stockNegative'))
        else if (err.code === 'INVALID_QUANTITY') setMovementError(t('invalidQuantity'))
        else if (err.code === 'TRANSFER_NOT_SUPPORTED') setMovementError(t('transferNotSupported'))
        else setMovementError(err.message)
      } else {
        setMovementError(t('saveError'))
      }
    } finally {
      setMovementSaving(false)
    }
  }

  const openTransactions = async (item: InventoryItemWithAlert) => {
    setTxTarget(item)
    setTransactions([])
    setTxLoading(true)
    try {
      setTransactions(await fetchTransactions(item.id))
    } catch {
      // Non-fatal: leave list empty.
    } finally {
      setTxLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await deleteInventoryItem(deleteTarget.id)
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setSuccess(t('deleteSuccess'))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  const canCreate = hasPermission('create')

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addItem')}
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
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalValue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('showing')} {metrics.totalItems} {tCommon('items')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('lowStockAlert')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{metrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">{t('belowReorder')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('outOfStock')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">{t('criticalItems')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('currentStock')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
            <p className="text-xs text-muted-foreground">{t('differentItems')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('filters')}</CardTitle>
          <CardDescription>{t('filtersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('itemName') + ", " + t('itemCode')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter (server-side) */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('itemType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {t(`types.${o.key}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Alert Filter (server-side) */}
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('lowStockAlert')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAlerts')}</SelectItem>
                <SelectItem value="out_of_stock">{t('alerts.outOfStock')}</SelectItem>
                <SelectItem value="critical">{t('alerts.critical')}</SelectItem>
                <SelectItem value="low">{t('alerts.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {t('showingCount', { shown: filteredItems.length, total: items.length })}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('itemCode')}</TableHead>
              <TableHead>{t('itemName')}</TableHead>
              <TableHead>{t('itemType')}</TableHead>
              <TableHead className="text-right">{t('currentStock')}</TableHead>
              <TableHead className="text-right">{t('minimumStock')}</TableHead>
              <TableHead className="text-right">{t('unitCost')}</TableHead>
              <TableHead className="text-right">{t('totalValue')}</TableHead>
              <TableHead>{tCommon('status')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="mt-2 text-sm text-muted-foreground">{tCommon('loading')}</div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  {items.length === 0 ? (
                    <EmptyState
                      icon={Boxes}
                      title={tEmpty('stockTitle')}
                      description={tEmpty('stockDesc')}
                      actionLabel={canCreate ? tEmpty('stockAction') : undefined}
                      onAction={openCreate}
                    />
                  ) : (
                    <EmptyState icon={Boxes} title={tEmpty('noResultsTitle')} description={tEmpty('noResultsDesc')} />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const totalValue = item.currentStock * item.unitCost
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">{item.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.nameTh && item.nameTh !== item.name && (
                          <div className="text-xs text-muted-foreground">{item.nameTh}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(item.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{item.currentStock.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`units.${item.unit}` as any)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.minimumStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ฿{item.unitCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ฿{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {item.alertLevel === 'out_of_stock' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('alerts.outOfStock')}
                        </Badge>
                      )}
                      {item.alertLevel === 'critical' && (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {t('alerts.critical')}
                        </Badge>
                      )}
                      {item.alertLevel === 'low' && (
                        <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
                          <TrendingDown className="h-3 w-3" />
                          {t('alerts.low')}
                        </Badge>
                      )}
                      {item.alertLevel === 'ok' && (
                        <Badge variant="outline" className="gap-1 text-green-700">
                          <TrendingUp className="h-3 w-3" />
                          {t('goodStatus')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openTransactions(item)}>
                          {t('viewTransactions')}
                        </Button>
                        {canCreate && (
                          <Button
                            variant="outline"
                            size="sm"
                            title={t('recordMovement')}
                            onClick={() => openMovement(item)}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('update') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('editItem')}
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('delete') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={tCommon('delete')}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editItem') : t('addItem')}</DialogTitle>
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
                <Label>{t('itemCode')}</Label>
                <Input value={editing.code} readOnly disabled className="font-mono" />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('itemName')} *</Label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('nameTh')}</Label>
              <Input value={form.nameTh} onChange={(e) => setField('nameTh', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('nameEn')}</Label>
              <Input value={form.nameEn} onChange={(e) => setField('nameEn', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('itemType')}</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(`types.${o.key}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('unit')}</Label>
              <Select value={form.unit} onValueChange={(v) => setField('unit', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`units.${u}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>{t('openingBalance')}</Label>
                <Input
                  type="number"
                  value={form.currentStock}
                  onChange={(e) => setField('currentStock', e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('minimumStock')}</Label>
              <Input
                type="number"
                value={form.minimumStock}
                onChange={(e) => setField('minimumStock', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('reorderPoint')}</Label>
              <Input
                type="number"
                value={form.reorderPoint}
                onChange={(e) => setField('reorderPoint', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('maximumStock')}</Label>
              <Input
                type="number"
                value={form.maximumStock}
                onChange={(e) => setField('maximumStock', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitCost')}</Label>
              <Input
                type="number"
                value={form.unitCost}
                onChange={(e) => setField('unitCost', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('supplier')}</Label>
              <Select value={form.supplierId} onValueChange={(v) => setField('supplierId', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SUPPLIER}>{t('noSupplier')}</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock movement dialog */}
      <Dialog
        open={!!movementTarget}
        onOpenChange={(open) => {
          if (!open) setMovementTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('recordMovement')}
              {movementTarget ? ` — ${movementTarget.code}` : ''}
            </DialogTitle>
          </DialogHeader>

          {movementError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{movementError}</AlertDescription>
            </Alert>
          )}

          {movementTarget && (
            <div className="text-sm text-muted-foreground">
              {movementTarget.name} · {t('currentStock')}:{' '}
              <span className="font-medium text-foreground">
                {movementTarget.currentStock.toLocaleString()} {t(`units.${movementTarget.unit}` as any)}
              </span>
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t('transactionType')}</Label>
              <Select
                value={movementForm.type}
                onValueChange={(v) =>
                  setMovementForm((f) => ({ ...f, type: v as StockTransactionType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {t(`transactionTypes.${m.key}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('quantity')}</Label>
              <Input
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitCost')}</Label>
              <Input
                type="number"
                value={movementForm.unitCost}
                onChange={(e) => setMovementForm((f) => ({ ...f, unitCost: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Textarea
                value={movementForm.notes}
                onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMovementTarget(null)}
              disabled={movementSaving}
            >
              {tCommon('cancel')}
            </Button>
            <Button onClick={submitMovement} disabled={movementSaving}>
              {movementSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('recordMovement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transactions history dialog */}
      <Dialog
        open={!!txTarget}
        onOpenChange={(open) => {
          if (!open) setTxTarget(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('transactionHistory')}
              {txTarget ? ` — ${txTarget.code}` : ''}
            </DialogTitle>
          </DialogHeader>

          {txLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('noTransactions')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('transactionType')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unitCost')}</TableHead>
                  <TableHead className="text-right">{t('totalCost')}</TableHead>
                  <TableHead>{t('notes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const mt = MOVEMENT_TYPES.find((m) => m.value === tx.type)
                  const label = mt
                    ? t(`transactionTypes.${mt.key}` as any)
                    : t(`transactionTypes.${tx.type === 'transfer' ? 'transfer' : 'adjustment'}` as any)
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{tx.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">฿{tx.unitCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">฿{tx.totalCost.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.notes || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxTarget(null)}>
              {tCommon('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
