import { useState, useEffect, useMemo, useCallback } from 'react'
import { VideoFeed } from './components/VideoFeed.jsx'
import { Navbar } from './components/Navbar.jsx'
import { DomainFilter } from './components/DomainFilter.jsx'
import { AddLinks } from './components/AddLinks.jsx'
import { ToastContainer } from './components/Toast.jsx'
import { useFavorites } from './hooks/useFavorites.js'
import { useToast } from './hooks/useToast.js'
import { getDomain, shuffle } from './utils/helpers.js'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadTheme() {
  return localStorage.getItem('videofeed_theme') || 'system'
}

export default function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [showFavsOnly, setShowFavsOnly] = useState(false)
  const [showAddLinks, setShowAddLinks] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [shuffled, setShuffled] = useState(false)
  const [theme, setTheme] = useState(loadTheme)
  const [navHidden, setNavHidden] = useState(false)

  const { isFav, toggle: toggleFav } = useFavorites()
  const { toasts, show: showToast } = useToast()

  // Apply theme to document
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-theme', resolved)
    localStorage.setItem('videofeed_theme', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Load videos.json
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}videos.json`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(data => {
        setVideos(Array.isArray(data) ? data : [])
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  // Keyboard shortcut: Home key scrolls to top (handled in VideoFeed)
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Escape' && showAddLinks) setShowAddLinks(false)
      if (e.key === '/' && !showAddLinks) {
        e.preventDefault()
        document.querySelector('.navbar-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddLinks])

  // Auto-hide navbar on scroll (optional UX improvement)
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
        setNavHidden(y > lastY + 20 && y > 100)
        if (y < lastY || y < 100) setNavHidden(false)
        lastY = y
        ticking = false
      })
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  // Available domains for filter
  const domainList = useMemo(() => {
    const counts = {}
    videos.forEach(v => {
      const d = getDomain(v.url)
      counts[d] = (counts[d] || 0) + 1
    })
    return Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
  }, [videos])

  // Filtered + sorted video list
  const filteredVideos = useMemo(() => {
    let list = shuffled ? shuffle(videos) : videos

    if (showFavsOnly) {
      list = list.filter(v => isFav(v.id))
    }

    if (selectedDomain) {
      list = list.filter(v => getDomain(v.url) === selectedDomain)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(v =>
        (v.title || '').toLowerCase().includes(q) ||
        (v.domain || getDomain(v.url)).toLowerCase().includes(q) ||
        v.url.toLowerCase().includes(q)
      )
    }

    return list
  }, [videos, shuffled, showFavsOnly, selectedDomain, search, isFav])

  const handleShuffle = useCallback(() => {
    setShuffled(s => !s)
    showToast(shuffled ? 'Originalreihenfolge' : 'Zufällige Reihenfolge', 'success')
  }, [shuffled, showToast])

  const handleCopy = useCallback((url) => {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Link kopiert!', 'success'))
      .catch(() => showToast('Kopieren fehlgeschlagen', 'error'))
  }, [showToast])

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  function toggleTheme() {
    setTheme(t => {
      if (t === 'system') return getSystemTheme() === 'dark' ? 'light' : 'dark'
      return t === 'dark' ? 'light' : 'dark'
    })
  }

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--separator)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ fontSize: 14, fontWeight: 500 }}>Lade Videos…</p>
      </div>
    )
  }

  return (
    <>
      <Navbar
        search={search}
        onSearch={setSearch}
        theme={resolvedTheme}
        onThemeToggle={toggleTheme}
        onShuffle={handleShuffle}
        onAddLinks={() => setShowAddLinks(true)}
        showFavsOnly={showFavsOnly}
        onFavsToggle={() => setShowFavsOnly(s => !s)}
        showFilters={showFilters}
        onFiltersToggle={() => setShowFilters(s => !s)}
        hidden={navHidden}
      />

      <DomainFilter
        domains={domainList}
        selected={selectedDomain}
        onSelect={setSelectedDomain}
        hidden={!showFilters || navHidden}
      />

      <VideoFeed
        videos={filteredVideos}
        isFav={isFav}
        onFavToggle={toggleFav}
        onCopy={handleCopy}
      />

      {showAddLinks && (
        <AddLinks
          existingVideos={videos}
          onClose={() => setShowAddLinks(false)}
          onToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </>
  )
}
