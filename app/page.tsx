// app/page.tsx
import { prisma } from '@/lib/prisma' //give me the prisma client to talk to the db
import PostForm from './post-form'
import NearbyFeed from './nearby-feed'

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6">
      <h1 className="text-3xl font-bold text-center">pit • peak • buffalo</h1>
      <p className="text-center text-sm text-gray-500">
        Anonymously share the worst part of your day (pit), the best part (peak), or something weird that happened (buffalo).
      </p>

      <PostForm />
      <NearbyFeed />
    </main>
  )
}
