import { pool, query } from '../database/connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Starting database initialization...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL commands (basic implementation)
    const commands = schemaSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 Executing ${commands.length} SQL commands...`);

    for (const command of commands) {
      try {
        await query(command);
      } catch (error: any) {
        // Ignore errors for existing tables/constraints
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`⚠️ Skipping existing: ${error.message.split('\n')[0]}`);
          continue;
        }
        throw error;
      }
    }

    console.log('✅ Database schema initialized successfully!');

    // Verify tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📊 Created tables:', tablesResult.rows.map(r => r.table_name).join(', '));

    // Check if admin user exists
    const adminCheck = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating default admin user...');
      await query(`
        INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, is_verified, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'مدیر',
        'سیستم', 
        'admin@zemano.ir',
        '+989123456789',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
        'admin',
        true,
        true
      ]);

      // Create wallet for admin
      const adminUser = await query('SELECT id FROM users WHERE email = $1', ['admin@zemano.ir']);
      await query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2)', [adminUser.rows[0].id, 0]);
      
      console.log('✅ Default admin user created successfully!');
    } else {
      console.log('👤 Admin user already exists');
    }

    console.log('🎉 Database initialization completed!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}
