import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Activity {
  id: string
  customer: string
  service: string
  status: "pending" | "processing" | "completed" | "delivered"
  amount: string
  date: string
}

const activities: Activity[] = [
  {
    id: "ORD-001",
    customer: "Sarah Johnson",
    service: "Dry Cleaning",
    status: "processing",
    amount: "$45.00",
    date: "2025-01-13",
  },
  {
    id: "ORD-002",
    customer: "Michael Chen",
    service: "Wash & Fold",
    status: "completed",
    amount: "$28.50",
    date: "2025-01-13",
  },
  {
    id: "ORD-003",
    customer: "Emily Davis",
    service: "Ironing Service",
    status: "delivered",
    amount: "$35.00",
    date: "2025-01-12",
  },
  {
    id: "ORD-004",
    customer: "James Wilson",
    service: "Dry Cleaning",
    status: "pending",
    amount: "$52.00",
    date: "2025-01-12",
  },
  {
    id: "ORD-005",
    customer: "Lisa Anderson",
    service: "Wash & Fold",
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
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Order ID</TableHead>
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-muted-foreground">Service</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id} className="border-border hover:bg-accent/50">
                  <TableCell className="font-mono text-sm text-foreground">{activity.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{activity.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{activity.service}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[activity.status]}>
                      {activity.status}
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
