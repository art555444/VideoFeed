import { useState } from 'react'
import { extractLinks, getDomain } from '../utils/helpers.js'
import {
  IconX, IconCheck, IconCopy, IconDownload, IconPlus
} from './Icons.jsx'

export function AddLinks({ existingVideos, onClose, onToast }) {
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState(null)

  const existingUrls = new Set(existingVideos.map(v => v.url))

  function analyze() {
    const links = extractLinks(raw)
    if (!links.length) {
      onToast('Keine Links gefunden', 'error')
      return
    }
    const newLinks = links.filter(l => !existingUrls.has(l))
    const dupLinks = links.filter(l => existingUrls.has(l))
    setResult({ links, newLinks, dupLinks })
  }

  function buildNewJson() {
    if (!result) return ''
    const today = new Date().toISOString().split('T')[0]
    const newEntries = result.newLinks.map(url => ({
      id: crypto.randomUUID(),
      url,
      title: '',
      thumbnail: null,
      domain: getDomain(url),
      source: getDomain(url),
      addedAt: today,
      status: 'unknown',
    }))
    const merged = [...existingVideos, ...newEntries]
    return JSON.stringify(merged, null, 2)
  }

  function handleCopy() {
    const json = buildNewJson()
    if (!json) return
    navigator.clipboard.writeText(json).then(() => {
      onToast('JSON kopiert!', 'success')
    }).catch(() => {
      onToast('Kopieren fehlgeschlagen', 'error')
    })
  }

  function handleDownload() {
    const json = buildNewJson()
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'videos.json'
    a.click()
    URL.revokeObjectURL(url)
    onToast('videos.json heruntergeladen', 'success')
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label="Links hinzufügen">
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">Links hinzufügen</h2>
          <button className="modal-close" onClick={onClose} aria-label="Schließen">
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <label className="modal-label" htmlFor="link-input">
              Links einfügen (einer pro Zeile oder gemischt)
            </label>
            <textarea
              id="link-input"
              className="modal-textarea"
              placeholder={"https://example.com/video1\nhttps://example.com/video2\n..."}
              value={raw}
              onChange={e => { setRaw(e.target.value); setResult(null) }}
              spellCheck={false}
            />
          </div>

          <div className="modal-action-row">
            <button className="btn btn-primary" onClick={analyze}>
              <IconCheck />
              Analysieren
            </button>
            {raw && (
              <button className="btn btn-secondary" onClick={() => { setRaw(''); setResult(null) }}>
                <IconX />
                Leeren
              </button>
            )}
          </div>

          {result && (
            <>
              <div className="result-header">
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                  {result.links.length} Links erkannt
                </span>
                <div className="result-stats">
                  <span className="badge badge-new">
                    <IconCheck style={{ width: 11, height: 11, marginRight: 3 }} />
                    {result.newLinks.length} neu
                  </span>
                  {result.dupLinks.length > 0 && (
                    <span className="badge badge-dup">
                      {result.dupLinks.length} Duplikat{result.dupLinks.length !== 1 ? 'e' : ''}
                    </span>
                  )}
                </div>
              </div>

              {result.newLinks.length > 0 && (
                <div className="link-list">
                  {result.newLinks.map((url, i) => (
                    <div key={i} className="link-item">
                      <div className="link-item-dot new" />
                      <span className="link-item-url">{url}</span>
                      <span className="link-item-domain">{getDomain(url)}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.dupLinks.length > 0 && (
                <div>
                  <p className="modal-label" style={{ marginBottom: 6 }}>
                    Bereits vorhanden ({result.dupLinks.length})
                  </p>
                  <div className="link-list" style={{ maxHeight: 120 }}>
                    {result.dupLinks.map((url, i) => (
                      <div key={i} className="link-item">
                        <div className="link-item-dot dup" />
                        <span className="link-item-url">{url}</span>
                        <span className="link-item-domain">{getDomain(url)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.newLinks.length > 0 && (
                <>
                  <div className="info-box">
                    <strong>Hinweis:</strong> GitHub Pages kann Dateien nicht direkt speichern.
                    Lade die neue <code>videos.json</code> herunter und ersetze{' '}
                    <code>public/videos.json</code> im Projektordner. Danach{' '}
                    <code>npm run build:videos</code> (für Metadaten) und neu deployen.
                  </div>

                  <div className="modal-action-row">
                    <button className="btn btn-primary" onClick={handleCopy}>
                      <IconCopy />
                      JSON kopieren
                    </button>
                    <button className="btn btn-secondary" onClick={handleDownload}>
                      <IconDownload />
                      videos.json laden
                    </button>
                  </div>

                  <div>
                    <p className="modal-label">Vorschau der neuen videos.json</p>
                    <textarea
                      className="copy-textarea"
                      readOnly
                      value={buildNewJson()}
                      onClick={e => e.target.select()}
                    />
                  </div>
                </>
              )}

              {result.newLinks.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Alle Links sind bereits in deiner Liste vorhanden.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
