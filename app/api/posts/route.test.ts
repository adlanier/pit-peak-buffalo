import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMocks = vi.hoisted(() => {
  return {
    findMany: vi.fn(),
    create: vi.fn(),
  }
})

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      post: {
        findMany: prismaMocks.findMany,
        create: prismaMocks.create,
      },
    },
  }
})

vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (data: any, init?: ResponseInit) => {
        const status = init?.status ?? 200
        return new Response(JSON.stringify(data), {
          status,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  }
})

// Import AFTER mocks
import { GET, POST } from './route'

async function readJson(res: Response) {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

describe('app/api/posts/route.ts', () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset()
    prismaMocks.create.mockReset()
    vi.useRealTimers()
  })

  describe('POST', () => {
    it('returns 400 if required fields are missing/invalid', async () => {
      const req = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '', type: 'PIT', lat: 1, lng: 2 }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)

      const body = await readJson(res)
      expect(body).toEqual({
        error: 'Valid text, type (PEAK/PIT/BUFFALO), lat, and lng are required',
      })

      expect(prismaMocks.create).not.toHaveBeenCalled()
    })

    it('trims text, creates post, and returns 201', async () => {
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      const created = {
        id: 'abc',
        text: 'hello',
        type: 'PIT',
        lat: 10,
        lng: 20,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        createdAt: now,
      }

      prismaMocks.create.mockResolvedValue(created)

      const req = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '  hello  ', type: 'PIT', lat: 10, lng: 20 }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)

      const body = await readJson(res)
      expect(body).toEqual({
        ...created,
        createdAt: created.createdAt.toISOString(),
        expiresAt: created.expiresAt.toISOString(),
        })


      expect(prismaMocks.create).toHaveBeenCalledTimes(1)
      const args = prismaMocks.create.mock.calls[0][0]

      expect(args.data.text).toBe('hello')
      expect(args.data.type).toBe('PIT')
      expect(args.data.lat).toBe(10)
      expect(args.data.lng).toBe(20)

      const expiresAt = args.data.expiresAt as Date
      expect(expiresAt.toISOString()).toBe(created.expiresAt.toISOString())
    })

    it('returns 400 for invalid type', async () => {
      const req = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'yo', type: 'NOPE', lat: 1, lng: 2 }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(prismaMocks.create).not.toHaveBeenCalled()
    })
  })

  describe('GET', () => {
    it('when lat/lng are missing, returns GLOBAL feed filtered by expiresAt > now', async () => {
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      const fakePosts = [{ id: '1' }, { id: '2' }]
      prismaMocks.findMany.mockResolvedValue(fakePosts)

      const req = new Request('http://localhost/api/posts')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const body = await readJson(res)
      expect(body).toEqual(fakePosts)

      expect(prismaMocks.findMany).toHaveBeenCalledTimes(1)
      expect(prismaMocks.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })

    it('when lat/lng are present but invalid, falls back to GLOBAL feed filtered by expiresAt > now', async () => {
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      prismaMocks.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/posts?lat=999&lng=0')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prismaMocks.findMany).toHaveBeenCalledTimes(1)
      expect(prismaMocks.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })

    it('rejects radiusKm > 100 and falls back to GLOBAL feed', async () => {
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      prismaMocks.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/posts?lat=35&lng=-78&radiusKm=200')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prismaMocks.findMany).toHaveBeenCalledTimes(1)
      expect(prismaMocks.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })

    it('when lat/lng and radius are valid, queries bounding box and filters expiresAt > now', async () => {
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      prismaMocks.findMany.mockResolvedValue([{ id: 'near' }])

      const req = new Request('http://localhost/api/posts?lat=35&lng=-78')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prismaMocks.findMany).toHaveBeenCalledTimes(1)

      const arg = prismaMocks.findMany.mock.calls[0][0]

      expect(arg.orderBy).toEqual({ createdAt: 'desc' })
      expect(arg.take).toBe(100)

      expect(arg.where).toHaveProperty('lat')
      expect(arg.where).toHaveProperty('lng')
      expect(arg.where.lat).toHaveProperty('gte')
      expect(arg.where.lat).toHaveProperty('lte')
      expect(arg.where.lng).toHaveProperty('gte')
      expect(arg.where.lng).toHaveProperty('lte')

      expect(arg.where.expiresAt).toEqual({ gt: now })
    })
  })
})
