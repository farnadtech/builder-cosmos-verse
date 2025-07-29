import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

// Get database path
const getDbPath = () => {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'zemano.db');
};

// Initialize SQLite connection
export const initSQLiteConnection = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
  try {
    const dbPath = getDbPath();
    console.log('🔄 Connecting to SQLite database at:', dbPath);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    console.log('✅ SQLite database connected successfully');
    return db;
  } catch (error) {
    console.error('❌ SQLite connection failed:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
  if (!db) {
    db = await initSQLiteConnection();
  }
  return db;
};

// Execute query with SQLite
export const sqliteQuery = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const database = await getDatabase();
    
    // Check if it's a SELECT query
    if (sql.trim().toLowerCase().startsWith('select')) {
      const result = await database.all(sql, params);
      return { rows: result };
    } else {
      const result = await database.run(sql, params);
      return { 
        rows: result.lastID ? [{ id: result.lastID }] : [],
        rowCount: result.changes 
      };
    }
  } catch (error) {
    console.error('SQLite query error:', error);
    throw error;
  }
};

// Execute transaction
export const sqliteTransaction = async (queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> => {
  const database = await getDatabase();
  
  try {
    await database.exec('BEGIN TRANSACTION');
    const results = [];
    
    for (const { sql, params = [] } of queries) {
      const result = await sqliteQuery(sql, params);
      results.push(result);
    }
    
    await database.exec('COMMIT');
    return results;
  } catch (error) {
    await database.exec('ROLLBACK');
    console.error('SQLite transaction error:', error);
    throw error;
  }
};

// Test connection
export const testSQLiteConnection = async (): Promise<void> => {
  try {
    const database = await getDatabase();
    await database.get('SELECT 1 as test');
    console.log('✅ SQLite connection test successful');
  } catch (error) {
    console.error('❌ SQLite connection test failed:', error);
    throw error;
  }
};

// Close connection
export const closeSQLiteConnection = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('🔒 SQLite connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing SQLite connection...');
  await closeSQLiteConnection();
  process.exit(0);
});
