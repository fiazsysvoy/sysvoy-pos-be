import { prisma } from "../src/lib/prisma";

async function main() {
  // create new admin user
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: "admin",
      name: "Admin User",
      role: "ADMIN",
    },
  });
  const allUsers = await prisma.user.findMany();
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
