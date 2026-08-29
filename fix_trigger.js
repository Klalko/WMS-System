const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $function$
      BEGIN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
          NEW.id,
          NEW.raw_user_meta_data ->> 'full_name',
          'WORKER'::public."Role"
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $function$;
    `);
    console.log("Trigger fixed with public search path!");
  } catch (e) {
    console.error("Error fixing trigger:", e.message);
  }

  await client.end();
}

main().catch(console.error);
