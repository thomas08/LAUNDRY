'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { InventoryItem, InventoryItemType, InventoryUnit } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { filterByBranchAccess } from "@/lib/auth"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react"

export default function StockPage() {
  const t = useTranslations('inventoryManagement')
  const tCommon = useTranslations('common')
  const { user, hasPermission } = useAuth()
  const { currentBranch, availableBranches } = useBranch()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [alertFilter, setAlertFilter] = useState<string>('all')

  // Mock data - Will be replaced with API calls
  const mockInventory: InventoryItem[] = [
    {
      id: "inv-001",
      code: "DET-001",
      name: "Premium Laundry Detergent",
      nameTh: "ผงซักฟอกพรีเมี่ยม",
      nameEn: "Premium Laundry Detergent",
      type: "detergent",
      unit: "kg",
      currentStock: 50,
      minimumStock: 100,
      maximumStock: 500,
      reorderPoint: 120,
      unitCost: 85.50,
      supplierId: "sup-001",
      branchId: "branch-1",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "inv-002",
      code: "SOF-001",
      name: "Fabric Softener - Lavender",
      nameTh: "น้ำยาปรับผ้านุ่ม - กลิ่นลาเวนเดอร์",
      nameEn: "Fabric Softener - Lavender",
      type: "softener",
      unit: "liter",
      currentStock: 200,
      minimumStock: 80,
      reorderPoint: 100,
      unitCost: 45.00,
      branchId: "branch-1",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "inv-003",
      code: "BLE-001",
      name: "Bleach",
      nameTh: "น้ำยาฟอกขาว",
      nameEn: "Bleach",
      type: "bleach",
      unit: "liter",
      currentStock: 0,
      minimumStock: 50,
      reorderPoint: 70,
      unitCost: 35.00,
      branchId: "branch-1",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "inv-004",
      code: "BAG-001",
      name: "Plastic Bags (Large)",
      nameTh: "ถุงพลาสติก (ขนาดใหญ่)",
      nameEn: "Plastic Bags (Large)",
      type: "plastic_bag",
      unit: "piece",
      currentStock: 5000,
      minimumStock: 2000,
      reorderPoint: 3000,
      unitCost: 0.50,
      branchId: "branch-1",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "inv-005",
      code: "GAS-001",
      name: "LPG Gas Tank",
      nameTh: "ถังแก๊ส LPG",
      nameEn: "LPG Gas Tank",
      type: "gas",
      unit: "tank",
      currentStock: 15,
      minimumStock: 10,
      reorderPoint: 12,
      unitCost: 450.00,
      branchId: "branch-2",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "inv-006",
      code: "HAN-001",
      name: "Plastic Hangers",
      nameTh: "ไม้แขวนพลาสติก",
      nameEn: "Plastic Hangers",
      type: "hanger",
      unit: "piece",
      currentStock: 800,
      minimumStock: 500,
      reorderPoint: 600,
      unitCost: 3.50,
      branchId: "branch-1",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
  ]

  // Filter by branch access
  const accessibleItems = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockInventory)
  }, [user])

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = accessibleItems

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          item.nameTh?.toLowerCase().includes(query) ||
          item.nameEn?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter((item) => item.type === selectedType)
    }

    // Alert filter
    if (alertFilter !== 'all') {
      result = result.filter((item) => {
        if (alertFilter === 'out_of_stock') return item.currentStock === 0
        if (alertFilter === 'critical') return item.currentStock > 0 && item.currentStock < item.minimumStock
        if (alertFilter === 'low') return item.currentStock >= item.minimumStock && item.currentStock <= item.reorderPoint
        return true
      })
    }

    return result
  }, [accessibleItems, searchQuery, selectedType, alertFilter])

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalItems = accessibleItems.length
    const totalValue = accessibleItems.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0)
    const lowStockItems = accessibleItems.filter(item =>
      item.currentStock > 0 && item.currentStock <= item.reorderPoint
    ).length
    const outOfStockItems = accessibleItems.filter(item => item.currentStock === 0).length

    return { totalItems, totalValue, lowStockItems, outOfStockItems }
  }, [accessibleItems])

  // Get alert level for an item
  const getAlertLevel = (item: InventoryItem): 'low' | 'critical' | 'out_of_stock' | null => {
    if (item.currentStock === 0) return 'out_of_stock'
    if (item.currentStock < item.minimumStock) return 'critical'
    if (item.currentStock <= item.reorderPoint) return 'low'
    return null
  }

  // Get stock percentage
  const getStockPercentage = (item: InventoryItem): number => {
    if (!item.maximumStock) return 0
    return (item.currentStock / item.maximumStock) * 100
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {hasPermission('create') && (
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              {t('stockOut')}
            </Button>
            <Button>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {t('stockIn')}
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalValue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">{metrics.totalItems} items in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('lowStockAlert')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{metrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('outOfStock')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Critical items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('currentStock')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
            <p className="text-xs text-muted-foreground">Different items tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter inventory items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('itemName') + ", " + t('itemCode')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('itemType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="detergent">{t('types.detergent')}</SelectItem>
                <SelectItem value="softener">{t('types.softener')}</SelectItem>
                <SelectItem value="bleach">{t('types.bleach')}</SelectItem>
                <SelectItem value="stain_remover">{t('types.stainRemover')}</SelectItem>
                <SelectItem value="packaging">{t('types.packaging')}</SelectItem>
                <SelectItem value="plastic_bag">{t('types.plasticBag')}</SelectItem>
                <SelectItem value="hanger">{t('types.hanger')}</SelectItem>
                <SelectItem value="gas">{t('types.gas')}</SelectItem>
                <SelectItem value="other">{t('types.other')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Alert Filter */}
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Stock Alert" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="out_of_stock">{t('alerts.outOfStock')}</SelectItem>
                <SelectItem value="critical">{t('alerts.critical')}</SelectItem>
                <SelectItem value="low">{t('alerts.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredItems.length} of {accessibleItems.length} items
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('itemCode')}</TableHead>
              <TableHead>{t('itemName')}</TableHead>
              <TableHead>{t('itemType')}</TableHead>
              <TableHead className="text-right">{t('currentStock')}</TableHead>
              <TableHead className="text-right">{t('minimumStock')}</TableHead>
              <TableHead className="text-right">{t('unitCost')}</TableHead>
              <TableHead className="text-right">{t('totalValue')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchQuery || selectedType !== 'all' || alertFilter !== 'all'
                    ? "No items match your filters"
                    : "No inventory items found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const alertLevel = getAlertLevel(item)
                const stockPercentage = getStockPercentage(item)
                const totalValue = item.currentStock * item.unitCost

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">{item.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.nameTh && (
                          <div className="text-xs text-muted-foreground">{item.nameTh}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`types.${item.type}` as any)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{item.currentStock.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{t(`units.${item.unit}` as any)}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.minimumStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ฿{item.unitCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ฿{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {alertLevel === 'out_of_stock' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('alerts.outOfStock')}
                        </Badge>
                      )}
                      {alertLevel === 'critical' && (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {t('alerts.critical')}
                        </Badge>
                      )}
                      {alertLevel === 'low' && (
                        <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
                          <TrendingDown className="h-3 w-3" />
                          {t('alerts.low')}
                        </Badge>
                      )}
                      {!alertLevel && (
                        <Badge variant="outline" className="gap-1 text-green-700">
                          <TrendingUp className="h-3 w-3" />
                          Good
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          {t('viewTransactions')}
                        </Button>
                        {hasPermission('create') && (
                          <Button variant="outline" size="sm">
                            {t('recordTransaction')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
