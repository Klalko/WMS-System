const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@gmail.com',
    password: 'password1234',
    options: { data: { full_name: 'Worker' } }
  });
  
  if (error) {
    console.error("SignUp Error:", error.status, error.message);
  } else {
    console.log("SignUp Success! User ID:", data.user?.id);
  }
}

main();
