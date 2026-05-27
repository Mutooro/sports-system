const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const createDatabase = async () => {
  const dbName = process.env.DB_NAME || 'sports_management_db';
  
  // Connect to the default 'postgres' database first to create the custom database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    
    // Check if the database already exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      // Create database
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`ℹ️ Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

createDatabase();
