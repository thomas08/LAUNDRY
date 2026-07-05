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

    // 3. Seed the superadmin password — but ONLY while it is still the schema.sql
    //    placeholder. This runs on every container start, so unconditionally
    //    resetting it would clobber a password the operator later changed.
    //    In production set SEED_ADMIN_PASSWORD so the first seed is a strong,
    //    non-public value instead of the well-known 'Admin123!' default.
    const PLACEHOLDER_HASH = '$2a$10$YourHashedPasswordHere';
    const { rows: adminRows } = await client.query(
      `SELECT password_hash FROM users WHERE id = 'user-superadmin'`
    );
    const currentHash = adminRows[0]?.password_hash;

    console.log('✅ Database migrations completed successfully!');

    if (!currentHash || currentHash === PLACEHOLDER_HASH) {
      const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
      const hashedPassword = await bcrypt.hash(seedPassword, 10);
      await client.query(
        `UPDATE users SET password_hash = $1 WHERE id = 'user-superadmin'`,
        [hashedPassword]
      );
      console.log('\n📝 Superadmin seeded:');
      console.log('   Email:    admin@linenflow.com');
      if (process.env.SEED_ADMIN_PASSWORD) {
        console.log('   Password: (from SEED_ADMIN_PASSWORD)');
      } else {
        console.log('   Password: Admin123!  ⚠️  DEFAULT — change it, and set SEED_ADMIN_PASSWORD in production!');
      }
      console.log();
    } else {
      console.log('\n🔒 Superadmin password already set — leaving it unchanged.\n');
    }
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
