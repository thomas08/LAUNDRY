import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Package } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="mt-2 text-muted-foreground">Analytics and insights for your laundry business</p>
      </div>

      {/* Reports Overview Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold text-foreground">$24,850</p>
                <p className="mt-2 text-sm font-medium text-chart-3">
                  +15.2% from last month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Items Processed</p>
                <p className="mt-2 text-3xl font-bold text-foreground">2,547</p>
                <p className="mt-2 text-sm font-medium text-chart-2">
                  +8.1% from last month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                <Package className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                <p className="mt-2 text-3xl font-bold text-foreground">89</p>
                <p className="mt-2 text-sm font-medium text-chart-3">
                  +12 new this month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                <Users className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Avg. Processing Time</p>
                <p className="mt-2 text-3xl font-bold text-foreground">2.3h</p>
                <p className="mt-2 text-sm font-medium text-chart-4">
                  -0.4h from last month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <BarChart3 className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Report */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Revenue Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="font-medium text-foreground">$12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Month</span>
                <span className="font-medium text-foreground">$10,830</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quarter Total</span>
                <span className="font-medium text-foreground">$35,280</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-medium text-foreground">Growth Rate</span>
                <span className="font-bold text-chart-3">+15.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Report */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Customer Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Customers</span>
                <span className="font-medium text-foreground">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Returning Customers</span>
                <span className="font-medium text-foreground">77</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Retention</span>
                <span className="font-medium text-foreground">86.5%</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-medium text-foreground">Avg. Order Value</span>
                <span className="font-bold text-chart-2">$45.30</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Report */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items In Stock</span>
                <span className="font-medium text-chart-3">156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items On Rent</span>
                <span className="font-medium text-chart-4">89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items Washing</span>
                <span className="font-medium text-chart-2">23</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-medium text-foreground">Utilization Rate</span>
                <span className="font-bold text-foreground">74.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Report */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Operational Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orders Completed</span>
                <span className="font-medium text-foreground">1,284</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orders Pending</span>
                <span className="font-medium text-foreground">48</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On-Time Delivery</span>
                <span className="font-medium text-foreground">96.8%</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-medium text-foreground">Customer Satisfaction</span>
                <span className="font-bold text-chart-3">4.8/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}