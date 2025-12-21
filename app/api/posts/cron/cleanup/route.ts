import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await prisma.post.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })

  return NextResponse.json({ deleted: result.count })
}
