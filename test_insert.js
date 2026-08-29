const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$executeRaw`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'WORKER'::"Role")
    `;
    console.log("Success:", res);
  } catch (e) {
    console.error('Prisma Error:', e.message);
  } finally {
    await prisma.$executeRaw`DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000000'`.catch(() => {});
    await prisma.$disconnect();
  }
}

main();
