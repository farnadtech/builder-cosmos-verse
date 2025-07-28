import { sqliteQuery, getDatabase } from './sqlite-connection';

// Convert PostgreSQL parameterized queries ($1, $2) to SQLite (?, ?)
const convertParamsToSQLite = (sql: string, params: any[] = []): { sql: string; params: any[] } => {
  let convertedSql = sql;
  
  // Replace PostgreSQL parameters ($1, $2, etc) with SQLite parameters (?)
  const paramMatches = sql.match(/\$\d+/g);
  if (paramMatches) {
    const uniqueParams = [...new Set(paramMatches)];
    uniqueParams.sort((a, b) => {
      const aNum = parseInt(a.substring(1));
      const bNum = parseInt(b.substring(1));
      return aNum - bNum;
    });
    
    uniqueParams.forEach((param) => {
      convertedSql = convertedSql.replace(new RegExp('\\' + param, 'g'), '?');
    });
  }
  
  // Replace PostgreSQL specific functions
  convertedSql = convertedSql.replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
  convertedSql = convertedSql.replace(/RETURNING/g, '-- RETURNING');
  
  // Handle boolean values for SQLite (convert TRUE/FALSE to 1/0)
  const convertedParams = params.map(param => {
    if (param === true) return 1;
    if (param === false) return 0;
    return param;
  });
  
  return { sql: convertedSql, params: convertedParams };
};

// Wrapper function that mimics PostgreSQL query interface
export const query = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const { sql: convertedSql, params: convertedParams } = convertParamsToSQLite(sql, params);
    
    // Handle RETURNING clause manually for INSERT operations
    if (sql.includes('RETURNING')) {
      const database = await getDatabase();
      
      // Execute the INSERT without RETURNING
      const insertSql = convertedSql.split('-- RETURNING')[0].trim();
      const result = await database.run(insertSql, convertedParams);
      
      // Get the inserted row
      if (result.lastID) {
        const returningSql = sql.split('RETURNING')[1].trim();
        const selectSql = `SELECT ${returningSql} FROM ${getTableNameFromInsert(sql)} WHERE id = ?`;
        const selectResult = await database.get(selectSql, [result.lastID]);
        return { rows: selectResult ? [selectResult] : [] };
      }
      
      return { rows: [] };
    }
    
    // For regular queries
    return await sqliteQuery(convertedSql, convertedParams);
  } catch (error) {
    console.error('Query wrapper error:', error);
    throw error;
  }
};

// Helper function to extract table name from INSERT statement
const getTableNameFromInsert = (sql: string): string => {
  const match = sql.match(/INSERT INTO\s+(\w+)/i);
  return match ? match[1] : '';
};

// Execute transaction
export const executeTransaction = async (queries: Array<{ text: string; params?: any[] }>): Promise<any[]> => {
  const database = await getDatabase();
  
  try {
    await database.exec('BEGIN TRANSACTION');
    const results = [];
    
    for (const { text, params = [] } of queries) {
      const result = await query(text, params);
      results.push(result);
    }
    
    await database.exec('COMMIT');
    return results;
  } catch (error) {
    await database.exec('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  }
};
