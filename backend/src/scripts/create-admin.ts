import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { signupSchema } from "../validators/auth.schema.js";

async function main() {
  const parsed = signupSchema.safeParse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  delete process.env.ADMIN_PASSWORD;

  if (!parsed.success) {
    console.error("Invalid admin details:");
    for (const issue of parsed.error.issues) {
      console.error(`${issue.path.join(".")}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    console.error(
      "This email already exists. Use a separate email for your admin account.",
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
    },
    select: {
      email: true,
      role: true,
    },
  });

  console.log(`Admin created: ${admin.email} (${admin.role})`);
}

try {
  await main();
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    console.error("This email already exists. No account was changed.");
  } else {
    console.error("Admin creation failed. Check your database connection and configuration.");
  }

  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}