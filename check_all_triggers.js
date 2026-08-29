const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT tgname, pg_get_triggerdef(t.oid) as trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users';
    `);
    console.log("Triggers on auth.users:");
    res.rows.forEach(r => console.log(r.tgname, '->', r.trigger_def));
  } catch (e) {
    console.error("Error:", e.message);
  }

  await client.end();
}

main().catch(console.error);
