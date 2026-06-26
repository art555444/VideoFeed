import { useState, useCallback } from 'react'

const KEY = 'videofeed_favorites'

function load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function save(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]))
}

export function useFavorites() {
  const [favs, setFavs] = useState(() => load())

  const toggle = useCallback((id) => {
    setFavs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      save(next)
      return next
    })
  }, [])

  const isFav = useCallback((id) => favs.has(id), [favs])

  return { isFav, toggle, count: favs.size }
}
