//import vitests helpers. 
//describe: groups tests
//it: one test case
//expect: assertations
//vi: vitest mocking and timer controls
//beforeEach: run setup before each test
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMocks = vi.hoisted(() => {
  return {
    //  Fake versions of prisma.post.findMany and prisma.post.create
    findMany: vi.fn(),
    create: vi.fn(),
  }
})

//mock the module that route imports. 
//instead of using the real prisma client to hit a real db, route.ts will get this mocked object
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      post: {
        //when route.ts calls prisma.post.findMany(...) it will actually call prismaMocks.findMany(...)
        findMany: prismaMocks.findMany,
        //------ prisma.post.create(...) ------- prismaMocks.create(...)
        create: prismaMocks.create,
      },
    },
  }
})

//mock NextResponse.json to inspect output easily
//real NextResponse.json returns a Next Response object, here we return a standard Web Response w JSON text and a status code
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

// Helper to read JSON from our Response
async function readJson(res: Response) {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Top-level test group for the route file
describe('app/api/posts/route.ts', () => {
  // Runs before every single test in this file
  beforeEach(() => {
    // Clear call history + reset any mocked return values so tests do not leak into each other
    prismaMocks.findMany.mockReset()
    prismaMocks.create.mockReset()
    // Make sure we start each test with real timers unless a test explicitly enables fake timers
    vi.useRealTimers()
  })

  // Tests for the POST handler
  describe('POST', () => {
    it('returns 400 if required fields are missing/invalid', async () => {
      //Bad input should return 400 and should not touch the database.

      //Arrange
      const req = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '', type: 'PIT', lat: 1, lng: 2 }),
      })
      //Act
      //calling API function directly.
      const res = await POST(req)

      //Assert
      expect(res.status).toBe(400)
      const body = await readJson(res)
      expect(body).toEqual({
        error: 'Valid text, type (PEAK/PIT/BUFFALO), lat, and lng are required',
      })

      expect(prismaMocks.create).not.toHaveBeenCalled()
    })

    it('trims text, creates post, and returns 201', async () => {
      //"Happy path"
      //Good input should create a post, return 201, trim text, and set expiresAt correctly.

      //Arrange
      //freeze time so that expiresAt calculation is predictable
      vi.useFakeTimers()
      const now = new Date('2025-12-21T18:00:00.000Z')
      vi.setSystemTime(now)

      //Arrange
      const created = {
        id: 'abc',
        text: 'hello',
        type: 'PIT',
        lat: 10,
        lng: 20,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        createdAt: now,
      }

      //what should prisma return
      prismaMocks.create.mockResolvedValue(created)

      const req = new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        //build the request. notice text has white space -> test trimming
        body: JSON.stringify({ text: '  hello  ', type: 'PIT', lat: 10, lng: 20 }),
      })

      //Act
      const res = await POST(req)
      expect(res.status).toBe(201) //201 means “created”.

      const body = await readJson(res)
      expect(body).toEqual({
        ...created,
        createdAt: created.createdAt.toISOString(),
        expiresAt: created.expiresAt.toISOString(),
        })

      // grab the object passed into Prisma create.
      expect(prismaMocks.create).toHaveBeenCalledTimes(1)
      const args = prismaMocks.create.mock.calls[0][0]

      expect(args.data.text).toBe('hello') //This proves trimming happened before saving.
      expect(args.data.type).toBe('PIT')
      expect(args.data.lat).toBe(10)
      expect(args.data.lng).toBe(20)

      const expiresAt = args.data.expiresAt as Date
      expect(expiresAt.toISOString()).toBe(created.expiresAt.toISOString()) //This proves your expiration rule is correct.
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

    it('rejects whitespace only text', async () => {
        //Arrange: text is only spaces
        const req = new Request('http://localhost/api/posts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                text: '     ',
                type: 'PIT',
                lat: 10,
                lng: 10,
            }),
        })

        //Act
        const res = await POST(req)

        //Assert: should be treated as empty and rejected
        expect(res.status).toBe(400)

        const body = await readJson(res)
        expect(body).toEqual({
            error: 'Valid text, type (PEAK/PIT/BUFFALO), lat, and lng are required'
        })

        //Assert DB write should not happen 
        expect(prismaMocks.create).not.toHaveBeenCalled()
    })
  })
})
