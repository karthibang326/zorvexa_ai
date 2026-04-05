import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | null = null;

export function prismaEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  if (!prismaEnabled()) {
    throw new Error("Prisma not configured. Set DATABASE_URL to use Prisma/Postgres storage.");
  }
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

