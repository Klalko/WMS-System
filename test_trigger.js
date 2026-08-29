const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role)
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'test_fake_user@example.com',
        'fake_hash',
        'authenticated',
        'authenticated'
      )
      RETURNING id;
    `);
    console.log("Success! Trigger ran fine:", res.rows);
  } catch (e) {
    console.error("TRIGGER ERROR:", e.message);
  }

  await client.query(`DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111'`).catch(() => {});
  await client.end();
}

main().catch(console.error);
