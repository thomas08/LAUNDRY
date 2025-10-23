'use client'

import { useState } from "react"
import { LinenItem, Customer } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Package, Plus, CheckCircle, AlertCircle, Save } from "lucide-react"

export default function AddItemPage() {
  const [formData, setFormData] = useState({
    tagId: '',
    type: '',
    customerId: '',
    status: 'In Stock' as LinenItem['status'],
    washCycles: 0
  })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [addedItems, setAddedItems] = useState<LinenItem[]>([])

  // Mock customers for dropdown
  const customers: Customer[] = [
    { id: "1", name: "Sarah Johnson", contactPerson: "Sarah Johnson", email: "sarah.johnson@email.com", phone: "+1 (555) 123-4567" },
    { id: "2", name: "Michael Chen", contactPerson: "Michael Chen", email: "michael.chen@email.com", phone: "+1 (555) 234-5678" },
    { id: "3", name: "Emily Davis", contactPerson: "Emily Davis", email: "emily.davis@email.com", phone: "+1 (555) 345-6789" },
    { id: "4", name: "Riverside Hotel", contactPerson: "James Wilson", email: "james.wilson@riversidehotel.com", phone: "+1 (555) 987-6543" },
  ]

  // Common linen types
  const linenTypes = [
    "Bed Sheet", "Pillow Case", "Towel", "Bath Towel", "Tablecloth",
    "Napkin", "Uniform", "Apron", "Curtain", "Blanket"
  ]

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    if (!formData.tagId.trim()) {
      setAlert({ type: 'error', message: 'Tag ID is required' })
      return false
    }
    if (!formData.type.trim()) {
      setAlert({ type: 'error', message: 'Linen type is required' })
      return false
    }
    if (!formData.customerId) {
      setAlert({ type: 'error', message: 'Customer is required' })
      return false
    }
    if (formData.washCycles < 0) {
      setAlert({ type: 'error', message: 'Wash cycles cannot be negative' })
      return false
    }

    // Check if tag ID already exists
    if (addedItems.some(item => item.tagId === formData.tagId.toUpperCase())) {
      setAlert({ type: 'error', message: `Tag ID ${formData.tagId.toUpperCase()} already exists` })
      return false
    }

    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const newItem: LinenItem = {
      tagId: formData.tagId.toUpperCase(),
      type: formData.type,
      customerId: formData.customerId,
      status: formData.status,
      washCycles: formData.washCycles
    }

    setAddedItems(prev => [...prev, newItem])
    setAlert({ type: 'success', message: `Item ${newItem.tagId} successfully added to inventory` })

    // Reset form
    setFormData({
      tagId: '',
      type: '',
      customerId: '',
      status: 'In Stock',
      washCycles: 0
    })

    // Clear alert after 3 seconds
    setTimeout(() => setAlert(null), 3000)
  }

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

  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || 'Unknown'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add Linen Item</h1>
        <p className="mt-2 text-muted-foreground">Manually register new linen items to the inventory</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Add Item Form */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Package className="h-5 w-5" />
              Item Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tag ID */}
              <div className="space-y-2">
                <Label htmlFor="tagId" className="text-sm font-medium text-foreground">
                  Tag ID *
                </Label>
                <Input
                  id="tagId"
                  placeholder="Enter unique tag ID (e.g., LN010)"
                  value={formData.tagId}
                  onChange={(e) => handleInputChange('tagId', e.target.value.toUpperCase())}
                  className="font-mono"
                  required
                />
              </div>

              {/* Linen Type */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium text-foreground">
                  Linen Type *
                </Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select linen type" />
                  </SelectTrigger>
                  <SelectContent>
                    {linenTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-medium text-foreground">
                  Assigned Customer *
                </Label>
                <Select value={formData.customerId} onValueChange={(value) => handleInputChange('customerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-foreground">
                  Initial Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value as LinenItem['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Washing">Washing</SelectItem>
                    <SelectItem value="On-Rent">On-Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Wash Cycles */}
              <div className="space-y-2">
                <Label htmlFor="washCycles" className="text-sm font-medium text-foreground">
                  Initial Wash Cycles
                </Label>
                <Input
                  id="washCycles"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.washCycles}
                  onChange={(e) => handleInputChange('washCycles', parseInt(e.target.value) || 0)}
                />
              </div>

              {alert && (
                <Alert className={`${alert.type === 'success' ? 'border-chart-3 bg-chart-3/10' : 'border-destructive bg-destructive/10'}`}>
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

              <Button type="submit" className="w-full" size="lg">
                <Save className="mr-2 h-4 w-4" />
                Add to Inventory
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recently Added Items */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Recently Added ({addedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {addedItems.length > 0 ? (
              <div className="space-y-4">
                {addedItems.slice(-5).reverse().map((item, index) => (
                  <div key={`${item.tagId}-${index}`} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-foreground">{item.tagId}</span>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.type} • {getCustomerName(item.customerId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.washCycles} wash cycles
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-chart-3" />
                  </div>
                ))}
                {addedItems.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    ... and {addedItems.length - 5} more items
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No items added yet. Fill out the form to add your first item.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {addedItems.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{addedItems.length}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {new Set(addedItems.map(item => item.type)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique Types</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {new Set(addedItems.map(item => item.customerId)).size}
                </div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {addedItems.filter(item => item.status === 'In Stock').length}
                </div>
                <div className="text-sm text-muted-foreground">In Stock</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}