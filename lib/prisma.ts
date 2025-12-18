// lib/prisma.ts

//In development, Next.js reloads files.
//Prisma must not reconnect every time.
//This file prevents that.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // add 'query' while debugging if you want to see every SQL statement Prisma sends
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
