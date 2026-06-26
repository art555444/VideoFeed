import { useState, useRef } from 'react'
import { getDomain, getSourceName, getDomainColor } from '../utils/helpers.js'
import {
  IconHeart, IconCopy, IconExternalLink, IconPlay
} from './Icons.jsx'

export function VideoCard({ video, index, total, isFav, onFavToggle, onCopy }) {
  const [thumbErr, setThumbErr] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [popHeart, setPopHeart] = useState(false)
  const domain = getDomain(video.url)
  const source = getSourceName(domain)
  const domainColor = getDomainColor(domain)

  function handleFav() {
    onFavToggle(video.id)
    if (!isFav) {
      setPopHeart(true)
      setTimeout(() => setPopHeart(false), 350)
    }
  }

  const hasThumbnail = video.thumbnail && !thumbErr

  return (
    <div className="feed-item">
      {/* Blurred background */}
      {hasThumbnail ? (
        <div
          className="card-bg"
          style={{ backgroundImage: `url(${video.thumbnail})` }}
        />
      ) : (
        <div
          className="card-bg-fallback"
          style={{
            background: `linear-gradient(135deg, ${domainColor.from} 0%, ${domainColor.to} 100%)`,
            opacity: 0.35,
          }}
        />
      )}

      {/* Gradient scrim */}
      <div className="card-scrim" />

      {/* Counter */}
      <div className="card-counter">{index + 1} / {total}</div>

      {/* Main content */}
      <div className="card-content">
        {/* Thumbnail area */}
        <div className="card-thumb-wrap">
          {hasThumbnail ? (
            <>
              {!thumbLoaded && (
                <div
                  className="card-thumb skeleton"
                  style={{ maxWidth: 480, aspectRatio: '16/9' }}
                />
              )}
              <img
                className="card-thumb"
                src={video.thumbnail}
                alt={video.title || 'Video thumbnail'}
                loading="lazy"
                onLoad={() => setThumbLoaded(true)}
                onError={() => setThumbErr(true)}
                style={{ display: thumbLoaded ? 'block' : 'none' }}
              />
            </>
          ) : (
            <div
              className="card-thumb-placeholder"
              style={{
                background: `linear-gradient(135deg, ${domainColor.from}22 0%, ${domainColor.to}11 100%)`,
                borderColor: `${domainColor.from}33`,
              }}
            >
              <div style={{ color: domainColor.from, opacity: 0.8 }}>
                <IconPlay style={{ width: 48, height: 48 }} />
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                padding: '0 16px'
              }}>
                Kein Vorschaubild verfügbar
              </span>
            </div>
          )}
        </div>

        {/* Right-side action buttons */}
        <div className="card-actions-row">
          <button
            className={`card-action-btn ${isFav ? 'fav-active' : ''} ${popHeart ? 'heart-pop' : ''}`}
            onClick={handleFav}
            aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            title={isFav ? 'Favorit entfernen' : 'Favorit hinzufügen'}
          >
            <IconHeart filled={isFav} />
          </button>

          <button
            className="card-action-btn"
            onClick={() => onCopy(video.url)}
            aria-label="Link kopieren"
            title="Link kopieren"
          >
            <IconCopy />
          </button>

          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-action-btn open-btn"
            aria-label="Video öffnen"
            title="Video öffnen"
          >
            <IconExternalLink />
          </a>
        </div>

        {/* Bottom info */}
        <div className="card-info">
          <div className="card-meta">
            <span
              className="card-domain-badge"
              style={{ background: `${domainColor.from}28`, borderColor: `${domainColor.from}44` }}
            >
              {source}
            </span>
            {video.addedAt && (
              <span className="card-meta-text">
                {new Date(video.addedAt).toLocaleDateString('de-DE')}
              </span>
            )}
          </div>

          <h2 className="card-title">
            {video.title || domain + ' – Video'}
          </h2>

          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-open-btn"
          >
            <IconExternalLink />
            Video öffnen
          </a>
        </div>
      </div>
    </div>
  )
}
