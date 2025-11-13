"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Printer, Search, Package, User, Calendar, MapPin } from "lucide-react"
import { toast } from "sonner"

interface OrderItem {
  id: string
  name: string
  quantity: number
  color: string
  notes?: string
}

interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerAddress: string
  pickupDate: string
  items: OrderItem[]
  status: "pending" | "ready" | "dispatched"
}

// Mock data
const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "John Doe",
    customerPhone: "+66 81 234 5678",
    customerAddress: "123 Main St, Bangkok 10110",
    pickupDate: "2025-11-15",
    items: [
      { id: "1", name: "Shirt", quantity: 3, color: "White" },
      { id: "2", name: "Pants", quantity: 2, color: "Blue", notes: "Iron only" },
      { id: "3", name: "Dress", quantity: 1, color: "Red" },
    ],
    status: "ready",
  },
  {
    id: "ORD-002",
    customerName: "Jane Smith",
    customerPhone: "+66 82 345 6789",
    customerAddress: "456 Second Ave, Bangkok 10220",
    pickupDate: "2025-11-14",
    items: [
      { id: "4", name: "Suit", quantity: 1, color: "Black" },
      { id: "5", name: "Shirt", quantity: 5, color: "Mixed" },
    ],
    status: "ready",
  },
]

export function DispatchLabel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const handleSelectOrder = (orderId: string) => {
    const order = mockOrders.find(o => o.id === orderId)
    setSelectedOrder(order || null)
  }

  const handlePrintLabel = () => {
    if (!selectedOrder) {
      toast.error("Please select an order first")
      return
    }

    // In production, this would trigger actual printing
    toast.success(`Label printed for order ${selectedOrder.id}`)

    // Here you would implement the actual print logic
    window.print()
  }

  const filteredOrders = mockOrders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column: Order Selection */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Order</CardTitle>
            <CardDescription>Search and select an order to print dispatch label</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Order Selection */}
            <div className="space-y-2">
              <Label>Order</Label>
              <Select onValueChange={handleSelectOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.id}</span>
                        <span className="text-muted-foreground">- {order.customerName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Details */}
            {selectedOrder && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{selectedOrder.customerName}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.customerPhone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerAddress}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Pickup: {new Date(selectedOrder.pickupDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                  <Badge variant={selectedOrder.status === "ready" ? "default" : "secondary"}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        {selectedOrder && (
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Items included in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Label Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Label Preview</CardTitle>
            <CardDescription>Preview of the dispatch label</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                {/* Print-ready label */}
                <div id="dispatch-label" className="rounded-lg border-2 border-dashed border-border p-6 space-y-4 bg-card">
                  {/* Header */}
                  <div className="text-center border-b border-border pb-4">
                    <h2 className="text-2xl font-bold">LinenFlow™</h2>
                    <p className="text-sm text-muted-foreground">Laundry Dispatch Label</p>
                  </div>

                  {/* Order Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Order ID:</span>
                      <span className="text-sm">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Date:</span>
                      <span className="text-sm">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <h3 className="font-semibold">Customer Details</h3>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">Name:</span> {selectedOrder.customerName}</p>
                      <p className="text-sm"><span className="font-medium">Phone:</span> {selectedOrder.customerPhone}</p>
                      <p className="text-sm"><span className="font-medium">Address:</span> {selectedOrder.customerAddress}</p>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <h3 className="font-semibold">Items Summary</h3>
                    <div className="space-y-1">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name} ({item.color})</span>
                          <span>×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold">
                      <span>Total Items:</span>
                      <span>{selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                  </div>

                  {/* Pickup Date */}
                  <div className="border-t border-border pt-4">
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Pickup Date</p>
                      <p className="text-lg font-bold">
                        {new Date(selectedOrder.pickupDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Barcode placeholder */}
                  <div className="border-t border-border pt-4">
                    <div className="bg-muted h-16 rounded flex items-center justify-center">
                      <p className="text-xs text-muted-foreground font-mono">{selectedOrder.id}</p>
                    </div>
                  </div>
                </div>

                {/* Print Button */}
                <Button
                  onClick={handlePrintLabel}
                  className="w-full"
                  size="lg"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Print Label
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Order Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select an order from the list to preview and print the dispatch label
                </p>
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
