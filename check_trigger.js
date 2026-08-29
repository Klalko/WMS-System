const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'handle_new_user';
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (e) {
    console.error("Error:", e.message);
  }

  await client.end();
}

main().catch(console.error);
