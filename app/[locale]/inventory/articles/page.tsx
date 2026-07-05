'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import type { LinenArticle, LinenCategory, LinenOwnership } from '@/lib/types'
import {
  fetchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  type ArticleInput,
} from '@/lib/api/articles'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Tag, Loader2, AlertCircle, Search } from 'lucide-react'

const CATEGORIES: LinenCategory[] = [
  'bed_sheet', 'pillow_case', 'towel', 'bath_towel', 'tablecloth',
  'napkin', 'uniform', 'apron', 'curtain', 'blanket', 'other',
]
const OWNERSHIPS: LinenOwnership[] = ['rental', 'customer_owned']

const emptyForm: ArticleInput = {
  code: '', name: '', nameTh: '', category: 'bed_sheet', size: '', color: '',
  defaultOwnership: 'rental', unitPrice: undefined, parLevel: undefined,
}

export default function ArticlesPage() {
  const t = useTranslations('articles')
  const tc = useTranslations('common')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [articles, setArticles] = useState<LinenArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setArticles(await fetchArticles(branchId ?? undefined))
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [branchId, t])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((a) =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.nameTh ?? '').toLowerCase().includes(q)
    )
  }, [articles, search])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, branchId: branchId ?? null })
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (a: LinenArticle) => {
    setEditingId(a.id)
    setForm({
      code: a.code, name: a.name, nameTh: a.nameTh ?? '', nameEn: a.nameEn ?? '',
      category: a.category, size: a.size ?? '', color: a.color ?? '',
      defaultOwnership: a.defaultOwnership, unitPrice: a.unitPrice ?? undefined,
      parLevel: a.parLevel ?? undefined, branchId: a.branchId ?? null,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const set = (k: keyof ArticleInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setFormError(null)
    if (!form.code.trim() || !form.name.trim()) {
      setFormError(t('codeNameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload: ArticleInput = {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        unitPrice: form.unitPrice === undefined || (form.unitPrice as any) === '' ? null : Number(form.unitPrice),
        parLevel: form.parLevel === undefined || (form.parLevel as any) === '' ? null : Number(form.parLevel),
      }
      if (editingId) {
        await updateArticle(editingId, payload)
      } else {
        await createArticle(payload)
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_CODE') {
        setFormError(t('duplicateCode'))
      } else {
        setFormError(err instanceof ApiError ? err.message : t('saveError'))
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (a: LinenArticle) => {
    if (!confirm(t('confirmDelete', { name: a.name }))) return
    try {
      await deleteArticle(a.id)
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
            {t('addArticle')}
          </Button>
        )}
      </div>

      <Card className="mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('ownership')}</TableHead>
              <TableHead className="text-right">{t('unitPrice')}</TableHead>
              <TableHead className="text-right">{t('parLevel')}</TableHead>
              <TableHead className="text-right">{tc('edit')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    {a.nameTh && a.nameTh !== a.name && (
                      <div className="text-xs text-muted-foreground">{a.nameTh}</div>
                    )}
                    {(a.size || a.color) && (
                      <div className="text-xs text-muted-foreground">
                        {[a.size, a.color].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {t(`categories.${a.category}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.defaultOwnership === 'rental' ? 'default' : 'secondary'}>
                      {t(`ownershipLabels.${a.defaultOwnership}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.unitPrice != null ? `฿${a.unitPrice.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">{a.parLevel ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('update') && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)} title={tc('edit')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('delete') && (
                        <Button variant="ghost" size="icon" onClick={() => remove(a)} title={tc('delete')}>
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
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('editArticle') : t('addArticle')}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('code')} *</Label>
              <Input className="font-mono" value={form.code}
                onChange={(e) => set('code', e.target.value)} placeholder="BST-70140-WHT" />
            </div>
            <div className="space-y-2">
              <Label>{t('category')} *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('name')} *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Bath Towel 70x140 White" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('nameTh')}</Label>
              <Input value={form.nameTh ?? ''} onChange={(e) => set('nameTh', e.target.value)}
                placeholder="ผ้าเช็ดตัว 70x140 ขาว" />
            </div>
            <div className="space-y-2">
              <Label>{t('size')}</Label>
              <Input value={form.size ?? ''} onChange={(e) => set('size', e.target.value)} placeholder="70x140" />
            </div>
            <div className="space-y-2">
              <Label>{t('color')}</Label>
              <Input value={form.color ?? ''} onChange={(e) => set('color', e.target.value)} placeholder="White" />
            </div>
            <div className="space-y-2">
              <Label>{t('ownership')}</Label>
              <Select value={form.defaultOwnership} onValueChange={(v) => set('defaultOwnership', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNERSHIPS.map((o) => (
                    <SelectItem key={o} value={o}>{t(`ownershipLabels.${o}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('unitPrice')} (฿)</Label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice ?? ''}
                onChange={(e) => set('unitPrice', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('parLevel')}</Label>
              <Input type="number" min="0" value={form.parLevel ?? ''}
                onChange={(e) => set('parLevel', e.target.value)} />
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
