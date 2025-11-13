"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

interface Activity {
  id: string
  customer: string
  service: "dryCleaning" | "washFold" | "ironing"
  status: "pending" | "processing" | "completed" | "delivered"
  amount: string
  date: string
}

const activities: Activity[] = [
  {
    id: "ORD-001",
    customer: "Sarah Johnson",
    service: "dryCleaning",
    status: "processing",
    amount: "$45.00",
    date: "2025-01-13",
  },
  {
    id: "ORD-002",
    customer: "Michael Chen",
    service: "washFold",
    status: "completed",
    amount: "$28.50",
    date: "2025-01-13",
  },
  {
    id: "ORD-003",
    customer: "Emily Davis",
    service: "ironing",
    status: "delivered",
    amount: "$35.00",
    date: "2025-01-12",
  },
  {
    id: "ORD-004",
    customer: "James Wilson",
    service: "dryCleaning",
    status: "pending",
    amount: "$52.00",
    date: "2025-01-12",
  },
  {
    id: "ORD-005",
    customer: "Lisa Anderson",
    service: "washFold",
    status: "processing",
    amount: "$31.25",
    date: "2025-01-11",
  },
]

const statusColors = {
  pending: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  processing: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  completed: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  delivered: "bg-accent/20 text-accent border-accent/30",
}

export function ActivitiesTable() {
  const t = useTranslations('dashboard')

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
              {activities.map((activity) => (
                <TableRow key={activity.id} className="border-border hover:bg-accent/50">
                  <TableCell className="font-mono text-sm text-foreground">{activity.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{activity.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{t(`services.${activity.service}`)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[activity.status]}>
                      {t(`statuses.${activity.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{activity.amount}</TableCell>
                  <TableCell className="text-muted-foreground">{activity.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
