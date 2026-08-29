const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  await client.query(`ALTER TABLE "invited_users" ADD COLUMN IF NOT EXISTS "password" TEXT;`);
  
  console.log('Column added successfully using pg!');
  await client.end();
}

main().catch(console.error);
