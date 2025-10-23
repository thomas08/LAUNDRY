'use client'

import { useState } from "react"
import { LinenItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Scan, Plus, CheckCircle, AlertCircle } from "lucide-react"

export default function CheckInPage() {
  const [tagId, setTagId] = useState("")
  const [checkedInItems, setCheckedInItems] = useState<LinenItem[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Mock linen inventory data for lookup
  const mockInventory: LinenItem[] = [
    {
      tagId: "LN001",
      type: "Bed Sheet",
      customerId: "1",
      status: "On-Rent",
      washCycles: 12,
    },
    {
      tagId: "LN002",
      type: "Towel",
      customerId: "2",
      status: "On-Rent",
      washCycles: 8,
    },
    {
      tagId: "LN005",
      type: "Pillow Case",
      customerId: "4",
      status: "On-Rent",
      washCycles: 22,
    },
    {
      tagId: "LN009",
      type: "Tablecloth",
      customerId: "3",
      status: "On-Rent",
      washCycles: 15,
    },
  ]

  const handleCheckIn = () => {
    if (!tagId.trim()) {
      setAlert({ type: 'error', message: 'Please enter a Tag ID' })
      return
    }

    // Check if item already checked in
    if (checkedInItems.some(item => item.tagId === tagId)) {
      setAlert({ type: 'error', message: `Item ${tagId} has already been checked in` })
      return
    }

    // Find item in inventory
    const item = mockInventory.find(item => item.tagId === tagId)

    if (!item) {
      setAlert({ type: 'error', message: `Item ${tagId} not found in inventory` })
      return
    }

    if (item.status !== 'On-Rent') {
      setAlert({ type: 'error', message: `Item ${tagId} is not currently on rent (Status: ${item.status})` })
      return
    }

    // Create checked-in item with updated status
    const checkedInItem: LinenItem = {
      ...item,
      status: 'Washing'
    }

    setCheckedInItems(prev => [...prev, checkedInItem])
    setAlert({ type: 'success', message: `Item ${tagId} successfully checked in` })
    setTagId("")

    // Clear alert after 3 seconds
    setTimeout(() => setAlert(null), 3000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheckIn()
    }
  }

  const getStatusColor = (status: LinenItem['status']) => {
    switch (status) {
      case 'Washing':
        return "bg-chart-2/20 text-chart-2 border-chart-2/30"
      case 'On-Rent':
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30"
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Check-In Linen Items</h1>
        <p className="mt-2 text-muted-foreground">Process returned linen items and update their status</p>
      </div>

      {/* Check-in Form */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Scan className="h-5 w-5" />
            Scan or Enter Tag ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter Tag ID (e.g., LN001)"
                value={tagId}
                onChange={(e) => setTagId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="text-lg"
                autoFocus
              />
            </div>
            <Button
              onClick={handleCheckIn}
              className="px-6"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Check In
            </Button>
          </div>

          {alert && (
            <Alert className={`mt-4 ${alert.type === 'success' ? 'border-chart-3 bg-chart-3/10' : 'border-destructive bg-destructive/10'}`}>
              {alert.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-chart-3" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className={alert.type === 'success' ? 'text-chart-3' : 'text-destructive'}>
                {alert.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Checked-in Items */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            Checked-in Items ({checkedInItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkedInItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Tag ID</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Customer ID</TableHead>
                    <TableHead className="text-muted-foreground">Previous Status</TableHead>
                    <TableHead className="text-muted-foreground">New Status</TableHead>
                    <TableHead className="text-muted-foreground">Wash Cycles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInItems.map((item, index) => (
                    <TableRow key={`${item.tagId}-${index}`} className="border-border hover:bg-accent/50">
                      <TableCell className="font-mono text-sm text-foreground">{item.tagId}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.type}</TableCell>
                      <TableCell className="text-muted-foreground">{item.customerId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-chart-4/20 text-chart-4 border-chart-4/30">
                          On-Rent
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.washCycles}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No items checked in yet. Scan or enter a Tag ID above to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {checkedInItems.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{checkedInItems.length}</div>
                <div className="text-sm text-muted-foreground">Items Checked In</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {new Set(checkedInItems.map(item => item.customerId)).size}
                </div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(checkedInItems.reduce((sum, item) => sum + item.washCycles, 0) / checkedInItems.length)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Wash Cycles</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}