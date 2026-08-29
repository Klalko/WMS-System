import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL
  if (!SUPER_ADMIN_EMAIL) {
    throw new Error('SUPER_ADMIN_EMAIL env var is required for seeding.')
  }

  // Upsert profile with super_admin role for the given email.
  // The profile row is created automatically by a Supabase trigger on signup.
  // This seed just ensures the role is promoted.
  const updated = await prisma.$executeRaw`
    UPDATE profiles
    SET role = 'super_admin'
    WHERE id = (
      SELECT id FROM auth.users WHERE email = ${SUPER_ADMIN_EMAIL} LIMIT 1
    )
  `

  if (updated === 0) {
    console.warn(
      `⚠️  No user found with email "${SUPER_ADMIN_EMAIL}". ` +
        `Sign up first, then re-run this seed.`
    )
  } else {
    console.log(`✅  Promoted "${SUPER_ADMIN_EMAIL}" to super_admin.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
