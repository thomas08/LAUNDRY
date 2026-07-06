'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import { fetchLinenItems, type LinenItemRow } from '@/lib/api/linen-items'
import { syncBatch, buildStatusChangeEvents, type SyncEventResult } from '@/lib/api/sync'
import { ApiError } from '@/lib/api/client'
import type { LinenItemStatus } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Scan, ScanLine, CheckCircle, AlertCircle, Loader2, X, Users, TrendingUp,
} from 'lucide-react'

const DEVICE_ID = 'web-checkin' // browser acts as the single scanner station (MVP)

type CheckinMode = 'return' | 'wash'

interface CheckinResult extends SyncEventResult {
  tagId: string
}

export default function CheckInPage() {
  const t = useTranslations('checkin')
  const tCommon = useTranslations('common')
  const tInventory = useTranslations('inventory')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [mode, setMode] = useState<CheckinMode>('return')
  const [tagInput, setTagInput] = useState('')
  const [batchTags, setBatchTags] = useState<string[]>([])

  const [items, setItems] = useState<Map<string, LinenItemRow>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<CheckinResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const canUpdate = hasPermission('update')

  // Fetch the branch's linen items into a tagId→row map for advisory lookup.
  const loadItems = useCallback(async () => {
    try {
      const list = await fetchLinenItems()
      setItems(new Map(list.map((r) => [r.tagId.toUpperCase(), r])))
    } catch {
      setItems(new Map())
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const newStatus: LinenItemStatus = mode === 'return' ? 'In Stock' : 'Washing'

  const addBatchTag = () => {
    const v = tagInput.trim().toUpperCase()
    if (!v) return
    setBatchTags((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setTagInput('')
  }

  const submit = useCallback(async () => {
    setError(null)
    setResults([])
    if (!branchId) { setError(t('noBranch')); return }
    const cleaned = Array.from(new Set(batchTags.map((x) => x.trim().toUpperCase()).filter(Boolean)))
    if (cleaned.length === 0) { setError(t('noTags')); return }

    setSubmitting(true)
    try {
      const events = buildStatusChangeEvents({ tagIds: cleaned, branchId, newStatus })
      const byUuid = new Map(events.map((e) => [e.clientUuid, e.tagId]))
      const res = await syncBatch(DEVICE_ID, events)
      const mapped: CheckinResult[] = res.map((r) => ({ ...r, tagId: byUuid.get(r.clientUuid) ?? '?' }))
      setResults(mapped)
      // Clear the queue only if every tag was accepted; keep failures for retry.
      if (mapped.every((r) => r.result === 'applied')) setBatchTags([])
      // Refresh the lookup map so statuses reflect the applied changes.
      loadItems()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitError'))
    } finally {
      setSubmitting(false)
    }
  }, [branchId, batchTags, newStatus, t, loadItems])

  const appliedCount = results.filter((r) => r.result === 'applied').length
  const rejectedCount = results.filter((r) => r.result === 'rejected').length

  const stats = useMemo(() => {
    const applied = results.filter((r) => r.result === 'applied')
    const rows = applied
      .map((r) => items.get(r.tagId.toUpperCase()))
      .filter((r): r is LinenItemRow => !!r)
    const customersCount = new Set(rows.map((r) => r.customerId).filter(Boolean)).size
    const avgWashCycles = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r.washCycles || 0), 0) / rows.length)
      : 0
    return { itemsCount: applied.length, customersCount, avgWashCycles }
  }, [results, items])

  if (!canUpdate) {
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('noPermission')}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Scan / queue card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Scan className="h-5 w-5" />
              {t('scanOrEnter')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Action mode */}
            <div className="space-y-2">
              <Label>{t('mode')}</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as CheckinMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="return">{t('modeReturn')}</TabsTrigger>
                  <TabsTrigger value="wash">{t('modeWash')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Scan input */}
            <div className="space-y-2">
              <Label>{t('scanTag')}</Label>
              <div className="flex gap-2">
                <Input
                  className="font-mono text-lg"
                  placeholder={t('placeholder')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBatchTag() } }}
                  autoFocus
                />
                <Button variant="outline" onClick={addBatchTag} title={t('addTag')}>
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Queue */}
            {batchTags.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-sm text-muted-foreground">
                  {t('queued', { count: batchTags.length })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {batchTags.map((tag) => {
                    const row = items.get(tag)
                    return (
                      <Badge key={tag} variant="secondary" className="gap-1 font-mono">
                        {tag}
                        {row && (
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({row.status})
                          </span>
                        )}
                        <button onClick={() => setBatchTags((p) => p.filter((x) => x !== tag))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={submit}
              disabled={submitting || batchTags.length === 0}
            >
              {submitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle className="mr-2 h-4 w-4" />}
              {t('submit', { count: batchTags.length })}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              {t('results')}
              {results.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {t('resultSummary', { applied: appliedCount, rejected: rejectedCount })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">{t('noResults')}</div>
            ) : (
              <div className="space-y-2">
                {results.map((r) => {
                  const row = items.get(r.tagId.toUpperCase())
                  return (
                    <div key={r.clientUuid} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        {r.result === 'applied'
                          ? <CheckCircle className="h-4 w-4 text-chart-3" />
                          : <AlertCircle className="h-4 w-4 text-destructive" />}
                        <div>
                          <span className="font-mono text-sm font-medium">{r.tagId}</span>
                          {row?.customerName && (
                            <div className="text-xs text-muted-foreground">{row.customerName}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={r.result === 'applied' ? 'default' : 'destructive'}>
                          {t(`status.${r.result}`)}
                        </Badge>
                        {r.reason && <div className="mt-1 text-xs text-muted-foreground">{r.reason}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {appliedCount > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.itemsCount}</div>
                  <div className="text-sm text-muted-foreground">{t('itemsCheckedIn')}</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.customersCount}</div>
                  <div className="text-sm text-muted-foreground">{tCommon('customer')}</div>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.avgWashCycles}</div>
                  <div className="text-sm text-muted-foreground">{tCommon('average')} {tInventory('washCycles')}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
