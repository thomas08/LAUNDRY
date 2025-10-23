import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, Phone, MapPin, Calendar, Edit, Trash2 } from "lucide-react"

// Mock customer data
const customer = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street, Apt 4B, New York, NY 10001",
  joinDate: "2024-03-15",
  totalOrders: 24,
  totalSpent: "$1,248.50",
  status: "active" as const,
}

const orderHistory = [
  {
    id: "ORD-024",
    date: "2025-01-13",
    service: "Dry Cleaning",
    items: 5,
    amount: "$45.00",
    status: "processing" as const,
  },
  {
    id: "ORD-023",
    date: "2025-01-08",
    service: "Wash & Fold",
    items: 3,
    amount: "$28.50",
    status: "completed" as const,
  },
  {
    id: "ORD-022",
    date: "2025-01-02",
    service: "Ironing Service",
    items: 8,
    amount: "$52.00",
    status: "delivered" as const,
  },
  {
    id: "ORD-021",
    date: "2024-12-28",
    service: "Dry Cleaning",
    items: 4,
    amount: "$38.00",
    status: "delivered" as const,
  },
  {
    id: "ORD-020",
    date: "2024-12-20",
    service: "Wash & Fold",
    items: 6,
    amount: "$42.00",
    status: "delivered" as const,
  },
]

const statusColors = {
  pending: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  processing: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  completed: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  delivered: "bg-accent/20 text-accent border-accent/30",
}

export default function CustomerDetailPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
          <p className="mt-2 text-muted-foreground">Customer details and order history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information */}
        <div className="lg:col-span-1">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm text-foreground">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <Phone className="h-5 w-5 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="mt-1 text-sm text-foreground">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                  <MapPin className="h-5 w-5 text-chart-3" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{customer.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Customer Since</p>
                  <p className="mt-1 text-sm text-foreground">{customer.joinDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Stats */}
          <Card className="mt-6 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Orders</span>
                <span className="text-lg font-semibold text-foreground">{customer.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="text-lg font-semibold text-foreground">{customer.totalSpent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-chart-3/20 text-chart-3 border-chart-3/30">
                  {customer.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Order ID</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Service</TableHead>
                      <TableHead className="text-muted-foreground">Items</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory.map((order) => (
                      <TableRow key={order.id} className="border-border hover:bg-accent/50">
                        <TableCell className="font-mono text-sm text-foreground">{order.id}</TableCell>
                        <TableCell className="text-muted-foreground">{order.date}</TableCell>
                        <TableCell className="text-foreground">{order.service}</TableCell>
                        <TableCell className="text-muted-foreground">{order.items}</TableCell>
                        <TableCell className="font-medium text-foreground">{order.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[order.status]}>
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
