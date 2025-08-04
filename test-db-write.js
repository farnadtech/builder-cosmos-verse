const sqlite3 = require('sqlite3');
const path = require('path');

// Test database write permissions
const dbPath = path.join(process.cwd(), 'data', 'zemano.db');
console.log('Testing database write at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  console.log('Database opened successfully');
  
  // Try to create a test table
  db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, test_value TEXT)', (err) => {
    if (err) {
      console.error('Error creating test table:', err);
    } else {
      console.log('Test table created successfully');
      
      // Try to insert data
      db.run('INSERT INTO test_table (test_value) VALUES (?)', ['test'], (err) => {
        if (err) {
          console.error('Error inserting test data:', err);
        } else {
          console.log('Test data inserted successfully');
          
          // Clean up
          db.run('DROP TABLE test_table', (err) => {
            if (err) {
              console.error('Error dropping test table:', err);
            } else {
              console.log('Test table dropped successfully');
            }
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
              } else {
                console.log('Database closed successfully');
              }
            });
          });
        }
      });
    }
  });
});
