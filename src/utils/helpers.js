export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function getSourceName(domain) {
  const map = {
    'pornhub.com': 'Pornhub',
    'de.pornhub.com': 'Pornhub',
    'it.pornhub.com': 'Pornhub',
    'xnxx.com': 'XNXX',
    'www.xnxx.com': 'XNXX',
    'xhamster.com': 'xHamster',
    'ge.xhamster.com': 'xHamster',
    'xvideos.com': 'XVideos',
    'redtube.com': 'Redtube',
    'youporn.com': 'YouPorn',
    'tube8.com': 'Tube8',
    'spankbang.com': 'SpankBang',
    'eporner.com': 'Eporner',
  }
  for (const key of Object.keys(map)) {
    if (domain.includes(key)) return map[key]
  }
  return domain
}

export function getDomainColor(domain) {
  const colors = {
    'pornhub': { from: '#ff9000', to: '#ff5c00', text: '#000' },
    'xnxx': { from: '#d4a017', to: '#8b6914', text: '#fff' },
    'xhamster': { from: '#e84c2b', to: '#b03020', text: '#fff' },
    'xvideos': { from: '#1a1a1a', to: '#333', text: '#ff0000' },
    'redtube': { from: '#d81920', to: '#8b0000', text: '#fff' },
    'youporn': { from: '#000', to: '#222', text: '#fff' },
    'spankbang': { from: '#ff4500', to: '#cc2200', text: '#fff' },
  }
  const lc = domain.toLowerCase()
  for (const [key, val] of Object.entries(colors)) {
    if (lc.includes(key)) return val
  }
  return { from: '#2c2c2e', to: '#1c1c1e', text: '#fff' }
}

export function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function extractLinks(text) {
  const re = /https?:\/\/[^\s\n"'<>]+/g
  return [...new Set(text.match(re) || [])]
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
