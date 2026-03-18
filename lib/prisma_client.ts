// import { PrismaClient } from "@/app/generated/prisma/client"
// import { PrismaPg } from "@prisma/adapter-pg";
// const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// export const prisma = new PrismaClient({ adapter });

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Please check your Vercel environment variables."
    );
  }

  // Create a pg Pool (NOT just a connection string)
  // PrismaPg in 2026 works best with a Pool instance
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,  // Required for Supabase
    },
    max: 10,  // Connection pool size
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}