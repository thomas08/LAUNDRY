# LinenFlow™ API Documentation

## Overview

This directory contains the complete API specification for LinenFlow™ in OpenAPI 3.0 format.

## Files

- **openapi.yaml** - Complete API specification
- **examples/** - Request/response examples
- **postman/** - Postman collection (coming soon)

## Viewing the Documentation

### Option 1: Swagger UI (Recommended)

1. Install Swagger UI:
```bash
npm install -g swagger-ui-watcher
```

2. View the docs:
```bash
swagger-ui-watcher docs/api/openapi.yaml
```

3. Open http://localhost:8000 in your browser

### Option 2: Swagger Editor Online

1. Go to https://editor.swagger.io/
2. File → Import File → Select `openapi.yaml`

### Option 3: VS Code Extension

1. Install "OpenAPI (Swagger) Editor" extension
2. Open `openapi.yaml`
3. Right-click → Preview Swagger

## Quick Start

### Authentication

All endpoints (except `/auth/login`) require JWT Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example: Login

**Request:**
```bash
curl -X POST https://api.linenflow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@linenflow.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user-123",
    "email": "admin@linenflow.com",
    "name": "Admin User",
    "role": "admin",
    "branchId": "branch-1"
  }
}
```

### Example: Get Customers

**Request:**
```bash
curl -X GET "https://api.linenflow.com/v1/customers?branchId=branch-1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "data": [
    {
      "id": "customer-123",
      "name": "Riverside Hotel",
      "contactPerson": "James Wilson",
      "email": "james@riversidehotel.com",
      "phone": "+66-2-123-4567",
      "branchId": "branch-1",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "limit": 10,
  "offset": 0
}
```

### Example: RFID Scan

**Request:**
```bash
curl -X POST https://api.linenflow.com/v1/rfid/scan \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "tagIds": ["LN001", "LN002", "LN003"],
    "scanType": "checkin",
    "branchId": "branch-1"
  }'
```

**Response:**
```json
{
  "successful": [
    {
      "tagId": "LN001",
      "type": "Bed Sheet",
      "customerId": "customer-123",
      "branchId": "branch-1",
      "status": "In Stock",
      "washCycles": 5
    }
  ],
  "failed": [
    {
      "tagId": "LN999",
      "reason": "Tag not found in system"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

### Example: AI Quality Check

**Request:**
```bash
curl -X POST https://api.linenflow.com/v1/qc/validate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "tagId": "LN001",
    "branchId": "branch-1"
  }'
```

**Response:**
```json
{
  "tagId": "LN001",
  "isClean": true,
  "confidence": 0.95,
  "defects": [],
  "aiModel": "linen-qc-v2.1",
  "processedAt": "2024-01-15T14:30:00Z"
}
```

## API Endpoints Summary

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

### Customers
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `GET /customers/{id}` - Get customer details
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer

### Inventory
- `GET /inventory` - List inventory items
- `POST /inventory` - Add new item
- `GET /inventory/{tagId}` - Get item details
- `PATCH /inventory/{tagId}` - Update item status

### RFID
- `POST /rfid/scan` - Process RFID scan (multiple tags)

### QC (Quality Control)
- `POST /qc/validate` - AI quality validation

## Permission Requirements

| Endpoint | Required Permission | Roles Allowed |
|----------|-------------------|---------------|
| GET /customers | `read` | All |
| POST /customers | `create` | All |
| PUT /customers/:id | `update` | Admin, Superadmin |
| DELETE /customers/:id | `delete` | Admin, Superadmin |
| POST /rfid/scan | `create` | All |
| POST /qc/validate | `read` | All |

## Multi-Tenancy Rules

1. **All mutations (POST, PUT, DELETE) must include `branchId`**
2. **Backend must validate user has access to that branch**
3. **Superadmin sees all branches**
4. **Admin sees assigned branches only**
5. **Regular user sees only their primary branch**

## Error Responses

All errors follow consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- `AUTH_REQUIRED` - Missing or invalid token
- `PERMISSION_DENIED` - Insufficient permissions
- `INVALID_INPUT` - Bad request data
- `NOT_FOUND` - Resource not found
- `BRANCH_ACCESS_DENIED` - Cannot access this branch

## Rate Limiting

- **Limit:** 1000 requests per hour per token
- **Header:** `X-RateLimit-Remaining`
- **Response Code:** `429 Too Many Requests`

## Versioning

API version is included in URL: `/v1/...`

Breaking changes will increment major version: `/v2/...`

## Support

For API support or questions:
- Email: api@linenflow.com
- Slack: #api-support
- Docs: https://docs.linenflow.com

## Testing

### Mock Server

Start mock API server for testing:

```bash
npx @stoplight/prism-cli mock docs/api/openapi.yaml
```

Server will run on http://localhost:4010

### Postman Collection

Import `openapi.yaml` into Postman:
1. Postman → Import → Select file
2. Choose OpenAPI 3.0 format
3. Generate collection

## Frontend Integration

### TypeScript Client Generation

Generate TypeScript types from OpenAPI spec:

```bash
npx openapi-typescript docs/api/openapi.yaml --output lib/api/types.ts
```

### SWR Example

```typescript
import useSWR from 'swr'
import { useCurrentBranchId } from '@/contexts/BranchContext'

export function useCustomers() {
  const branchId = useCurrentBranchId()

  const { data, error } = useSWR(
    branchId ? `/api/customers?branchId=${branchId}` : null,
    fetcher
  )

  return {
    customers: data?.data || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    error
  }
}
```

## Changelog

### v1.0.0 (2024-01-15)
- Initial API specification
- Authentication endpoints
- Customers CRUD
- Inventory management
- RFID scanning
- AI Quality Control

---

Last updated: 2024-01-15
