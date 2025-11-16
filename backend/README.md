# LinenFlow™ API Backend

Node.js + TypeScript + Express backend with JWT authentication and RBAC for LinenFlow™ Laundry Management System.

## Features

- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Refresh Tokens** - Long-lived refresh tokens for seamless UX
- ✅ **RBAC (Role-Based Access Control)** - Superadmin, Admin, User roles
- ✅ **Multi-Tenancy** - Branch-level data isolation
- ✅ **PostgreSQL** - Robust relational database
- ✅ **TypeScript** - Type-safe development
- ✅ **Express.js** - Fast and minimal web framework

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/linenflow
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

### 3. Create Database

```bash
# Using psql
createdb linenflow

# Or using SQL
psql -U postgres
CREATE DATABASE linenflow;
```

### 4. Run Migrations

```bash
npm run build
npm run db:migrate
```

This will:
- Create all tables (users, branches, refresh_tokens)
- Insert default branches (Bangkok, Chiang Mai, Phuket)
- Create default superadmin user

**Default Credentials:**
- Email: `admin@linenflow.com`
- Password: `Admin123!`

⚠️ **Change the default password after first login!**

## Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:8080/v1`

## API Endpoints

### Authentication

#### POST /v1/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@linenflow.com",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user-superadmin",
    "email": "admin@linenflow.com",
    "name": "Super Administrator",
    "role": "superadmin",
    "branchId": "branch-1",
    "branchIds": ["branch-1", "branch-2", "branch-3"],
    "isActive": true
  }
}
```

#### POST /v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### GET /v1/auth/me
Get current authenticated user.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": "user-superadmin",
  "email": "admin@linenflow.com",
  "name": "Super Administrator",
  "role": "superadmin",
  "branchId": "branch-1",
  "branchIds": ["branch-1", "branch-2", "branch-3"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLoginAt": "2024-01-15T10:30:00.000Z"
}
```

## Testing with curl

### Login
```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@linenflow.com",
    "password": "Admin123!"
  }'
```

### Get Current User
```bash
# Replace TOKEN with the token from login response
curl http://localhost:8080/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Refresh Token
```bash
# Replace REFRESH_TOKEN with the refreshToken from login response
curl -X POST http://localhost:8080/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN"
  }'
```

## RBAC & Permissions

### Roles

- **superadmin**: Full access to all branches and all permissions
- **admin**: Access to assigned branches, can create/update/delete/view_reports
- **user**: Access to primary branch only, can read/create/view_reports

### Permissions

- `read` - View data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Delete records
- `view_reports` - Access analytics and reports

### Using RBAC Middleware

```typescript
import { requirePermission, requireRole, requireBranchAccess } from './middleware/rbac';

// Require specific permission
router.post('/customers', authMiddleware, requirePermission('create'), createCustomer);

// Require specific role
router.delete('/users/:id', authMiddleware, requireRole('superadmin'), deleteUser);

// Require branch access
router.get('/customers/:id', authMiddleware, requireBranchAccess(), getCustomer);
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # PostgreSQL connection
│   │   └── env.ts           # Environment configuration
│   ├── controllers/
│   │   └── auth.ts          # Authentication logic
│   ├── db/
│   │   ├── migrate.ts       # Migration script
│   │   └── schema.sql       # Database schema
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication middleware
│   │   └── rbac.ts          # RBAC permission middleware
│   ├── models/
│   │   └── user.ts          # User model
│   ├── routes/
│   │   └── auth.ts          # Auth routes
│   └── index.ts             # Main entry point
├── .env                     # Environment variables (git-ignored)
├── .env.example             # Environment template
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Production Deployment

### 1. Build

```bash
npm run build
```

### 2. Set Environment Variables

Ensure all production values are set:
- Strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Production database credentials
- Set `NODE_ENV=production`

### 3. Run

```bash
npm start
```

## Next Steps

1. **Frontend Integration**: Update Next.js frontend to use this API instead of mock data
2. **Add Modules**: Implement Customers, Inventory, Operations endpoints
3. **Add Tests**: Write unit and integration tests
4. **Add Logging**: Implement structured logging with Winston or Pino
5. **Add Rate Limiting**: Protect against brute-force attacks
6. **Add Input Validation**: Use Zod or Joi for request validation
7. **Docker**: Create Dockerfile and docker-compose for easy deployment

## License

Proprietary - LinenFlow™
