import { PrismaClient } from "@prisma/client";

// One client for the whole process. All queries go through Prisma, so values are always parameterised.
export const prisma = new PrismaClient({ log: ["warn", "error"] });
