#!/usr/bin/env node
/**
 * build-videos.js
 * Reads video_links_only.txt, fetches OG/Twitter meta, writes public/videos.json
 *
 * Usage:
 *   node scripts/build-videos.js [--input path] [--output path] [--concurrency 3] [--delay 800]
 *
 * Strategies per domain:
 *   pornhub.com  → webmasters API  → OG scrape  → URL fallback
 *   xnxx.com     → URL title       → OG scrape  → URL fallback
 *   xhamster.com → OG scrape       → URL fallback
 *   others       → OG scrape       → URL fallback
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const arg = (flag, def) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : def
}
const hasFlag = flag => args.includes(flag)

const INPUT_FILE   = arg('--input', join(ROOT, 'video_links_only.txt'))
const OUTPUT_FILE  = arg('--output', join(ROOT, 'public', 'videos.json'))
const CONCURRENCY  = parseInt(arg('--concurrency', '3'), 10)
const DELAY_MS     = parseInt(arg('--delay', '800'), 10)
const REFRESH_ALL  = hasFlag('--refresh-all')
const VERBOSE      = hasFlag('--verbose')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(...a) { console.log('[build-videos]', ...a) }
function vlog(...a) { if (VERBOSE) log(...a) }

function uid(url) {
  return createHash('sha1').update(url).digest('hex').slice(0, 12)
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function getSource(domain) {
  if (domain.includes('pornhub')) return 'Pornhub'
  if (domain.includes('xnxx'))    return 'XNXX'
  if (domain.includes('xhamster')) return 'xHamster'
  if (domain.includes('xvideos')) return 'XVideos'
  if (domain.includes('redtube')) return 'Redtube'
  return domain
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function extractLinksFromText(text) {
  const re = /https?:\/\/[^\s\n"'<>]+/g
  return [...new Set(text.match(re) || [])]
}

// Extract title from XNXX URL path: /video-id/slug_with_underscores
function titleFromXnxxUrl(url) {
  try {
    const path = new URL(url).pathname
    const match = path.match(/\/video-[^/]+\/(.+)/)
    if (!match) return null
    return match[1]
      .replace(/_+/g, ' ')
      .replace(/-+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase())
  } catch { return null }
}

// Extract viewkey from PornHub URL
function phViewkey(url) {
  try {
    return new URL(url).searchParams.get('viewkey') || null
  } catch { return null }
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
let fetch
async function loadFetch() {
  if (!fetch) fetch = (await import('node-fetch')).default
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    clearTimeout(timer)
    return res
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

function parseOg(html) {
  const meta = {}

  function extract(prop) {
    // og: and twitter: meta tags, both property= and name=
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]+content=["']([^"']+)["']`,
      'i'
    )
    const m = html.match(re) ||
      html.match(new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["']`,
        'i'
      ))
    return m ? m[1].trim() : null
  }

  meta.title = extract('title')
  meta.image = extract('image') || extract('image:src')
  meta.description = extract('description')
  meta.url = extract('url')

  // Also try <title> tag as last fallback
  if (!meta.title) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (t) meta.title = t[1].trim()
  }

  return meta
}

async function fetchOgMeta(url) {
  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
    },
    redirect: 'follow',
  }, 12000)

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  return parseOg(html)
}

async function fetchPornhubApi(viewkey) {
  const apiUrl = `https://www.pornhub.com/webmasters/video_by_id?id=${viewkey}`
  const res = await fetchWithTimeout(apiUrl, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
    }
  }, 8000)
  if (!res.ok) throw new Error(`PH API ${res.status}`)
  const json = await res.json()
  const v = json?.video
  if (!v) throw new Error('no video in response')
  return {
    title: v.title || null,
    thumbnail: v.thumbs?.[0]?.src || null,
  }
}

// ─── Per-URL resolver ─────────────────────────────────────────────────────────
async function resolveMeta(url) {
  const domain = getDomain(url)
  let title = null, thumbnail = null

  // XNXX: try title from URL first (no request needed)
  if (domain.includes('xnxx')) {
    title = titleFromXnxxUrl(url)
    vlog(`XNXX URL title: ${title}`)
  }

  // PornHub: try webmasters API
  if (domain.includes('pornhub')) {
    const vk = phViewkey(url)
    if (vk) {
      try {
        const data = await fetchPornhubApi(vk)
        if (data.title) title = data.title
        if (data.thumbnail) thumbnail = data.thumbnail
        vlog(`PH API: ${title} | thumb: ${!!thumbnail}`)
      } catch (e) {
        vlog(`PH API failed: ${e.message}`)
      }
    }
  }

  // Try OG scrape if we're still missing title or thumbnail
  if (!title || !thumbnail) {
    try {
      const og = await fetchOgMeta(url)
      if (!title && og.title) title = og.title
      if (!thumbnail && og.image) thumbnail = og.image
      vlog(`OG: ${title} | thumb: ${!!thumbnail}`)
    } catch (e) {
      vlog(`OG failed: ${e.message}`)
    }
  }

  // Clean up title
  if (title) {
    // Remove common site suffixes
    title = title
      .replace(/\s*[-|–]\s*(Pornhub|xnxx|xHamster|XVideos|Tube8|Redtube|YouPorn)\s*(\.com)?$/i, '')
      .replace(/\s*\|\s*Pornhub$/i, '')
      .trim()
  }

  return { title, thumbnail }
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────
async function processPool(items, worker, concurrency) {
  const results = new Array(items.length)
  let i = 0

  async function run() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await worker(items[idx], idx)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, run))
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await loadFetch()

  log(`Reading: ${INPUT_FILE}`)
  if (!existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const raw = readFileSync(INPUT_FILE, 'utf-8')
  const allUrls = extractLinksFromText(raw)
  log(`Found ${allUrls.length} URLs (${new Set(allUrls).size} unique)`)
  const urls = [...new Set(allUrls)]

  // Load existing videos.json to avoid re-fetching
  let existing = []
  if (existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
      log(`Loaded ${existing.length} existing entries`)
    } catch { existing = [] }
  }

  const existingMap = new Map(existing.map(v => [v.url, v]))
  const today = new Date().toISOString().split('T')[0]

  let processed = 0
  let skipped = 0
  let failed = 0

  const results = await processPool(urls, async (url, idx) => {
    // Skip if already has metadata and not forced refresh
    const prev = existingMap.get(url)
    if (prev && (prev.title || prev.thumbnail) && !REFRESH_ALL) {
      skipped++
      vlog(`[${idx + 1}/${urls.length}] skip ${url}`)
      return prev
    }

    const domain = getDomain(url)
    const entry = {
      id: prev?.id || uid(url),
      url,
      title: prev?.title || null,
      thumbnail: prev?.thumbnail || null,
      domain,
      source: getSource(domain),
      addedAt: prev?.addedAt || today,
      status: prev?.status || 'unknown',
    }

    log(`[${idx + 1}/${urls.length}] ${url.slice(0, 70)}…`)

    try {
      const meta = await resolveMeta(url)
      if (meta.title) entry.title = meta.title
      if (meta.thumbnail) entry.thumbnail = meta.thumbnail
      processed++
    } catch (e) {
      vlog(`  error: ${e.message}`)
      failed++
    }

    await delay(DELAY_MS)
    return entry
  }, CONCURRENCY)

  // Ensure output directory exists
  const outDir = dirname(OUTPUT_FILE)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8')

  log(`\nDone!`)
  log(`  Total:     ${results.length}`)
  log(`  Fetched:   ${processed}`)
  log(`  Skipped:   ${skipped} (already had metadata)`)
  log(`  Failed:    ${failed}`)
  log(`  Output:    ${OUTPUT_FILE}`)

  if (failed > 0) {
    log(`\nNote: ${failed} URLs returned no metadata.`)
    log(`Adult sites often block scrapers. Consider --browser flag with Playwright.`)
  }
}

main().catch(e => {
  console.error('[build-videos] Fatal:', e)
  process.exit(1)
})
