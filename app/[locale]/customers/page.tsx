'use client'

import { Customer } from "@/lib/types"
import { CustomerCard } from "@/components/CustomerCard"

export default function CustomersPage() {
  // Mock data array using the Customer type from @/lib/types
  const customers: Customer[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      contactPerson: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
    },
    {
      id: "2",
      name: "Michael Chen",
      contactPerson: "Michael Chen",
      email: "michael.chen@email.com",
      phone: "+1 (555) 234-5678",
    },
    {
      id: "3",
      name: "Emily Davis",
      contactPerson: "Emily Davis",
      email: "emily.davis@email.com",
      phone: "+1 (555) 345-6789",
    },
    {
      id: "4",
      name: "Riverside Hotel",
      contactPerson: "James Wilson",
      email: "james.wilson@riversidehotel.com",
      phone: "+1 (555) 987-6543",
    },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="mt-2 text-muted-foreground">Manage your customer database</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  )
}