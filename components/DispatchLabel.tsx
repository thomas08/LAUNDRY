"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import { fetchJobOrders } from '@/lib/api/job-orders'
import { fetchCustomer } from '@/lib/api/customers'
import { syncBatch, buildStatusChangeEvents, type SyncEventResult } from '@/lib/api/sync'
import { ApiError } from '@/lib/api/client'
import type { JobOrder, Customer } from '@/lib/types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Printer, Package, User, ScanLine, X, CheckCircle, AlertCircle, Loader2, Truck,
} from "lucide-react"

const DEVICE_ID = 'web-dispatch' // browser acts as the single scanner station (MVP)
const NO_ORDER = '__none__'

interface DispatchResult extends SyncEventResult {
  tagId: string
}

export function DispatchLabel() {
  const t = useTranslations('dispatch')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [selectedJobOrderId, setSelectedJobOrderId] = useState<string>('')
  const [customer, setCustomer] = useState<Customer | null>(null)

  const [tagInput, setTagInput] = useState('')
  const [batchTags, setBatchTags] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<DispatchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Snapshot of what was actually dispatched (for the label).
  const [dispatched, setDispatched] = useState(false)
  const [labelTags, setLabelTags] = useState<string[]>([])
  const [labelOrder, setLabelOrder] = useState<JobOrder | null>(null)
  const [labelCustomer, setLabelCustomer] = useState<Customer | null>(null)

  const canUpdate = hasPermission('update')

  const selectedOrder = useMemo(
    () => jobOrders.find((j) => j.id === selectedJobOrderId) || null,
    [jobOrders, selectedJobOrderId]
  )

  // Load open job orders (not delivered / not cancelled) on mount.
  useEffect(() => {
    let alive = true
    fetchJobOrders()
      .then((list) => {
        if (!alive) return
        setJobOrders(list.filter((j) => j.status !== 'delivered' && j.status !== 'cancelled'))
      })
      .catch(() => { if (alive) setJobOrders([]) })
    return () => { alive = false }
  }, [])

  // When a job order is picked, load its customer for phone/address on the label.
  useEffect(() => {
    if (!selectedOrder) { setCustomer(null); return }
    let alive = true
    fetchCustomer(selectedOrder.customerId)
      .then((c) => { if (alive) setCustomer(c) })
      .catch(() => { if (alive) setCustomer(null) })
    return () => { alive = false }
  }, [selectedOrder])

  const addBatchTag = () => {
    const v = tagInput.trim().toUpperCase()
    if (!v) return
    setBatchTags((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setTagInput('')
  }

  const dispatch = useCallback(async () => {
    setError(null)
    setResults([])
    setDispatched(false)
    if (!branchId) { setError(t('noBranch')); return }
    const cleaned = Array.from(new Set(batchTags.map((x) => x.trim().toUpperCase()).filter(Boolean)))
    if (cleaned.length === 0) { setError(t('noTags')); return }

    setSubmitting(true)
    try {
      const events = buildStatusChangeEvents({
        tagIds: cleaned,
        branchId,
        newStatus: 'On-Rent',
        jobOrderId: selectedJobOrderId || null,
      })
      const byUuid = new Map(events.map((e) => [e.clientUuid, e.tagId]))
      const res = await syncBatch(DEVICE_ID, events)
      const mapped: DispatchResult[] = res.map((r) => ({ ...r, tagId: byUuid.get(r.clientUuid) ?? '?' }))
      setResults(mapped)

      const applied = mapped.filter((r) => r.result === 'applied').map((r) => r.tagId)
      if (applied.length > 0) {
        setLabelTags(applied)
        setLabelOrder(selectedOrder)
        setLabelCustomer(customer)
        setDispatched(true)
      }
      // Clear the queue only if every tag was accepted; keep failures for retry.
      if (mapped.every((r) => r.result === 'applied')) setBatchTags([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitError'))
    } finally {
      setSubmitting(false)
    }
  }, [branchId, batchTags, selectedJobOrderId, selectedOrder, customer, t])

  const appliedCount = results.filter((r) => r.result === 'applied').length
  const rejectedCount = results.filter((r) => r.result === 'rejected').length

  if (!canUpdate) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('noPermission')}</AlertDescription>
      </Alert>
    )
  }

  const labelCustomerName = labelCustomer?.name || labelOrder?.customerName || ''

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column: Order + scan */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('selectOrder')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job order picker (optional) */}
            <div className="space-y-2">
              <Label>{t('selectOrder')}</Label>
              <Select
                value={selectedJobOrderId || NO_ORDER}
                onValueChange={(v) => setSelectedJobOrderId(v === NO_ORDER ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOrderPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORDER}>{t('noOrder')}</SelectItem>
                  {jobOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      <span className="font-medium">{order.orderNumber}</span>
                      {order.customerName && (
                        <span className="text-muted-foreground"> — {order.customerName}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected order / customer summary */}
            {selectedOrder && (
              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{customer?.name || selectedOrder.customerName}</p>
                    {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{selectedOrder.status}</Badge>
                </div>
              </div>
            )}

            {/* Scan input */}
            <div className="space-y-2">
              <Label>{t('scanTag')}</Label>
              <div className="flex gap-2">
                <Input
                  className="font-mono text-lg"
                  placeholder="LN0001"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBatchTag() } }}
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

            <Button
              className="w-full"
              size="lg"
              onClick={dispatch}
              disabled={submitting || batchTags.length === 0}
            >
              {submitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Truck className="mr-2 h-4 w-4" />}
              {t('dispatch', { count: batchTags.length })}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('results')}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {t('resultSummary', { applied: appliedCount, rejected: rejectedCount })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Label Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('labelPreview')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dispatched && labelTags.length > 0 ? (
              <div className="space-y-4">
                {/* Print-ready label */}
                <div id="dispatch-label" className="rounded-lg border-2 border-dashed border-border p-6 space-y-4 bg-card">
                  {/* Header */}
                  <div className="text-center border-b border-border pb-4">
                    <h2 className="text-2xl font-bold">LinenFlow™</h2>
                    <p className="text-sm text-muted-foreground">{t('title')}</p>
                  </div>

                  {/* Order Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{t('orderId')}:</span>
                      <span className="text-sm">{labelOrder?.orderNumber || t('noOrder')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{t('date')}:</span>
                      <span className="text-sm">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {(labelCustomerName || labelCustomer) && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <h3 className="font-semibold">{t('customerDetails')}</h3>
                      <div className="space-y-1">
                        {labelCustomerName && (
                          <p className="text-sm"><span className="font-medium">{t('name')}:</span> {labelCustomerName}</p>
                        )}
                        {labelCustomer?.phone && (
                          <p className="text-sm"><span className="font-medium">{t('phone')}:</span> {labelCustomer.phone}</p>
                        )}
                        {labelCustomer?.address && (
                          <p className="text-sm"><span className="font-medium">{t('address')}:</span> {labelCustomer.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dispatched tags */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <h3 className="font-semibold">{t('itemsSummary')}</h3>
                    <div className="space-y-1">
                      {labelTags.map((tag) => (
                        <div key={tag} className="flex justify-between text-sm font-mono">
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold">
                      <span>{t('totalItems')}:</span>
                      <span>{labelTags.length}</span>
                    </div>
                  </div>

                  {/* Barcode placeholder */}
                  <div className="border-t border-border pt-4">
                    <div className="bg-muted h-16 rounded flex items-center justify-center">
                      <p className="text-xs text-muted-foreground font-mono">
                        {labelOrder?.orderNumber || labelTags[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Print Button */}
                <Button onClick={() => window.print()} className="w-full" size="lg">
                  <Printer className="mr-2 h-5 w-5" />
                  {t('printLabel')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">{t('noOrderSelected')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #dispatch-label,
          #dispatch-label * {
            visibility: visible;
          }
          #dispatch-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            background: white;
          }
        }
      `}</style>
    </div>
  )
}
