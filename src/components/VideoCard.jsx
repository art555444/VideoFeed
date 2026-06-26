import { useState } from 'react'
import { getDomain, getSourceName, getDomainColor } from '../utils/helpers.js'
import { IconHeart, IconCopy, IconExternalLink } from './Icons.jsx'

export function VideoCard({ video, index, total, isFav, onFavToggle, onCopy }) {
  const [thumbErr, setThumbErr] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [popHeart, setPopHeart] = useState(false)

  const domain = getDomain(video.url)
  const source = getSourceName(domain)
  const domainColor = getDomainColor(domain)
  const hasThumbnail = video.thumbnail && !thumbErr

  function handleFav() {
    onFavToggle(video.id)
    if (!isFav) {
      setPopHeart(true)
      setTimeout(() => setPopHeart(false), 350)
    }
  }

  return (
    <div className="feed-item">

      {/* Fullscreen background */}
      {hasThumbnail ? (
        <>
          {!thumbLoaded && (
            <div className="card-bg-solid" style={{
              background: `linear-gradient(135deg, ${domainColor.from}, ${domainColor.to})`
            }} />
          )}
          <img
            className="card-fullbg"
            src={video.thumbnail}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onLoad={() => setThumbLoaded(true)}
            onError={() => setThumbErr(true)}
            style={{ opacity: thumbLoaded ? 1 : 0 }}
          />
        </>
      ) : (
        <div className="card-bg-solid" style={{
          background: `linear-gradient(160deg, ${domainColor.from} 0%, ${domainColor.to} 100%)`
        }} />
      )}

      {/* Gradient scrim */}
      <div className="card-scrim" />

      {/* Right-side TikTok action buttons */}
      <div className="card-actions">
        <button
          className={`action-btn${isFav ? ' action-btn--fav' : ''}${popHeart ? ' heart-pop' : ''}`}
          onClick={handleFav}
          aria-label={isFav ? 'Favorit entfernen' : 'Favorit hinzufügen'}
        >
          <span className="action-icon"><IconHeart filled={isFav} /></span>
          <span className="action-label">{isFav ? 'Saved' : 'Merken'}</span>
        </button>

        <button className="action-btn" onClick={() => onCopy(video.url)} aria-label="Link kopieren">
          <span className="action-icon"><IconCopy /></span>
          <span className="action-label">Kopieren</span>
        </button>

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn action-btn--open"
          aria-label="Video öffnen"
        >
          <span className="action-icon"><IconExternalLink /></span>
          <span className="action-label">Öffnen</span>
        </a>
      </div>

      {/* Bottom info */}
      <div className="card-info">
        <span className="card-source-tag" style={{
          background: `${domainColor.from}28`,
          borderColor: `${domainColor.from}55`,
        }}>
          {source}
        </span>
        <h2 className="card-title">
          {video.title || `${source} · Video`}
        </h2>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="card-open-link">
          <IconExternalLink />
          Video öffnen
        </a>
      </div>

      {/* Counter top-right */}
      <div className="card-index">{index + 1}<span>/{total}</span></div>

    </div>
  )
}
