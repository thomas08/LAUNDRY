# LinenFlow™ Architecture Documentation

## Table of Contents
1. [RBAC (Role-Based Access Control)](#rbac)
2. [Multi-Tenancy (Branch Isolation)](#multi-tenancy)
3. [Context Providers](#context-providers)
4. [Usage Examples](#usage-examples)
5. [API Integration Guidelines](#api-integration)

---

## RBAC (Role-Based Access Control)

### Overview
LinenFlow™ implements a hierarchical role-based permission system with three levels:

| Role | Description | Permissions |
|------|-------------|-------------|
| **superadmin** | System administrator | Full access to all features and all branches |
| **admin** | Branch manager | Full access to assigned branch(es), cannot manage users or settings |
| **user** | Regular employee | Can view and create records, cannot delete or modify settings |

### Permission Types

```typescript
type Permission =
  | 'read'           // View data
  | 'create'         // Create new records
  | 'update'         // Edit existing records
  | 'delete'         // Delete records
  | 'manage_users'   // Manage users and roles (superadmin only)
  | 'view_reports'   // Access reports
  | 'manage_settings' // Change system settings (superadmin only)
```

### Role-Permission Matrix

Defined in `lib/auth.ts`:

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: ['read', 'create', 'update', 'delete', 'manage_users', 'view_reports', 'manage_settings'],
  admin: ['read', 'create', 'update', 'delete', 'view_reports'],
  user: ['read', 'create', 'view_reports'],
}
```

### Helper Functions

**Check if user has permission:**
```typescript
import { hasPermission } from '@/lib/auth'

const canDelete = hasPermission(user.role, 'delete') // true for admin, false for user
```

**Check page access:**
```typescript
import { canAccessPage } from '@/lib/auth'

const canViewSettings = canAccessPage(user.role, '/settings') // true only for superadmin
```

---

## Multi-Tenancy (Branch Isolation)

### Overview
LinenFlow™ supports multiple branches/locations with data isolation:

- Each **Customer**, **LinenItem**, and other business entities belongs to a specific **Branch**
- Users are assigned to one or more branches
- Data is automatically filtered based on user's branch access

### Branch Model

```typescript
interface Branch {
  id: string
  name: string
  code: string      // Short code like "BKK01", "CNX01"
  address: string
  phone: string
  isActive: boolean
}
```

### Branch Assignment Rules

1. **Superadmin**: Can access ALL branches
2. **Admin**: Can access assigned branches (stored in `user.branchIds[]`)
3. **User**: Can only access their primary branch (`user.branchId`)

### Data Filtering

**Automatic filtering:**
```typescript
import { filterByBranchAccess } from '@/lib/auth'

// Filter customers to show only accessible branches
const accessibleCustomers = filterByBranchAccess(currentUser, allCustomers)
```

**Manual check:**
```typescript
import { canAccessBranch } from '@/lib/auth'

if (canAccessBranch(user, customer.branchId)) {
  // User can view this customer
}
```

---

## Context Providers

### AuthContext

Manages authentication state and user information.

**Location:** `contexts/AuthContext.tsx`

**Usage:**
```typescript
import { useAuth, useUser, useRole } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, hasPermission, canAccessPage } = useAuth()
  const currentUser = useUser()
  const isAdmin = useRole('admin')

  if (!hasPermission('delete')) {
    return null // Hide delete button
  }

  return <button>Delete</button>
}
```

### BranchContext

Manages current branch and branch switching.

**Location:** `contexts/BranchContext.tsx`

**Usage:**
```typescript
import { useBranch, useCurrentBranchId, useCurrentBranch } from '@/contexts/BranchContext'

function MyComponent() {
  const { currentBranch, availableBranches, switchBranch } = useBranch()
  const branchId = useCurrentBranchId()

  return (
    <div>
      <p>Current Branch: {currentBranch?.name}</p>
      <select onChange={(e) => switchBranch(e.target.value)}>
        {availableBranches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

## Usage Examples

### Example 1: Conditional Rendering Based on Role

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function CustomerActions({ customer }) {
  const { hasPermission } = useAuth()

  return (
    <div className="flex gap-2">
      {/* Everyone can view */}
      <Button>View</Button>

      {/* Only users with 'update' permission */}
      {hasPermission('update') && (
        <Button>Edit</Button>
      )}

      {/* Only users with 'delete' permission (admin and superadmin) */}
      {hasPermission('delete') && (
        <Button variant="destructive">Delete</Button>
      )}
    </div>
  )
}
```

### Example 2: Filtering Data by Branch

```typescript
'use client'

import { useUser } from '@/contexts/AuthContext'
import { useCurrentBranchId } from '@/contexts/BranchContext'
import { filterByBranchAccess } from '@/lib/auth'

export function CustomerList() {
  const user = useUser()
  const currentBranchId = useCurrentBranchId()

  // Fetch all customers from API
  const allCustomers = await fetchCustomers()

  // Filter by branch access
  const accessibleCustomers = filterByBranchAccess(user, allCustomers)

  // Or filter by current branch only
  const branchCustomers = allCustomers.filter(c => c.branchId === currentBranchId)

  return (
    <div>
      {accessibleCustomers.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  )
}
```

### Example 3: API Request with Branch ID

```typescript
'use client'

import { useCurrentBranchId } from '@/contexts/BranchContext'

export function InventoryPage() {
  const branchId = useCurrentBranchId()

  // Include branchId in API requests
  const { data: items } = useSWR(
    branchId ? `/api/inventory?branchId=${branchId}` : null,
    fetcher
  )

  return (
    <div>
      {items?.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

---

## API Integration Guidelines

### Backend Requirements

When integrating with the Rust backend, ensure the following:

#### 1. Include Branch ID in All Requests

```typescript
// ✅ Correct
POST /api/customers
{
  "name": "New Customer",
  "branchId": "branch-1",  // Must include!
  "email": "customer@example.com"
}

// ❌ Incorrect (missing branchId)
POST /api/customers
{
  "name": "New Customer",
  "email": "customer@example.com"
}
```

#### 2. Filter Responses by Branch Access

Backend should check user's role and filter data:

```rust
// Pseudo-code
fn get_customers(user: User, branch_id: Option<String>) -> Vec<Customer> {
    if user.role == "superadmin" {
        // Return all customers (optionally filtered by branch_id)
        return query_all_customers(branch_id);
    }

    if user.role == "admin" {
        // Return customers from user's branches
        return query_customers_by_branches(user.branch_ids);
    }

    // Regular user - only their branch
    return query_customers_by_branch(user.branch_id);
}
```

#### 3. Validate Permissions

Backend MUST validate permissions for write operations:

```rust
fn delete_customer(user: User, customer_id: String) -> Result<()> {
    // Check permission
    if !user.has_permission("delete") {
        return Err("Permission denied");
    }

    // Check branch access
    let customer = get_customer(customer_id)?;
    if !user.can_access_branch(customer.branch_id) {
        return Err("Cannot access customer from different branch");
    }

    // Proceed with deletion
    delete_customer_from_db(customer_id)
}
```

### Frontend API Client Pattern

Recommended pattern for API calls:

```typescript
// lib/api/customers.ts
import { getCurrentUser } from '@/lib/auth'

export async function fetchCustomers(branchId?: string) {
  const user = getCurrentUser()

  // Build query params
  const params = new URLSearchParams()
  if (branchId) {
    params.append('branchId', branchId)
  }

  const response = await fetch(`/api/customers?${params}`, {
    headers: {
      'Authorization': `Bearer ${user.token}`, // Add auth token
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch customers')
  }

  return response.json()
}

export async function createCustomer(data: CreateCustomerInput) {
  const user = getCurrentUser()

  // Automatically include branchId
  const payload = {
    ...data,
    branchId: data.branchId || user.branchId, // Use user's branch if not specified
  }

  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to create customer')
  }

  return response.json()
}
```

---

## Security Considerations

### ⚠️ Important Notes

1. **Never trust frontend-only authorization**
   - All permission checks in `lib/auth.ts` are for **UI purposes only**
   - Backend MUST validate all permissions and branch access

2. **Always include branch ID**
   - Every API mutation (CREATE, UPDATE, DELETE) must include `branchId`
   - Backend must validate user has access to that branch

3. **Session Management**
   - Current implementation uses mock users
   - TODO: Replace with real authentication (NextAuth.js, Auth0, etc.)
   - Store JWT tokens securely (HTTP-only cookies)

4. **Middleware Protection**
   - TODO: Add middleware to protect routes based on authentication
   - Redirect unauthenticated users to login
   - Show 403 for insufficient permissions

---

## Migration Path

### Current State (Mock Data)
- Using `mockUsers` in `lib/auth.ts`
- `getCurrentUser()` returns mock superadmin
- No real authentication

### Next Steps

1. **Phase 1: Integrate Authentication Provider**
   - Install NextAuth.js or similar
   - Configure providers (Google, Email, etc.)
   - Update `getCurrentUser()` to read from session

2. **Phase 2: Backend Integration**
   - Connect to Rust backend API
   - Implement JWT token validation
   - Add refresh token rotation

3. **Phase 3: Production Hardening**
   - Add rate limiting
   - Implement audit logging
   - Add CSRF protection
   - Enable MFA for superadmin

---

## File Structure

```
lib/
├── types.ts              # User, Role, Permission, Branch types
├── auth.ts               # Permission checking, mock users
└── navigation.ts         # Locale-aware routing

contexts/
├── AuthContext.tsx       # Auth state management
└── BranchContext.tsx     # Branch state management

app/[locale]/
└── layout.tsx            # Wraps app with AuthProvider & BranchProvider
```

---

## Questions & Support

For questions about RBAC or Multi-Tenancy:
1. Check this documentation first
2. Review example usage in `lib/auth.ts`
3. Test with different mock users
4. Consult the development team
