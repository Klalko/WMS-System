const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS "invited_users" (
      "email" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'WORKER',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "invited_users_pkey" PRIMARY KEY ("email")
    );
  `);
  
  console.log('Table created successfully using pg!');
  await client.end();
}

main().catch(console.error);
