'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  fetchCatalogDimensions,
  fetchSkus,
  type CatalogDimensions,
  type SkuRow,
} from '@/lib/api/sku-catalog'
import { ApiError } from '@/lib/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Tags, Layers, Boxes, AlertCircle, Loader2 } from 'lucide-react'

const CATEGORIES = ['core', 'extended', 'service', 'fixed_size'] as const
const PER_PAGE = 50

function categoryVariant(c: string): 'default' | 'secondary' | 'outline' {
  return c === 'core' ? 'default' : c === 'extended' ? 'secondary' : 'outline'
}

export default function SkuCatalogPage() {
  const t = useTranslations('skuCatalog')
  const tc = useTranslations('common')

  const [dimensions, setDimensions] = useState<CatalogDimensions | null>(null)
  const [rows, setRows] = useState<SkuRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [productCode, setProductCode] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Load filter dimensions once
  useEffect(() => {
    fetchCatalogDimensions()
      .then(setDimensions)
      .catch(() => {/* filters degrade gracefully */})
  }, [])

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1) }, [debouncedSearch, category, productCode])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetchSkus({
        search: debouncedSearch || undefined,
        category: category === 'all' ? undefined : category,
        productCode: productCode === 'all' ? undefined : productCode,
        limit: PER_PAGE,
        offset: (page - 1) * PER_PAGE,
      })
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, productCode, page, t])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const catLabel = (c: string) => t(`categories.${c}` as any)

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label={t('summary.totalSkus')} value={total.toLocaleString()} icon={<Tags className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label={t('summary.products')} value={dimensions?.products.length ?? '—'} icon={<Boxes className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label={t('summary.dimensions')} value={dimensions ? `${dimensions.sizes.length} × ${dimensions.activities.length}` : '—'} icon={<Layers className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader><CardTitle>{tc('filters')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder={t('searchPlaceholder')} value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productCode} onValueChange={setProductCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allProducts')}</SelectItem>
                {(dimensions?.products ?? []).map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>
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
        <CardHeader><CardTitle className="text-xl">{t('skus')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sku')}</TableHead>
                  <TableHead>{t('displayName')}</TableHead>
                  <TableHead>{t('size')}</TableHead>
                  <TableHead>{t('activity')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.sku}>
                      <TableCell className="font-mono text-sm font-medium">{r.sku}</TableCell>
                      <TableCell>{r.displayName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.sizeCode ? r.sizeName : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.activityCode ? r.activityName : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={categoryVariant(r.category)}>{catLabel(r.category)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {tc('showing')} {rows.length} {tc('of')} {total.toLocaleString()} {t('skus')}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  {tc('previous')}
                </Button>
                <span className="px-2 text-sm">{tc('page')} {page} {tc('of')} {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
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

function SummaryCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
