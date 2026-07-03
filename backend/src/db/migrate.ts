import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool, closeDatabaseConnection } from '../config/database';
import bcrypt from 'bcryptjs';

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running database migrations...');

    // 1. Base schema (branches, users, refresh_tokens + seed data).
    //    schema.sql is written idempotently so this is safe to re-run.
    const schemaPath = join(__dirname, 'schema.sql');
    console.log('   → schema.sql');
    await client.query(readFileSync(schemaPath, 'utf-8'));

    // 2. Incremental migrations in migrations/, applied in filename order.
    //    Each file is expected to be idempotent (e.g. IF NOT EXISTS / DO $$ ... EXCEPTION guards).
    const migrationsDir = join(__dirname, 'migrations');
    if (existsSync(migrationsDir)) {
      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        console.log(`   → migrations/${file}`);
        await client.query(readFileSync(join(migrationsDir, file), 'utf-8'));
      }
    }

    // 3. Set the default admin password (schema.sql seeds a placeholder hash).
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
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
