'use client'

import { useTranslations } from "next-intl"
import { Customer } from "@/lib/types"
import { CustomerDataTable } from "@/components/CustomerDataTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function CustomersPage() {
  const t = useTranslations('customers')

  // Mock data with multiple branches for testing multi-tenancy
  const customers: Customer[] = [
    // Bangkok Central (branch-1)
    {
      id: "1",
      name: "Riverside Hotel Bangkok",
      contactPerson: "James Wilson",
      email: "james.wilson@riversidehotel.com",
      phone: "+66-2-123-4567",
      branchId: "branch-1"
    },
    {
      id: "2",
      name: "Grand Palace Hotel",
      contactPerson: "Sarah Johnson",
      email: "sarah@grandpalace.com",
      phone: "+66-2-234-5678",
      branchId: "branch-1"
    },
    {
      id: "3",
      name: "Bangkok Suites",
      contactPerson: "Michael Chen",
      email: "michael@bangkoksuites.com",
      phone: "+66-2-345-6789",
      branchId: "branch-1"
    },
    {
      id: "4",
      name: "Silom Business Hotel",
      contactPerson: "Emily Davis",
      email: "emily@silomhotel.com",
      phone: "+66-2-456-7890",
      branchId: "branch-1"
    },
    {
      id: "5",
      name: "Sukhumvit Residence",
      contactPerson: "David Brown",
      email: "david@sukhumvit.com",
      phone: "+66-2-567-8901",
      branchId: "branch-1"
    },

    // Chiang Mai (branch-2)
    {
      id: "6",
      name: "Mountain View Resort",
      contactPerson: "Lisa Anderson",
      email: "lisa@mountainview.com",
      phone: "+66-53-123-4567",
      branchId: "branch-2"
    },
    {
      id: "7",
      name: "Nimman Hotel",
      contactPerson: "Robert Taylor",
      email: "robert@nimmanhotel.com",
      phone: "+66-53-234-5678",
      branchId: "branch-2"
    },
    {
      id: "8",
      name: "Old City Boutique",
      contactPerson: "Jennifer Lee",
      email: "jennifer@oldcity.com",
      phone: "+66-53-345-6789",
      branchId: "branch-2"
    },
    {
      id: "9",
      name: "Ping River Lodge",
      contactPerson: "William Martinez",
      email: "william@pingriver.com",
      phone: "+66-53-456-7890",
      branchId: "branch-2"
    },

    // Phuket (branch-3)
    {
      id: "10",
      name: "Patong Beach Resort",
      contactPerson: "Amanda Garcia",
      email: "amanda@patongbeach.com",
      phone: "+66-76-123-4567",
      branchId: "branch-3"
    },
    {
      id: "11",
      name: "Kata Sea View Hotel",
      contactPerson: "Christopher Rodriguez",
      email: "chris@kataseaview.com",
      phone: "+66-76-234-5678",
      branchId: "branch-3"
    },
    {
      id: "12",
      name: "Karon Villa",
      contactPerson: "Jessica Hernandez",
      email: "jessica@karonvilla.com",
      phone: "+66-76-345-6789",
      branchId: "branch-3"
    },
    {
      id: "13",
      name: "Rawai Beach House",
      contactPerson: "Matthew Lopez",
      email: "matthew@rawaibeach.com",
      phone: "+66-76-456-7890",
      branchId: "branch-3"
    },
    {
      id: "14",
      name: "Kamala Spa Resort",
      contactPerson: "Ashley Wilson",
      email: "ashley@kamalaspa.com",
      phone: "+66-76-567-8901",
      branchId: "branch-3"
    },
    {
      id: "15",
      name: "Surin Premium Hotel",
      contactPerson: "Daniel Moore",
      email: "daniel@surinpremium.com",
      phone: "+66-76-678-9012",
      branchId: "branch-3"
    },
  ]

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
          Add Customer
        </Button>
      </div>

      <CustomerDataTable customers={customers} />
    </div>
  )
}