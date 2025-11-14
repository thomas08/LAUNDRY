/**
 * Shared mock data for LinenFlow™ application
 * Used across multiple pages for consistent data
 */

import type { Customer, JobOrder } from './types'

// Mock Customers Data
export const mockCustomers: Customer[] = [
  // Bangkok Central (branch-1)
  {
    id: "cust-001",
    name: "Riverside Hotel Bangkok",
    contactPerson: "James Wilson",
    email: "james.wilson@riversidehotel.com",
    phone: "+66-2-123-4567",
    address: "789 Riverside Road, Sathorn, Bangkok 10120",
    branchId: "branch-1",
    customerType: "hotel",
    taxId: "0105558888999",
    creditLimit: 100000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-06-15T10:00:00Z"
  },
  {
    id: "cust-002",
    name: "Grand Palace Hotel",
    contactPerson: "Sarah Johnson",
    email: "sarah@grandpalace.com",
    phone: "+66-2-234-5678",
    address: "456 Ratchadamri Road, Pathum Wan, Bangkok 10330",
    branchId: "branch-1",
    customerType: "hotel",
    taxId: "0105559999000",
    creditLimit: 150000,
    currentBalance: 0,
    paymentTerms: 45,
    isActive: true,
    createdAt: "2023-08-20T09:30:00Z"
  },
  {
    id: "cust-003",
    name: "Bangkok Suites",
    contactPerson: "Michael Chen",
    email: "michael@bangkoksuites.com",
    phone: "+66-2-345-6789",
    address: "123 Sukhumvit Soi 11, Klongtoey, Bangkok 10110",
    branchId: "branch-1",
    customerType: "hotel",
    taxId: "0105550000111",
    creditLimit: 80000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-09-10T14:15:00Z"
  },
  {
    id: "cust-004",
    name: "Silom Business Hotel",
    contactPerson: "Emily Davis",
    email: "emily@silomhotel.com",
    phone: "+66-2-456-7890",
    address: "234 Silom Road, Bangrak, Bangkok 10500",
    branchId: "branch-1",
    customerType: "hotel",
    taxId: "0105551111222",
    creditLimit: 70000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-10-05T11:00:00Z"
  },
  {
    id: "cust-005",
    name: "Sukhumvit Residence",
    contactPerson: "David Brown",
    email: "david@sukhumvitres.com",
    phone: "+66-2-567-8901",
    address: "567 Sukhumvit Road, Klongtoey, Bangkok 10110",
    branchId: "branch-1",
    customerType: "residential",
    taxId: "0105552222333",
    creditLimit: 50000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-11-12T13:45:00Z"
  },

  // Chiang Mai (branch-2)
  {
    id: "cust-006",
    name: "Nimman Heritage Hotel",
    contactPerson: "Lisa Anderson",
    email: "lisa@nimmanheritage.com",
    phone: "+66-53-123-4567",
    address: "99 Nimmanhaemin Road, Muang, Chiang Mai 50200",
    branchId: "branch-2",
    customerType: "hotel",
    taxId: "0105553333444",
    creditLimit: 90000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-07-18T10:20:00Z"
  },
  {
    id: "cust-007",
    name: "Old City Resort",
    contactPerson: "Robert Martinez",
    email: "robert@oldcityresort.com",
    phone: "+66-53-234-5678",
    address: "45 Ratchadamnoen Road, Muang, Chiang Mai 50200",
    branchId: "branch-2",
    customerType: "hotel",
    taxId: "0105554444555",
    creditLimit: 75000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-08-25T09:00:00Z"
  },
  {
    id: "cust-008",
    name: "Ping River View Hotel",
    contactPerson: "Jennifer Taylor",
    email: "jennifer@pingriver.com",
    phone: "+66-53-345-6789",
    address: "88 Charoen Prathet Road, Muang, Chiang Mai 50100",
    branchId: "branch-2",
    customerType: "hotel",
    taxId: "0105555555666",
    creditLimit: 65000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-09-30T15:30:00Z"
  },
  {
    id: "cust-009",
    name: "Mountain Spa Resort",
    contactPerson: "Thomas White",
    email: "thomas@mountainspa.com",
    phone: "+66-53-456-7890",
    address: "123 Huay Kaew Road, Muang, Chiang Mai 50300",
    branchId: "branch-2",
    customerType: "spa",
    taxId: "0105556666777",
    creditLimit: 55000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-10-20T12:00:00Z"
  },
  {
    id: "cust-010",
    name: "Chiang Mai Fitness Club",
    contactPerson: "Amanda Garcia",
    email: "amanda@cmfitness.com",
    phone: "+66-53-567-8901",
    address: "234 Canal Road, Muang, Chiang Mai 50100",
    branchId: "branch-2",
    customerType: "gym",
    taxId: "0105557777888",
    creditLimit: 35000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-11-25T14:20:00Z"
  },

  // Phuket (branch-3)
  {
    id: "cust-011",
    name: "Patong Beach Resort",
    contactPerson: "Christopher Lee",
    email: "chris@patongbeach.com",
    phone: "+66-76-123-4567",
    address: "111 Patong Beach Road, Kathu, Phuket 83150",
    branchId: "branch-3",
    customerType: "hotel",
    taxId: "0105558888999",
    creditLimit: 120000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-06-28T11:30:00Z"
  },
  {
    id: "cust-012",
    name: "Kata View Hotel",
    contactPerson: "Michelle Rodriguez",
    email: "michelle@kataview.com",
    phone: "+66-76-234-5678",
    address: "222 Kata Beach, Muang, Phuket 83100",
    branchId: "branch-3",
    customerType: "hotel",
    taxId: "0105559999000",
    creditLimit: 95000,
    currentBalance: 0,
    paymentTerms: 30,
    isActive: true,
    createdAt: "2023-07-15T10:00:00Z"
  },
  {
    id: "cust-013",
    name: "Phuket Wellness Spa",
    contactPerson: "Daniel Kim",
    email: "daniel@phuketspa.com",
    phone: "+66-76-345-6789",
    address: "333 Chalong Bay Road, Muang, Phuket 83130",
    branchId: "branch-3",
    customerType: "spa",
    taxId: "0105550000111",
    creditLimit: 60000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-08-10T13:00:00Z"
  },
  {
    id: "cust-014",
    name: "Rawai Beach Villa",
    contactPerson: "Jessica Thompson",
    email: "jessica@rawaivilla.com",
    phone: "+66-76-456-7890",
    address: "444 Rawai Beach, Muang, Phuket 83130",
    branchId: "branch-3",
    customerType: "residential",
    taxId: "0105551111222",
    creditLimit: 45000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-09-05T16:45:00Z"
  },
  {
    id: "cust-015",
    name: "Island Fitness Center",
    contactPerson: "Kevin Nguyen",
    email: "kevin@islandfitness.com",
    phone: "+66-76-567-8901",
    address: "555 Bypass Road, Kathu, Phuket 83120",
    branchId: "branch-3",
    customerType: "gym",
    taxId: "0105552222333",
    creditLimit: 40000,
    currentBalance: 0,
    paymentTerms: 15,
    isActive: true,
    createdAt: "2023-10-15T09:30:00Z"
  }
]

// Mock Job Orders for Customer Detail Pages
export const mockJobOrders: Record<string, JobOrder[]> = {
  "cust-001": [
    {
      id: "job-001",
      orderNumber: "JO-2024-001",
      customerId: "cust-001",
      customerName: "Riverside Hotel Bangkok",
      branchId: "branch-1",
      serviceType: "wash_fold",
      status: "delivered",
      weight: 125.5,
      itemCount: 450,
      receivedAt: "2024-01-15T09:00:00Z",
      dueDate: "2024-01-17T17:00:00Z",
      completedAt: "2024-01-17T14:30:00Z",
      deliveredAt: "2024-01-17T16:00:00Z",
      assignedTo: "user-1",
      servicePrice: 15,
      totalPrice: 1882.5,
      createdBy: "user-1",
      createdAt: "2024-01-15T09:00:00Z"
    },
    {
      id: "job-002",
      orderNumber: "JO-2024-002",
      customerId: "cust-001",
      customerName: "Riverside Hotel Bangkok",
      branchId: "branch-1",
      serviceType: "dry_clean",
      status: "completed",
      weight: 45.0,
      itemCount: 120,
      receivedAt: "2024-01-20T10:30:00Z",
      dueDate: "2024-01-23T17:00:00Z",
      completedAt: "2024-01-23T15:00:00Z",
      assignedTo: "user-1",
      servicePrice: 35,
      totalPrice: 1575,
      createdBy: "user-1",
      createdAt: "2024-01-20T10:30:00Z"
    },
    {
      id: "job-003",
      orderNumber: "JO-2024-003",
      customerId: "cust-001",
      customerName: "Riverside Hotel Bangkok",
      branchId: "branch-1",
      serviceType: "wash_iron",
      status: "washing",
      weight: 65.0,
      itemCount: 180,
      receivedAt: "2024-01-25T08:00:00Z",
      dueDate: "2024-01-28T17:00:00Z",
      assignedTo: "user-1",
      servicePrice: 22,
      totalPrice: 1430,
      createdBy: "user-1",
      createdAt: "2024-01-25T08:00:00Z"
    }
  ],
  "cust-002": [
    {
      id: "job-004",
      orderNumber: "JO-2024-004",
      customerId: "cust-002",
      customerName: "Grand Palace Hotel",
      branchId: "branch-1",
      serviceType: "wash_fold",
      status: "delivered",
      weight: 95.0,
      itemCount: 320,
      receivedAt: "2024-01-18T11:00:00Z",
      dueDate: "2024-01-21T17:00:00Z",
      completedAt: "2024-01-21T14:00:00Z",
      deliveredAt: "2024-01-21T15:30:00Z",
      assignedTo: "user-1",
      servicePrice: 18,
      totalPrice: 1710,
      createdBy: "user-1",
      createdAt: "2024-01-18T11:00:00Z"
    }
  ]
  // Add more customer job orders as needed
}

// Helper function to get customer by ID
export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find(customer => customer.id === id)
}

// Helper function to get job orders by customer ID
export function getJobOrdersByCustomerId(customerId: string): JobOrder[] {
  return mockJobOrders[customerId] || []
}

// Helper function to calculate customer statistics
export function getCustomerStats(customerId: string) {
  const orders = getJobOrdersByCustomerId(customerId)

  const totalOrders = orders.length
  const completedOrders = orders.filter(o =>
    ['completed', 'delivered'].includes(o.status)
  ).length
  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const activeOrders = orders.filter(o =>
    !['completed', 'delivered', 'cancelled'].includes(o.status)
  ).length

  return {
    totalOrders,
    completedOrders,
    totalSpent,
    activeOrders,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
  }
}
