import { readFileSync } from 'fs';
import { join } from 'path';
import { pool, closeDatabaseConnection } from '../config/database';
import bcrypt from 'bcryptjs';

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running database migrations...');

    // Read SQL schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await client.query(schema);

    // Hash password for default admin
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    // Update default admin password
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE id = 'user-superadmin'`,
      [hashedPassword]
    );

    console.log('✅ Database migrations completed successfully!');
    console.log('\n📝 Default Credentials:');
    console.log('   Email:    admin@linenflow.com');
    console.log('   Password: Admin123!');
    console.log('\n⚠️  Please change the default password after first login!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await closeDatabaseConnection();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
