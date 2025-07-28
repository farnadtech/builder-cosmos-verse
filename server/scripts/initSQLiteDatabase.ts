import { getDatabase, testSQLiteConnection } from '../database/sqlite-connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeSQLiteDatabase(): Promise<void> {
  try {
    console.log('🔄 Starting SQLite database initialization...');

    // Test connection first
    await testSQLiteConnection();

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/sqlite-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    const database = await getDatabase();
    
    // Execute the entire schema
    console.log('📋 Executing SQLite schema...');
    await database.exec(schemaSQL);

    console.log('✅ SQLite database schema initialized successfully!');

    // Verify tables exist
    const tablesResult = await database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log('📊 Created tables:', tablesResult.map(r => r.name).join(', '));

    // Check if admin user exists
    const adminCheck = await database.get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    
    if (!adminCheck) {
      console.log('👤 Creating default admin user...');
      await database.run(`
        INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, is_verified, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'مدیر',
        'سیستم', 
        'admin@zemano.ir',
        '+989123456789',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
        'admin',
        1,
        1
      ]);

      // Create wallet for admin
      const adminUser = await database.get('SELECT id FROM users WHERE email = ?', ['admin@zemano.ir']);
      if (adminUser) {
        await database.run('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [adminUser.id, 0]);
      }
      
      console.log('✅ Default admin user created successfully!');
    } else {
      console.log('👤 Admin user already exists');
    }

    console.log('🎉 SQLite database initialization completed!');

  } catch (error) {
    console.error('❌ SQLite database initialization failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeSQLiteDatabase()
    .then(() => {
      console.log('SQLite database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('SQLite database initialization failed:', error);
      process.exit(1);
    });
}
