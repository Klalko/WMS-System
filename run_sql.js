const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_sku_key";
    `);
    console.log('Successfully dropped the unique constraint on products.sku!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
