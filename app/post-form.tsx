'use client'

import { useState } from 'react'

const POST_TYPES = ['PIT', 'PEAK', 'BUFFALO'] as const
type PostType = (typeof POST_TYPES)[number] // PostType === 'PIT' | 'PEAK' | 'BUFFALO'


//component takes no props, manages its own state, renders a form
export default function PostForm() {
  const [text, setText] = useState('')
  const [type, setType] = useState<PostType>('PEAK')

  const [loading, setLoading] = useState(false)
  //stores an error message if something goes wrong
  const [error, setError] = useState<string | null>(null)
  const isValid = text.trim().length > 0

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })
  }

  //runs when form is submitted. e is the submit event
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault() //forms reload the page automaticallys, this says DONT
    setLoading(true)
    setError(null)

    try {
      const position = await getPosition()
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type, lat, lng }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create post')
      }

    setText('')
    window.dispatchEvent(new Event('ppb:refreshPosts'))

    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded-lg">
      <div className="flex justify-center gap-6"> 
        <button type="button"  onClick={()=>setType('PEAK')} className={type === 'PEAK' ? 'font-bold underline' : 'text-gray-500'}>Peak</button> 
        <button type="button"  onClick={()=>setType('PIT')} className={type === 'PIT' ? 'font-bold underline' : 'text-gray-500'}>Pit</button> 
        <button type="button"  onClick={()=>setType('BUFFALO')} className={type === 'BUFFALO' ? 'font-bold underline' : 'text-gray-500'}>Buffalo</button> 
      </div>
      <div className="tabcontent">
          {type === 'PEAK' ? (
            <h3>⛰️</h3>
          ) : type === 'PIT' ? (
            <h3>🕳️</h3>
          ) : (
            <h3>🦬</h3>
          )}
        </div>
        <textarea
          className="w-full rounded border px-2 py-1 text-sm"
          rows={4} 
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full rounded bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
