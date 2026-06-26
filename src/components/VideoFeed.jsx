import { useRef, useEffect, useCallback } from 'react'
import { VideoCard } from './VideoCard.jsx'
import { IconArrowUp, IconVideo } from './Icons.jsx'

export function VideoFeed({ videos, isFav, onFavToggle, onCopy }) {
  const containerRef = useRef(null)
  const currentIndexRef = useRef(0)

  const scrollTo = useCallback((index) => {
    const container = containerRef.current
    if (!container) return
    const items = container.querySelectorAll('.feed-item')
    if (items[index]) {
      items[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
      currentIndexRef.current = index
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const total = videos.length
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        scrollTo(Math.min(currentIndexRef.current + 1, total - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        scrollTo(Math.max(currentIndexRef.current - 1, 0))
      } else if (e.key === 'Enter') {
        const current = videos[currentIndexRef.current]
        if (current) window.open(current.url, '_blank', 'noopener,noreferrer')
      } else if (e.key === 'f' || e.key === 'F') {
        const current = videos[currentIndexRef.current]
        if (current) onFavToggle(current.id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videos, scrollTo, onFavToggle])

  // Track current visible index via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const items = Array.from(container.querySelectorAll('.feed-item'))
            const idx = items.indexOf(entry.target)
            if (idx !== -1) currentIndexRef.current = idx
          }
        })
      },
      { root: container, threshold: 0.6 }
    )

    const items = container.querySelectorAll('.feed-item')
    items.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [videos])

  function scrollToTop() {
    scrollTo(0)
  }

  if (!videos.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <IconVideo />
        </div>
        <h2>Keine Videos gefunden</h2>
        <p>Versuche eine andere Suche oder entferne den Filter.</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="feed-container"
        role="main"
        aria-label={`Video-Feed, ${videos.length} Videos`}
      >
        {videos.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            index={i}
            total={videos.length}
            isFav={isFav(video.id)}
            onFavToggle={onFavToggle}
            onCopy={onCopy}
          />
        ))}
      </div>

      <div className="bottom-controls">
        <button
          className="scroll-up-btn"
          onClick={scrollToTop}
          aria-label="Zum Anfang scrollen"
          title="Zum Anfang (Pos1)"
        >
          <IconArrowUp />
        </button>
      </div>
    </>
  )
}
