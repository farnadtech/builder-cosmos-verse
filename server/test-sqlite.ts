import { getDatabase, testSQLiteConnection } from './database/sqlite-connection';
import { query } from './database/query-wrapper';

async function testSQLite() {
  try {
    console.log('🔄 Testing SQLite connection...');
    
    // Test connection
    await testSQLiteConnection();
    
    // Test basic query
    const result = await query('SELECT COUNT(*) as count FROM users');
    console.log('📊 Users count:', result.rows[0].count);
    
    // Test admin user
    const admin = await query('SELECT * FROM users WHERE role = ?', ['admin']);
    console.log('👤 Admin user:', admin.rows[0]);
    
    // Test tables
    const database = await getDatabase();
    const tables = await database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    console.log('📋 Available tables:', tables.map(t => t.name).join(', '));
    
    console.log('✅ SQLite test completed successfully!');
    
  } catch (error) {
    console.error('❌ SQLite test failed:', error);
  }
}

// Run test
testSQLite();
