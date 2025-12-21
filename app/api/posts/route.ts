// app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'


const ALLOWED_TYPES = ['PIT', 'PEAK', 'BUFFALO'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

const DEFAULT_RADIUS_KM = 25

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
 // const radiusParam = searchParams.get('radiusKm')

  // If lat/lng are missing -> GLOBAL feed
  if (latParam === null || lngParam === null) {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(posts)
  }

  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const radiusKm = Number(searchParams.get('radiusKm') ?? DEFAULT_RADIUS_KM)

  // If no location provided (or invalid), fall back to latest posts (global)
  const latOk = Number.isFinite(lat) && Math.abs(lat) <= 90 //south pole is -90, north is 90 
  const lngOk = Number.isFinite(lng) && Math.abs(lng) <= 180// valid range is -180 to 180
  const rOk = Number.isFinite(radiusKm) && radiusKm > 0 && radiusKm <= 100 //radius cant be zero and radius over 100 is just too big to be nearby

  if (!latOk || !lngOk || !rOk) {
    const posts = await prisma.post.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(posts)
  }

  // Bounding box around (lat, lng)
  const latDelta = radiusKm / 111 // ~111km per degree latitude
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))

  const posts = await prisma.post.findMany({
    where: {
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      expiresAt: { gte : new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  const body = await req.json()

  const { text, type, lat, lng } = body

  const cleanText = typeof text === 'string' ? text.trim() : ''

  const isTypeValid = ALLOWED_TYPES.includes(type as AllowedType)

  if (!cleanText || !isTypeValid || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json(
      { error: 'Valid text, type (PEAK/PIT/BUFFALO), lat, and lng are required' },
      { status: 400 },
    )
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)


  const post = await prisma.post.create({
    data: { text: cleanText, type: type as AllowedType, lat, lng, expiresAt, },
  })

  return NextResponse.json(post, { status: 201 })
}
