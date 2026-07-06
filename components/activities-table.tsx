"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { fetchJobOrders } from "@/lib/api/job-orders"
import type { JobOrder } from "@/lib/types"

const statusColors: Record<string, string> = {
  received: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  washing: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  ready: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  completed: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  delivered: "bg-accent/20 text-accent border-accent/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
}

const humanize = (s?: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export function ActivitiesTable({ branchId }: { branchId?: string }) {
  const t = useTranslations('dashboard')
  const [orders, setOrders] = useState<JobOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchJobOrders()
      .then((data) => { if (!cancelled) setOrders(data.slice(0, 6)) })
      .catch(() => { if (!cancelled) setOrders([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [branchId])

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">{t('recentActivities')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">{t('orderId')}</TableHead>
                <TableHead className="text-muted-foreground">{t('customer')}</TableHead>
                <TableHead className="text-muted-foreground">{t('service')}</TableHead>
                <TableHead className="text-muted-foreground">{t('status')}</TableHead>
                <TableHead className="text-muted-foreground">{t('amount')}</TableHead>
                <TableHead className="text-muted-foreground">{t('date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">…</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {t('noRecentActivity')}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id} className="border-border hover:bg-accent/50">
                    <TableCell className="font-mono text-sm text-foreground">{o.orderNumber}</TableCell>
                    <TableCell className="font-medium text-foreground">{o.customerName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{humanize(o.serviceType)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[o.status] || "border-border text-muted-foreground"}>
                        {humanize(o.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      ฿{Number(o.totalPrice ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(o.receivedAt || o.createdAt || '').slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
