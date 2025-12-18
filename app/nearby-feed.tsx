'use client'

import {useEffect, useState} from 'react'
import  PostsList from './posts-list'

type PostType = 'PIT' | 'PEAK' | 'BUFFALO'

type Post = {
  id: string
  text: string
  type: PostType
  lat: number
  lng: number
  createdAt: string | Date
}

type RadiusOption = 'global' | 5 | 10 | 25 | 50
export default function NearbyFeed() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [radius, setRadius] = useState<RadiusOption>(25)
    
    useEffect(()=>{
        //Prevents updating state after the component unmounts “Can’t update state on unmounted component”
        let cancelled = false

        // load() is inside useEffect because useEffect itself cannot be async.
        async function load(){
            //Every fetch shows loading and clears old errors
            setLoading(true)
            setError(null)

        try {
            //global, no location needed
            if (radius === 'global') {
                const res = await fetch('/api/posts', { cache: 'no-store' })
                if(!res.ok) throw new Error('Failed to load posts')
                const data = await res.json()
                if(!cancelled) setPosts(data)
                return //Prevent geolocation code from running
            }

            if(!navigator.geolocation){
                throw new Error('Geolocation is not supported in this browser')
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                })
            })

            const lat = position.coords.latitude
            const lng = position.coords.longitude

            const res = await fetch(`/api/posts?lat=${lat}&lng=${lng}&radiusKm=${radius}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to load posts')

            const data = await res.json()
            if(!cancelled) setPosts(data)
        }catch(e:any){
            if (!cancelled) setError(e?.message ?? 'Could not fetch posts')
        }finally{
            if(!cancelled) setLoading(false)
        }
    }

    load()
    return ()=>{
        cancelled = true
        }

    //Every time radius changes
    }, [radius])

    return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Radius</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={radius}
          onChange={(e) => {
            const v = e.target.value
            setRadius(v === 'global' ? 'global' : (Number(v) as RadiusOption))
          }}
        >
          <option value="global">Global</option>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="25">25 km</option>
          <option value="50">50 km</option>
        </select>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
    
        {/* <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify({ count: posts.length, first: posts[0] }, null, 2)}
        </pre> */}

      {!loading && !error && <PostsList posts={posts} />}
    </div>
  )
}