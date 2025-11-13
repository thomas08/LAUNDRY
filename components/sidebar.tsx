"use client"

import { Link, usePathname } from "@/lib/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Package, BarChart3, Menu, Sparkles, Scan, Plus, Camera, Truck, FileText, DollarSign, ShoppingCart, Boxes, Building2, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useState } from "react"

const groupedNavigation = [
  {
    groupKey: 'overview',
    titleKey: 'overview',
    items: [
      { key: 'dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    groupKey: 'operations',
    titleKey: 'operations',
    items: [
      { key: 'checkin', href: '/checkin', icon: Scan },
      { key: 'addItem', href: '/add-item', icon: Plus },
      { key: 'aiScanner', href: '/ai-scanner', icon: Camera },
      { key: 'dispatch', href: '/operations/dispatch', icon: Truck },
      { key: 'jobOrders', href: '/operations/job-orders', icon: FileText, translationNamespace: 'operations' },
    ],
  },
  {
    groupKey: 'management',
    titleKey: 'management',
    items: [
      { key: 'customers', href: '/customers', icon: Users },
      { key: 'inventory', href: '/inventory', icon: Package },
      { key: 'stock', href: '/inventory/stock', icon: Boxes, translationNamespace: 'inventoryManagement' },
      { key: 'suppliers', href: '/inventory/suppliers', icon: Building2, translationNamespace: 'suppliers', titleKey: 'title' },
    ],
  },
  {
    groupKey: 'finance',
    titleKey: 'finance',
    translationNamespace: 'finance',
    items: [
      { key: 'expenses', href: '/finance/expenses', icon: DollarSign, translationNamespace: 'finance' },
      { key: 'invoices', href: '/finance/invoices', icon: Receipt, translationNamespace: 'finance' },
    ],
  },
  {
    groupKey: 'reports',
    titleKey: 'reports',
    items: [
      { key: 'reports', href: '/reports', icon: BarChart3 },
    ],
  },
]

export function Sidebar() {
  const tNav = useTranslations('nav')
  const tOps = useTranslations('operations')
  const tInv = useTranslations('inventoryManagement')
  const tSup = useTranslations('suppliers')
  const tFin = useTranslations('finance')
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const renderItem = (item: { key: string; href: string; icon: any; translationNamespace?: string; titleKey?: string }) => {
    const Icon = item.icon
    const isActive = pathname === item.href

    // Select the appropriate translation function based on namespace
    let label = item.key
    if (item.translationNamespace === 'operations') {
      label = tOps(item.key)
    } else if (item.translationNamespace === 'inventoryManagement') {
      label = tInv(item.key)
    } else if (item.translationNamespace === 'suppliers') {
      label = tSup(item.titleKey || item.key)
    } else if (item.translationNamespace === 'finance') {
      label = tFin(item.key)
    } else {
      label = tNav(item.key)
    }

    return (
      <Button
        key={item.key}
        variant="ghost"
        className={cn(
          'h-auto w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium',
          isActive
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
        asChild
      >
        <Link href={item.href} onClick={() => setMobileOpen(false)}>
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>{label}</span>}
        </Link>
      </Button>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-all duration-300',
          collapsed && 'md:w-20',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'px-2 justify-center' : 'px-6')}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              {!collapsed && <span className="font-sans text-lg font-semibold text-foreground">LinenFlow™</span>}
            </div>

            {/* Desktop collapse button */}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto hidden md:flex h-8 w-8"
                onClick={() => setCollapsed(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="px-2 py-4">
              <Button variant="ghost" size="icon" className="w-full h-10" onClick={() => setCollapsed(false)}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Grouped Navigation */}
          <nav className={cn('flex-1 space-y-4 overflow-y-auto', collapsed ? 'px-2 py-4' : 'p-4')}>
            {groupedNavigation.map((group) => {
              // Select the appropriate translation function for group title
              let groupTitle = group.titleKey
              if (group.translationNamespace === 'finance') {
                groupTitle = tFin('title')
              } else {
                groupTitle = tNav(group.titleKey)
              }

              return (
                <div key={group.groupKey} className="space-y-2">
                  {!collapsed && (
                    <h4 className="px-3 text-xs font-semibold uppercase text-muted-foreground">{groupTitle}</h4>
                  )}

                  <div className="space-y-1">
                    {group.items.map((item) => renderItem(item))}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Language Switcher and User section */}
          <div className={cn('border-t border-border space-y-4', collapsed ? 'p-2' : 'p-4')}>
            {/* Language Switcher */}
            {!collapsed && (
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
            )}

            {/* User section */}
            <div
              className={cn('flex items-center rounded-lg', collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5')}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">JD</div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">John Doe</p>
                  <p className="truncate text-xs text-muted-foreground">john@laundry.com</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
