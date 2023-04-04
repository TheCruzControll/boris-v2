import { createClient } from "redis";
import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

require("dotenv-mono").load();

export const supabase = createSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient>;
};
export const redis: ReturnType<typeof createClient> =
  globalForRedis.redis ||
  createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_URL,
      port: 12758,
    },
  });
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
