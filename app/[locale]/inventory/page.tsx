'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import type { LinenItemStatus, LinenOwnership } from '@/lib/types'
import { fetchLinenItems, type LinenItemRow } from '@/lib/api/linen-items'
import { ApiError } from '@/lib/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Package, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'

const STATUSES: LinenItemStatus[] = ['In Stock', 'Washing', 'On-Rent']
const OWNERSHIPS: LinenOwnership[] = ['rental', 'customer_owned']

function statusKey(s: LinenItemStatus): 'inStock' | 'washing' | 'onRent' {
  return s === 'In Stock' ? 'inStock' : s === 'On-Rent' ? 'onRent' : 'washing'
}
function statusVariant(s: LinenItemStatus): 'default' | 'secondary' | 'outline' {
  return s === 'In Stock' ? 'default' : s === 'Washing' ? 'secondary' : 'outline'
}

export default function InventoryPage() {
  const t = useTranslations('inventory')
  const tc = useTranslations('common')
  const user = useUser()
  const { availableBranches } = useBranch()

  const [items, setItems] = useState<LinenItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await fetchLinenItems())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      const matchSearch = !q ||
        it.tagId.toLowerCase().includes(q) ||
        (it.articleName ?? it.type ?? '').toLowerCase().includes(q) ||
        (it.customerName ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || it.status === statusFilter
      const matchOwnership = ownershipFilter === 'all' || it.ownership === ownershipFilter
      return matchSearch && matchStatus && matchOwnership
    })
  }, [items, search, statusFilter, ownershipFilter])

  const summary = useMemo(() => {
    const total = filtered.length
    const inStock = filtered.filter((i) => i.status === 'In Stock').length
    const onRent = filtered.filter((i) => i.status === 'On-Rent').length
    const washing = filtered.filter((i) => i.status === 'Washing').length
    const avg = total ? filtered.reduce((s, i) => s + i.washCycles, 0) / total : 0
    return { total, inStock, onRent, washing, avg }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage)

  const branchCode = (id: string) =>
    availableBranches.find((b) => b.id === id)?.code || id

  const resetPage = () => setPage(1)

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label={t('summary.total')} value={summary.total} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label={t('summary.inStock')} value={summary.inStock} icon={<Package className="h-4 w-4 text-green-500" />} valueClass="text-green-600" />
        <SummaryCard label={t('summary.onRent')} value={summary.onRent} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} valueClass="text-blue-600" />
        <SummaryCard label={t('summary.avgWashCycles')} value={summary.avg.toFixed(1)} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader><CardTitle>{tc('filters')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder={tc('searchPlaceholder')} value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage() }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage() }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`statusLabels.${statusKey(s)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownershipFilter} onValueChange={(v) => { setOwnershipFilter(v); resetPage() }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allOwnership')}</SelectItem>
                {OWNERSHIPS.map((o) => (
                  <SelectItem key={o} value={o}>{t(`ownershipLabels.${o}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-xl">{t('inventoryItems')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tagId')}</TableHead>
                  <TableHead>{t('article')}</TableHead>
                  <TableHead>{tc('customer')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('ownership')}</TableHead>
                  <TableHead className="text-right">{t('washCycles')}</TableHead>
                  {user?.role !== 'user' && <TableHead>{tc('branch')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((it) => (
                    <TableRow key={it.tagId}>
                      <TableCell className="font-mono text-sm font-medium">{it.tagId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{it.articleName ?? it.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {it.customerName ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(it.status)}>{t(`statusLabels.${statusKey(it.status)}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={it.ownership === 'rental' ? 'default' : 'secondary'}>
                          {t(`ownershipLabels.${it.ownership}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{it.washCycles}</TableCell>
                      {user?.role !== 'user' && (
                        <TableCell><Badge variant="outline">{branchCode(it.branchId)}</Badge></TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length > perPage && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {tc('showing')} {pageItems.length} {tc('of')} {filtered.length} {t('items')}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  {tc('previous')}
                </Button>
                <span className="px-2 text-sm">{tc('page')} {page} {tc('of')} {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  {tc('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass ?? ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
