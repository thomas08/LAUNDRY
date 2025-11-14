'use client'

import { useTranslations } from "next-intl"
import { mockCustomers } from "@/lib/mockData"
import { CustomerDataTable } from "@/components/CustomerDataTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function CustomersPage() {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Add Customer Button - Placeholder for future functionality */}
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {tCommon('add')} {t('customer')}
        </Button>
      </div>

      <CustomerDataTable customers={mockCustomers} />
    </div>
  )
}