import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, ArrowRight } from "lucide-react"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  orders: number
  status: "active" | "inactive"
}

interface CustomerCardProps {
  customer: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Card className="border-border bg-card transition-colors hover:bg-accent/50">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{customer.name}</h3>
            <Badge variant="outline" className="mt-2 bg-chart-3/20 text-chart-3 border-chart-3/30">
              {customer.status}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">{customer.orders} orders</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{customer.phone}</span>
          </div>
        </div>

        <Link href={`/customers/${customer.id}`}>
          <Button variant="outline" className="mt-4 w-full bg-transparent" size="sm">
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}