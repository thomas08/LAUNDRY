'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
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
  Package, Plus, CheckCircle, AlertCircle, Loader2, X, ScanLine,
} from 'lucide-react'

const DEVICE_ID = 'web-registration' // browser acts as the single scanner station (MVP)
const OWNERSHIPS: LinenOwnership[] = ['rental', 'customer_owned']

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

  const [singleTag, setSingleTag] = useState('')
  const [batchInput, setBatchInput] = useState('')
  const [batchTags, setBatchTags] = useState<string[]>([])

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

  const appliedCount = results.filter((r) => r.result === 'applied').length
  const rejectedCount = results.filter((r) => r.result === 'rejected').length

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
            <Tabs defaultValue="single">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">{t('single')}</TabsTrigger>
                <TabsTrigger value="batch">{t('batch')}</TabsTrigger>
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
                {results.map((r) => (
                  <div key={r.clientUuid} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      {r.result === 'applied'
                        ? <CheckCircle className="h-4 w-4 text-chart-3" />
                        : <AlertCircle className="h-4 w-4 text-destructive" />}
                      <span className="font-mono text-sm font-medium">{r.tagId}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.result === 'applied' ? 'default' : 'destructive'}>
                        {t(`status.${r.result}`)}
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
