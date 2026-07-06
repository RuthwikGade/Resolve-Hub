const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

async function init() {
  console.log('⚡ Initializing ResolveHub Database...');
  
  // Connection config for default postgres database (to create the main DB)
  const defaultClient = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: 'postgres', // connect to default database first
  });

  try {
    await defaultClient.connect();
    console.log('✅ Connected to default postgres database');

    // Check if resolvehub database exists
    const dbCheck = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [env.db.name]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database "${env.db.name}"...`);
      // CREATE DATABASE cannot run inside a transaction blocks/prepared statements
      await defaultClient.query(`CREATE DATABASE ${env.db.name}`);
      console.log(`✅ Database "${env.db.name}" created successfully`);
    } else {
      console.log(`Database "${env.db.name}" already exists`);
    }
  } catch (err) {
    console.error('❌ Failed to check/create database:', err.message);
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  // Now connect to the new resolvehub database to apply the schema
  const dbClient = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
  });

  try {
    await dbClient.connect();
    console.log(`✅ Connected to database "${env.db.name}"`);

    console.log('Wiping existing database schema...');
    await dbClient.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('✅ Database schema wiped clean');

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema.sql scripts...');
    await dbClient.query(schemaSql);
    console.log('🎉 Schema applied successfully! All tables created.');
  } catch (err) {
    console.error('❌ Failed to apply database schema:', err.message);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

init();
