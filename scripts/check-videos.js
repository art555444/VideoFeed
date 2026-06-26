#!/usr/bin/env node
/**
 * check-videos.js
 * Checks reachability of all videos in public/videos.json
 *
 * Usage:
 *   node scripts/check-videos.js [options]
 *
 * Options:
 *   --dry-run              Only report, don't modify anything
 *   --remove-unavailable   Remove confirmed dead videos from videos.json
 *   --limit <n>            Only check first n videos
 *   --concurrency <n>      Parallel checks (default: 5)
 *   --browser              Use Playwright for JS-rendered checks (requires: npx playwright install)
 *
 * Reports:
 *   reports/video-check-report.json    Full report
 *   reports/removed-videos.json        Only if --remove-unavailable
 *   reports/manual-review-videos.json  Ambiguous cases (403/405/timeout)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const arg  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }
const flag = f => args.includes(f)

const DRY_RUN     = flag('--dry-run')
const REMOVE_DEAD = flag('--remove-unavailable')
const CONCURRENCY = parseInt(arg('--concurrency', '5'), 10)
const LIMIT       = arg('--limit') ? parseInt(arg('--limit'), 10) : null
const USE_BROWSER = flag('--browser')
const VERBOSE     = flag('--verbose')

const VIDEOS_FILE  = join(ROOT, 'public', 'videos.json')
const REPORTS_DIR  = join(ROOT, 'reports')
const REPORT_FILE  = join(REPORTS_DIR, 'video-check-report.json')
const REMOVED_FILE = join(REPORTS_DIR, 'removed-videos.json')
const REVIEW_FILE  = join(REPORTS_DIR, 'manual-review-videos.json')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'

// Dead patterns (case-insensitive search in response body)
const DEAD_BODY_PATTERNS = [
  'video removed',
  'video unavailable',
  'video deleted',
  'video has been deleted',
  'this video is no longer available',
  'this video has been removed',
  'account has been terminated',
  'content unavailable',
  'private video',
  'video is private',
  'page not found',
  '404 not found',
  'video not found',
  'this video does not exist',
  'video was deleted',
  'has been taken down',
  'removed for violation',
  'content was removed',
  'video is currently unavailable',
]

// Dead HTTP codes (definitive)
const DEAD_CODES = new Set([404, 410])

// Ambiguous codes → manual review
const AMBIGUOUS_CODES = new Set([400, 401, 403, 405, 406, 429, 500, 502, 503, 504, 521, 522, 524])

function log(...a) { console.log('[check-videos]', ...a) }
function vlog(...a) { if (VERBOSE) log(...a) }

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

let fetchFn
async function loadFetch() {
  if (!fetchFn) fetchFn = (await import('node-fetch')).default
}

async function fetchWithTimeout(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetchFn(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

function bodyIsDead(text) {
  const lc = text.toLowerCase()
  return DEAD_BODY_PATTERNS.some(p => lc.includes(p))
}

// ─── Single URL check ─────────────────────────────────────────────────────────
async function checkUrl(url) {
  const result = { url, status: null, code: null, reason: null, bodySnippet: null }

  try {
    // Try HEAD first (fast, no body)
    let res = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
      redirect: 'follow',
    }, 10000)

    result.code = res.status

    if (DEAD_CODES.has(res.status)) {
      result.status = 'dead'
      result.reason = `HTTP ${res.status}`
      return result
    }

    // For ambiguous/success codes with content, do GET to check body
    if (res.ok || AMBIGUOUS_CODES.has(res.status)) {
      try {
        const getRes = await fetchWithTimeout(url, {
          method: 'GET',
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'de-DE,de;q=0.9',
          },
          redirect: 'follow',
        }, 15000)

        result.code = getRes.status

        if (DEAD_CODES.has(getRes.status)) {
          result.status = 'dead'
          result.reason = `HTTP ${getRes.status}`
          return result
        }

        if (getRes.ok) {
          const text = await getRes.text()
          result.bodySnippet = text.slice(0, 500)

          if (bodyIsDead(text)) {
            result.status = 'dead'
            result.reason = 'dead body pattern matched'
            const matched = DEAD_BODY_PATTERNS.find(p => text.toLowerCase().includes(p))
            result.matchedPattern = matched
            return result
          }

          result.status = 'alive'
          return result
        }

        if (AMBIGUOUS_CODES.has(getRes.status)) {
          result.status = 'review'
          result.reason = `HTTP ${getRes.status} (ambiguous)`
          return result
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          result.status = 'review'
          result.reason = 'GET timeout'
        } else {
          result.status = 'review'
          result.reason = `GET error: ${e.message}`
        }
        return result
      }
    }

    if (AMBIGUOUS_CODES.has(res.status)) {
      result.status = 'review'
      result.reason = `HTTP ${res.status} (ambiguous)`
      return result
    }

    result.status = 'alive'
    return result

  } catch (e) {
    if (e.name === 'AbortError') {
      result.status = 'review'
      result.reason = 'timeout'
    } else {
      result.status = 'review'
      result.reason = `network error: ${e.message}`
    }
    return result
  }
}

// ─── Browser-based check (Playwright) ────────────────────────────────────────
async function checkUrlBrowser(url) {
  let chromium, Browser
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    log('Playwright not installed. Run: npx playwright install chromium')
    return { url, status: 'review', code: null, reason: 'playwright not installed' }
  }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ userAgent: UA })
  const page = await ctx.newPage()
  const result = { url, status: null, code: null, reason: null }

  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    result.code = res?.status()

    if (DEAD_CODES.has(result.code)) {
      result.status = 'dead'
      result.reason = `HTTP ${result.code}`
    } else {
      const content = await page.content()
      if (bodyIsDead(content)) {
        result.status = 'dead'
        result.reason = 'dead body pattern (browser)'
      } else {
        result.status = 'alive'
      }
    }
  } catch (e) {
    result.status = 'review'
    result.reason = e.message
  } finally {
    await browser.close()
  }

  return result
}

// ─── Pool ─────────────────────────────────────────────────────────────────────
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

  if (!existsSync(VIDEOS_FILE)) {
    console.error(`videos.json not found: ${VIDEOS_FILE}`)
    process.exit(1)
  }

  const videos = JSON.parse(readFileSync(VIDEOS_FILE, 'utf-8'))
  const toCheck = LIMIT ? videos.slice(0, LIMIT) : videos

  log(`Checking ${toCheck.length} of ${videos.length} videos`)
  log(`Concurrency: ${CONCURRENCY} | Browser: ${USE_BROWSER} | Dry-run: ${DRY_RUN}`)
  if (REMOVE_DEAD) log(`--remove-unavailable: dead videos will be removed`)

  const checkFn = USE_BROWSER ? checkUrlBrowser : checkUrl

  const checkResults = await processPool(toCheck, async (video, idx) => {
    log(`[${idx + 1}/${toCheck.length}] ${video.url.slice(0, 70)}`)
    const r = await checkFn(video.url)
    log(`  → ${r.status.toUpperCase()}${r.reason ? ' (' + r.reason + ')' : ''}`)
    await delay(200)
    return { ...video, checkResult: r }
  }, CONCURRENCY)

  // Categorize
  const alive    = checkResults.filter(v => v.checkResult.status === 'alive')
  const dead     = checkResults.filter(v => v.checkResult.status === 'dead')
  const review   = checkResults.filter(v => v.checkResult.status === 'review')
  const unchecked = videos.slice(toCheck.length) // if --limit

  log(`\n── Results ──────────────────────────────`)
  log(`  Alive:          ${alive.length}`)
  log(`  Dead (removed): ${dead.length}`)
  log(`  Manual review:  ${review.length}`)
  if (unchecked.length) log(`  Unchecked:      ${unchecked.length}`)

  const now = new Date().toISOString()

  // Write reports
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true })

  const report = {
    checkedAt: now,
    total: toCheck.length,
    alive: alive.length,
    dead: dead.length,
    review: review.length,
    entries: checkResults.map(v => ({
      id: v.id,
      url: v.url,
      title: v.title,
      domain: v.domain,
      status: v.checkResult.status,
      httpCode: v.checkResult.code,
      reason: v.checkResult.reason,
    })),
  }

  if (!DRY_RUN) {
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
    log(`  Report: ${REPORT_FILE}`)

    writeFileSync(REVIEW_FILE, JSON.stringify({
      generatedAt: now,
      count: review.length,
      videos: review.map(v => ({
        id: v.id, url: v.url, title: v.title,
        httpCode: v.checkResult.code, reason: v.checkResult.reason,
      })),
    }, null, 2))
    log(`  Manual review: ${REVIEW_FILE}`)

    if (REMOVE_DEAD) {
      writeFileSync(REMOVED_FILE, JSON.stringify({
        removedAt: now,
        count: dead.length,
        videos: dead.map(v => ({
          id: v.id, url: v.url, title: v.title,
          httpCode: v.checkResult.code, reason: v.checkResult.reason,
        })),
      }, null, 2))
      log(`  Removed list: ${REMOVED_FILE}`)

      const deadIds = new Set(dead.map(v => v.id))
      const kept = videos.filter(v => !deadIds.has(v.id))
      writeFileSync(VIDEOS_FILE, JSON.stringify(kept, null, 2))
      log(`  Updated videos.json: ${kept.length} remaining (${dead.length} removed)`)
    }
  } else {
    log(`\n[DRY-RUN] No files modified.`)
    if (dead.length) {
      log(`Would remove:`)
      dead.forEach(v => log(`  ${v.url.slice(0, 80)} (${v.checkResult.reason})`))
    }
    if (review.length) {
      log(`Would flag for review:`)
      review.forEach(v => log(`  ${v.url.slice(0, 80)} (${v.checkResult.reason})`))
    }
  }

  log('\nDone!')
}

main().catch(e => {
  console.error('[check-videos] Fatal:', e)
  process.exit(1)
})
