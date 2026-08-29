const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'WORKER')
    `);
    console.log("Success with 'WORKER' string:", res.rowCount);
  } catch (e) {
    console.error("Error inserting 'WORKER' string:", e.message);
  }
  
  try {
    const res = await client.query(`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Test', 'WORKER'::"Role")
    `);
    console.log("Success with 'WORKER'::\"Role\":", res.rowCount);
  } catch (e) {
    console.error("Error inserting 'WORKER'::\"Role\":", e.message);
  }

  await client.query(`DELETE FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001')`).catch(() => {});
  await client.end();
}

main().catch(console.error);
