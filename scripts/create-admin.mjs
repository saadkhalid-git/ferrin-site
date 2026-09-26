// Creates an administrator. There is no public sign-up; this command is the only way to add one.
//   npm run admin:create                      → uses ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env, or asks
//   npm run admin:create -- --reset-password  → sets a new password for an existing email
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth.js";

const MIN_LENGTH = 12;
const reset = process.argv.includes("--reset-password");
const prisma = new PrismaClient();

async function ask(rl, question, fallback) {
  if (fallback) return fallback;
  return (await rl.question(question)).trim();
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = (await ask(rl, "Admin email: ", process.env.ADMIN_EMAIL)).toLowerCase();
    const name = await ask(rl, "Admin name: ", process.env.ADMIN_NAME || (reset ? "-" : ""));
    const password = await ask(rl, `Password (at least ${MIN_LENGTH} characters): `, process.env.ADMIN_PASSWORD);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (!reset && !name) throw new Error("Enter a name.");
    if (password.length < MIN_LENGTH) throw new Error(`The password must be at least ${MIN_LENGTH} characters.`);

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    const passwordHash = await hashPassword(password);
    if (existing && !reset) throw new Error(`An admin with ${email} already exists. Use --reset-password to change its password.`);
    if (!existing && reset) throw new Error(`No admin with ${email} exists.`);
    if (existing) {
      await prisma.adminUser.update({ where: { email }, data: { passwordHash } });
      console.log(`Password updated for ${email}.`);
    } else {
      await prisma.adminUser.create({ data: { email, name, passwordHash, role: "ADMIN" } });
      console.log(`Admin ${email} created. You can remove ADMIN_PASSWORD from .env now.`);
    }
  } finally {
    rl.close();
  }
}

main()
  .catch(err => { console.error(err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
