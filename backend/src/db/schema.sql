-- LinenFlow™ Database Schema
-- Authentication & RBAC Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'user');

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  branch_id VARCHAR(50) REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- User-Branch relationship (for admin/superadmin with multiple branches)
CREATE TABLE IF NOT EXISTS user_branches (
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, branch_id)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Insert default branches
INSERT INTO branches (id, code, name, address) VALUES
  ('branch-1', 'BKK01', 'Bangkok Central', '123 Silom Road, Bangkok 10500'),
  ('branch-2', 'CNX01', 'Chiang Mai', '456 Nimmanhaemin Road, Chiang Mai 50200'),
  ('branch-3', 'HKT01', 'Phuket', '789 Patong Beach Road, Phuket 83150')
ON CONFLICT (id) DO NOTHING;

-- Insert default superadmin user
-- Password: Admin123! (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, name, role, branch_id, is_active) VALUES
  ('user-superadmin', 'admin@linenflow.com', '$2a$10$YourHashedPasswordHere', 'Super Administrator', 'superadmin', 'branch-1', true)
ON CONFLICT (id) DO NOTHING;

-- Insert superadmin branch associations (all branches)
INSERT INTO user_branches (user_id, branch_id) VALUES
  ('user-superadmin', 'branch-1'),
  ('user-superadmin', 'branch-2'),
  ('user-superadmin', 'branch-3')
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
