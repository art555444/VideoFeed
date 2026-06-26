import { useState, useEffect, useMemo, useCallback } from 'react'
import { VideoFeed } from './components/VideoFeed.jsx'
import { Navbar } from './components/Navbar.jsx'
import { ToastContainer } from './components/Toast.jsx'
import { useFavorites } from './hooks/useFavorites.js'
import { useToast } from './hooks/useToast.js'
import { getDomain, shuffle } from './utils/helpers.js'

export default function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFavsOnly, setShowFavsOnly] = useState(false)
  const [shuffledList, setShuffledList] = useState(null) // null = original order
  const [navHidden, setNavHidden] = useState(false)

  const { isFav, toggle: toggleFav } = useFavorites()
  const { toasts, show: showToast } = useToast()

  // Always dark
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // Load videos.json
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}videos.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector('.navbar-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Auto-hide navbar on scroll down, show on scroll up
  useEffect(() => {
    let lastY = 0
    let ticking = false
    function onScroll(e) {
      const el = e.target
      if (!el.classList?.contains('feed-container')) return
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = el.scrollTop
        if (y > lastY + 10 && y > 80) setNavHidden(true)
        else if (y < lastY - 10 || y < 80) setNavHidden(false)
        lastY = y
        ticking = false
      })
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  const isShuffled = shuffledList !== null

  const handleShuffle = useCallback(() => {
    if (isShuffled) {
      setShuffledList(null)
      showToast('Originalreihenfolge', 'success')
    } else {
      setShuffledList(shuffle(videos))
      showToast('Zufällige Reihenfolge', 'success')
    }
  }, [isShuffled, videos, showToast])

  const handleCopy = useCallback((url) => {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Link kopiert!', 'success'))
      .catch(() => showToast('Kopieren fehlgeschlagen', 'error'))
  }, [showToast])

  const filteredVideos = useMemo(() => {
    let list = isShuffled ? shuffledList : videos

    if (showFavsOnly) list = list.filter(v => isFav(v.id))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(v =>
        (v.title || '').toLowerCase().includes(q) ||
        getDomain(v.url).toLowerCase().includes(q) ||
        v.url.toLowerCase().includes(q)
      )
    }

    return list
  }, [videos, shuffledList, isShuffled, showFavsOnly, search, isFav])

  if (loading) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#000', color: 'rgba(255,255,255,0.5)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#0a84ff',
          animation: 'spin 0.75s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 14, fontWeight: 500 }}>Lade Videos…</p>
      </div>
    )
  }

  return (
    <>
      <Navbar
        search={search}
        onSearch={setSearch}
        onShuffle={handleShuffle}
        isShuffled={isShuffled}
        showFavsOnly={showFavsOnly}
        onFavsToggle={() => setShowFavsOnly(s => !s)}
        hidden={navHidden}
      />

      <VideoFeed
        videos={filteredVideos}
        isFav={isFav}
        onFavToggle={toggleFav}
        onCopy={handleCopy}
      />

      <ToastContainer toasts={toasts} />
    </>
  )
}
