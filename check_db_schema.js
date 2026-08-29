const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `);
    console.log("Columns in profiles:");
    console.table(res.rows);

    const checkRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'public.profiles'::regclass;
    `);
    console.log("Constraints on profiles:");
    console.table(checkRes.rows);
    
  } catch (e) {
    console.error("Error:", e.message);
  }

  await client.end();
}

main().catch(console.error);
