'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import type { LinenArticle, LinenOwnership } from '@/lib/types'
import { fetchArticles } from '@/lib/api/articles'
import { syncBatch, buildRegistrationEvents, type SyncEventResult } from '@/lib/api/sync'
import { ApiError } from '@/lib/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Package, Plus, CheckCircle, AlertCircle, Loader2, X, ScanLine, Volume2, VolumeX, Trash2, Keyboard,
} from 'lucide-react'

type ScanResultKind = 'applied' | 'rejected' | 'duplicate'
interface ScanEntry {
  key: string
  tagId: string
  result: ScanResultKind
  reason?: string
}

const DEVICE_ID = 'web-registration' // browser acts as the single scanner station (MVP)
const OWNERSHIPS: LinenOwnership[] = ['rental', 'customer_owned']
const MAX_MANUAL = 500 // cap non-RFID key-in per submit (protects the batch + DB)

interface RegResult extends SyncEventResult {
  tagId: string
}

export default function RegisterLinenPage() {
  const t = useTranslations('register')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [articles, setArticles] = useState<LinenArticle[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [articleId, setArticleId] = useState<string>('')
  const [ownership, setOwnership] = useState<LinenOwnership>('rental')

  const [mode, setMode] = useState<'single' | 'batch' | 'scanner' | 'manual'>('single')
  const [singleTag, setSingleTag] = useState('')
  const [batchInput, setBatchInput] = useState('')
  const [batchTags, setBatchTags] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')

  // Scanner mode: hardware keyboard-wedge gun typing tag+Enter, one register per shot
  const [scanValue, setScanValue] = useState('')
  const [scanLog, setScanLog] = useState<ScanEntry[]>([])
  const [soundOn, setSoundOn] = useState(true)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const scanBusyRef = useRef(false)

  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<RegResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === articleId) || null,
    [articles, articleId]
  )

  const load = useCallback(async () => {
    setLoadingArticles(true)
    try {
      const list = await fetchArticles(branchId ?? undefined)
      setArticles(list)
    } catch {
      setArticles([])
    } finally {
      setLoadingArticles(false)
    }
  }, [branchId])

  useEffect(() => { load() }, [load])

  // Default the owner to the article's default when the article changes.
  useEffect(() => {
    if (selectedArticle) setOwnership(selectedArticle.defaultOwnership)
  }, [selectedArticle])

  const register = useCallback(
    async (tagIds: string[]) => {
      setError(null)
      setResults([])
      if (!branchId) { setError(t('noBranch')); return }
      if (!selectedArticle) { setError(t('selectArticle')); return }
      const cleaned = Array.from(new Set(tagIds.map((x) => x.trim().toUpperCase()).filter(Boolean)))
      if (cleaned.length === 0) { setError(t('noTags')); return }

      setSubmitting(true)
      try {
        const events = buildRegistrationEvents({
          tagIds: cleaned,
          branchId,
          articleId: selectedArticle.id,
          type: selectedArticle.name,
          ownership,
        })
        const byUuid = new Map(events.map((e) => [e.clientUuid, e.tagId]))
        const res = await syncBatch(DEVICE_ID, events)
        setResults(res.map((r) => ({ ...r, tagId: byUuid.get(r.clientUuid) ?? '?' })))
        return res
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('submitError'))
      } finally {
        setSubmitting(false)
      }
    },
    [branchId, selectedArticle, ownership, t]
  )

  // Short audio cue so the operator can keep eyes on the linen, not the screen.
  const beep = useCallback((ok: boolean) => {
    if (!soundOn) return
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = ok ? 880 : 220
      const dur = ok ? 0.12 : 0.28
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start()
      osc.stop(ctx.currentTime + dur)
      osc.onended = () => ctx.close()
    } catch { /* audio is best-effort */ }
  }, [soundOn])

  // Scanner mode: register a single tag immediately, append to a cumulative log.
  const submitScan = useCallback(
    async (raw: string) => {
      const tag = raw.trim().toUpperCase()
      setScanValue('')
      if (!tag) return
      if (!branchId) { setError(t('noBranch')); return }
      if (!selectedArticle) { setError(t('scannerContextRequired')); beep(false); return }
      setError(null)
      // guard: same tag already registered this session
      if (scanLog.some((e) => e.tagId === tag && e.result === 'applied')) {
        setScanLog((prev) => [{ key: crypto.randomUUID(), tagId: tag, result: 'duplicate', reason: t('duplicateReason') }, ...prev])
        beep(false)
        scanInputRef.current?.focus()
        return
      }
      if (scanBusyRef.current) return
      scanBusyRef.current = true
      try {
        const events = buildRegistrationEvents({
          tagIds: [tag], branchId, articleId: selectedArticle.id, type: selectedArticle.name, ownership,
        })
        const res = await syncBatch(DEVICE_ID, events)
        const kind: ScanResultKind = res[0]?.result === 'applied' ? 'applied' : 'rejected'
        setScanLog((prev) => [{ key: crypto.randomUUID(), tagId: tag, result: kind, reason: res[0]?.reason }, ...prev])
        beep(kind === 'applied')
      } catch (err) {
        setScanLog((prev) => [{ key: crypto.randomUUID(), tagId: tag, result: 'rejected', reason: err instanceof ApiError ? err.message : t('submitError') }, ...prev])
        beep(false)
      } finally {
        scanBusyRef.current = false
        scanInputRef.current?.focus() // keep focus for the next shot
      }
    },
    [branchId, selectedArticle, ownership, scanLog, t, beep]
  )

  // Focus the scan field when entering scanner mode (with a chosen article).
  useEffect(() => {
    if (mode === 'scanner' && articleId) scanInputRef.current?.focus()
  }, [mode, articleId])

  const submitSingle = async () => {
    const tag = singleTag
    const res = await register([tag])
    if (res && res[0]?.result === 'applied') setSingleTag('')
  }

  const addBatchTag = () => {
    const v = batchInput.trim().toUpperCase()
    if (!v) return
    setBatchTags((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setBatchInput('')
  }

  const submitBatch = async () => {
    const res = await register(batchTags)
    // Clear the queue only if every tag was accepted; otherwise leave the
    // failed ones visible so the operator can review/retry.
    if (res && res.every((r) => r.result === 'applied')) setBatchTags([])
  }

  // Manual key-in: no scanning — enter a quantity of non-RFID linen and let the
  // system mint internal codes (NR-...). Each piece still becomes one linen_item
  // through the same item_receive pipeline, so counts stay unified with RFID stock.
  const submitManual = async () => {
    const qty = parseInt(quantity, 10)
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_MANUAL) { setError(t('invalidQuantity')); return }
    const stamp = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    const codes = Array.from({ length: qty }, (_, i) => `NR-${stamp}${rand}-${String(i + 1).padStart(4, '0')}`)
    const res = await register(codes)
    if (res && res.every((r) => r.result === 'applied')) setQuantity('')
  }

  const appliedCount = results.filter((r) => r.result === 'applied').length
  const rejectedCount = results.filter((r) => r.result === 'rejected').length

  const isScanner = mode === 'scanner'
  const displayList: ScanEntry[] = isScanner
    ? scanLog
    : results.map((r) => ({ key: r.clientUuid, tagId: r.tagId, result: r.result, reason: r.reason }))
  const scanRegistered = scanLog.filter((e) => e.result === 'applied').length
  const scanRejected = scanLog.filter((e) => e.result === 'rejected').length
  const scanDuplicate = scanLog.filter((e) => e.result === 'duplicate').length

  if (!hasPermission('create')) {
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

      {/* No articles yet → guide to create one first */}
      {!loadingArticles && articles.length === 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('noArticles')}{' '}
            <Link href="/inventory/articles" className="font-medium text-primary underline">
              {t('goToArticles')}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5" />
              {t('itemContext')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Article picker (shared by both modes) */}
            <div className="space-y-2">
              <Label>{t('article')} *</Label>
              <Select value={articleId} onValueChange={setArticleId} disabled={loadingArticles || articles.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingArticles ? t('loading') : t('selectArticle')} />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono">{a.code}</span> — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ownership (defaults from article, editable) */}
            <div className="space-y-2">
              <Label>{t('ownership')}</Label>
              <Select value={ownership} onValueChange={(v) => setOwnership(v as LinenOwnership)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNERSHIPS.map((o) => (
                    <SelectItem key={o} value={o}>{t(`ownershipLabels.${o}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('ownershipHint')}</p>
            </div>

            {/* Single / Batch */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="single">{t('single')}</TabsTrigger>
                <TabsTrigger value="batch">{t('batch')}</TabsTrigger>
                <TabsTrigger value="scanner">{t('scanner')}</TabsTrigger>
                <TabsTrigger value="manual">{t('manual')}</TabsTrigger>
              </TabsList>

              {/* Single */}
              <TabsContent value="single" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('tagId')} *</Label>
                  <Input
                    className="font-mono"
                    placeholder="LN0001"
                    value={singleTag}
                    onChange={(e) => setSingleTag(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSingle() } }}
                  />
                </div>
                <Button className="w-full" size="lg" onClick={submitSingle} disabled={submitting || !articleId}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {t('registerOne')}
                </Button>
              </TabsContent>

              {/* Batch */}
              <TabsContent value="batch" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('scanTag')}</Label>
                  <div className="flex gap-2">
                    <Input
                      className="font-mono"
                      placeholder="LN0001"
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBatchTag() } }}
                    />
                    <Button variant="outline" onClick={addBatchTag} title={t('addTag')}>
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('batchHint')}</p>
                </div>

                {batchTags.length > 0 && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 text-sm text-muted-foreground">
                      {t('queued', { count: batchTags.length })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {batchTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 font-mono">
                          {tag}
                          <button onClick={() => setBatchTags((p) => p.filter((x) => x !== tag))}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full" size="lg" onClick={submitBatch}
                  disabled={submitting || !articleId || batchTags.length === 0}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {t('registerBatch', { count: batchTags.length })}
                </Button>
              </TabsContent>

              {/* Scanner: hardware gun shoots tag+Enter; each shot registers instantly */}
              <TabsContent value="scanner" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">{t('scannerTitle')}</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSoundOn((s) => !s)}
                    title={soundOn ? t('soundOn') : t('soundOff')}
                    aria-label={soundOn ? t('soundOn') : t('soundOff')}
                  >
                    {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={scanInputRef}
                    className="h-16 pl-14 text-center font-mono text-xl tracking-wide"
                    placeholder={articleId ? t('scannerPlaceholder') : t('scannerContextRequired')}
                    value={scanValue}
                    disabled={!articleId}
                    autoComplete="off"
                    onChange={(e) => setScanValue(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitScan(scanValue) } }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('scannerHint')}</p>

                {/* Big live counter — the operator watches this, not the list below */}
                <div className="rounded-lg border border-border bg-muted/30 py-6 text-center">
                  <div className="text-7xl font-bold leading-none tabular-nums text-chart-3">{scanRegistered}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{t('registeredCount')}</div>
                  {(scanRejected > 0 || scanDuplicate > 0) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {scanRejected > 0 && `${scanRejected} ${t('status.rejected')}`}
                      {scanRejected > 0 && scanDuplicate > 0 && ' · '}
                      {scanDuplicate > 0 && `${scanDuplicate} ${t('duplicate')}`}
                    </div>
                  )}
                </div>

                {scanLog.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setScanLog([])}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('clearLog')}
                  </Button>
                )}
              </TabsContent>

              {/* Manual key-in: non-RFID linen — enter a quantity, no scanning */}
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base">{t('manualTitle')}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{t('quantity')} *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_MANUAL}
                    className="h-14 text-center text-xl"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitManual() } }}
                  />
                  <p className="text-xs text-muted-foreground">{t('quantityRange')} · {t('manualHint')}</p>
                </div>
                <Button className="w-full" size="lg" onClick={submitManual}
                  disabled={submitting || !articleId || !quantity}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {t('registerBatch', { count: parseInt(quantity, 10) || 0 })}
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {t('results')}
              {isScanner && scanLog.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {t('scannedSummary', { registered: scanRegistered, rejected: scanRejected, duplicate: scanDuplicate })}
                </span>
              )}
              {!isScanner && results.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {t('resultSummary', { applied: appliedCount, rejected: rejectedCount })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">{t('noResults')}</div>
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto">
                {displayList.map((r) => (
                  <div key={r.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      {r.result === 'applied'
                        ? <CheckCircle className="h-4 w-4 text-chart-3" />
                        : r.result === 'duplicate'
                          ? <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          : <AlertCircle className="h-4 w-4 text-destructive" />}
                      <span className="font-mono text-sm font-medium">{r.tagId}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.result === 'applied' ? 'default' : r.result === 'duplicate' ? 'secondary' : 'destructive'}>
                        {r.result === 'duplicate' ? t('duplicate') : t(`status.${r.result}`)}
                      </Badge>
                      {r.reason && <div className="mt-1 text-xs text-muted-foreground">{r.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
