'use client'

import { useState } from "react"
import { LinenItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")

  // Mock linen inventory data
  const linenItems: LinenItem[] = [
    {
      tagId: "LN001",
      type: "Bed Sheet",
      customerId: "1",
      status: "In Stock",
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
      tagId: "LN003",
      type: "Tablecloth",
      customerId: "3",
      status: "Washing",
      washCycles: 15,
    },
    {
      tagId: "LN004",
      type: "Bed Sheet",
      customerId: "1",
      status: "In Stock",
      washCycles: 5,
    },
    {
      tagId: "LN005",
      type: "Pillow Case",
      customerId: "4",
      status: "On-Rent",
      washCycles: 22,
    },
    {
      tagId: "LN006",
      type: "Towel",
      customerId: "2",
      status: "In Stock",
      washCycles: 18,
    },
    {
      tagId: "LN007",
      type: "Uniform",
      customerId: "4",
      status: "Washing",
      washCycles: 9,
    },
    {
      tagId: "LN008",
      type: "Tablecloth",
      customerId: "3",
      status: "In Stock",
      washCycles: 7,
    },
  ]

  // Filter items based on search term (searches Type and Tag ID)
  const filteredItems = linenItems.filter((item) =>
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tagId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Status color mapping
  const getStatusColor = (status: LinenItem['status']) => {
    switch (status) {
      case 'In Stock':
        return "bg-chart-3/20 text-chart-3 border-chart-3/30"
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
        <h1 className="text-3xl font-bold text-foreground">Linen Inventory</h1>
        <p className="mt-2 text-muted-foreground">Track and manage your linen items</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Inventory Items</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by type or tag ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Tag ID</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Customer ID</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Wash Cycles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.tagId} className="border-border hover:bg-accent/50">
                      <TableCell className="font-mono text-sm text-foreground">{item.tagId}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.type}</TableCell>
                      <TableCell className="text-muted-foreground">{item.customerId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.washCycles}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No items found matching "{searchTerm}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredItems.length} of {linenItems.length} items
          </div>
        </CardContent>
      </Card>
    </div>
  )
}