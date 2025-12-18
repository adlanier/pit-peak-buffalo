// app/posts-list.tsx

//This describes the shape of a Post object. Used for type checking.
const POST_TYPES = ['PIT', 'PEAK', 'BUFFALO'] as const
type PostType = (typeof POST_TYPES)[number] // PostType === 'PIT' | 'PEAK' | 'BUFFALO'

type Post = {
  id: string
  text: string
  type: PostType
  lat: number
  lng: number
  createdAt: string | Date
}

export default function PostsList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <p className="text-center text-sm text-gray-500">No entries yet.</p>
  }

  return (
    <ul className="space-y-4">
      {posts.map(post => (
        <li key={post.id} className="rounded-lg border p-4 space-y-1">
          <p className="text-sm">
            <span className="font-semibold">
              {post.type === 'PEAK' ? '⛰️' : post.type === 'PIT' ? '🕳️' : '🦬'}
            </span>{' '}
            {post.text}
          </p>

          <p className="text-[11px] text-gray-500">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
