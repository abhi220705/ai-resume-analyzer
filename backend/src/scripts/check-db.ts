import { prisma } from "../lib/prisma.js";

async function main() {
  try {
    const userCount = await prisma.user.count();

    console.log("Database connection successful.");
    console.log(`Total users: ${userCount}`);
  } catch (error) {
    console.error(
      "Database check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();