# VideoFeed

TikTok-style video bookmark feed — Apple-inspired, statisch deploybar auf GitHub Pages.

## Technologie

- **Vite + React 18** — kein Backend in Produktion
- **CSS Scroll Snap** — vollbild-vertikaler Feed
- **localStorage** — Favoriten, Theme
- **GitHub Pages** — statisches Deployment via GitHub Actions

---

## Installation

```bash
cd VideoFeed
npm install
```

---

## Lokal starten

```bash
npm run dev
```

Öffne `http://localhost:5173/VideoFeed/`

---

## Videos aus Links bauen

Die `video_links_only.txt` muss im **Projektroot** liegen (oder mit `--input` angegeben werden):

```bash
# Metadaten fetchen (OG/Twitter Tags, PH Webmasters API)
npm run build:videos

# Mit Optionen
node scripts/build-videos.js \
  --input ./video_links_only.txt \
  --output ./public/videos.json \
  --concurrency 3 \
  --delay 1000 \
  --verbose

# Alle bestehenden Metadaten neu laden
node scripts/build-videos.js --refresh-all
```

**Hinweis:** Viele Video-Plattformen blockieren Scraper (Login, CORS, Bot-Detection).  
Bei PornHub wird die Webmasters-API versucht. XNXX-Titel werden aus der URL extrahiert.  
Bei 403/429-Fehlern hilft `--browser` (erfordert Playwright).

Das Skript erzeugt `public/videos.json`.

---

## Neue Links hinzufügen

### Option A: Im Browser (empfohlen für kleine Mengen)

1. App öffnen → `+`-Button oben rechts
2. Links einfügen → Analysieren
3. `videos.json` herunterladen oder kopieren
4. Datei in `public/videos.json` ersetzen
5. Deployen

### Option B: Textdatei erweitern

```bash
# Links an video_links_only.txt anhängen
echo "https://example.com/neues-video" >> video_links_only.txt

# videos.json neu bauen
npm run build:videos
```

---

## Videos prüfen

```bash
# Alle prüfen, Bericht erstellen (kein Löschen)
npm run check:videos

# Nur Bericht, keine Dateien schreiben
npm run check:videos:dry

# Prüfen UND tote Videos löschen
npm run check:videos:clean

# Mit Optionen
node scripts/check-videos.js \
  --concurrency 5 \
  --limit 50 \
  --verbose

# Mit Playwright (JS-gerenderte Seiten)
node scripts/check-videos.js --browser
```

### Reports

| Datei | Inhalt |
|-------|--------|
| `reports/video-check-report.json` | Vollständiger Bericht |
| `reports/removed-videos.json` | Gelöschte Videos (nur mit `--remove-unavailable`) |
| `reports/manual-review-videos.json` | Unsichere Fälle (403, Timeout, …) |

---

## Tote Videos sicher entfernen

```bash
# Erst Dry-Run, um zu sehen was gelöscht würde
npm run check:videos:dry

# Dann wirklich entfernen
npm run check:videos:clean
```

**Sicherheitslogik:**
- `404 / 410` + klare Fehlertexte im Body → **automatisch gelöscht**
- `403 / 429 / 5xx / Timeout` → **manueller Review** (`reports/manual-review-videos.json`)
- Alles andere → bleibt erhalten

---

## GitHub Pages Deployment

### Erstmalig einrichten

1. Repository auf GitHub erstellen (Name: `VideoFeed`)
2. GitHub Actions aktivieren: Settings → Pages → Source: GitHub Actions
3. Pushen → Automatisches Deployment

```bash
git init
git add .
git commit -m "init: VideoFeed"
git remote add origin https://github.com/DEIN-USERNAME/VideoFeed.git
git push -u origin main
```

Die App ist dann unter `https://DEIN-USERNAME.github.io/VideoFeed/` erreichbar.

### Repo-Name anpassen

Falls das Repository anders heißt, `vite.config.js` anpassen:

```js
base: '/DEIN-REPO-NAME/',
```

---

## App-Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| **Scroll-Feed** | Vollbild, CSS Scroll Snap, Tastatur ↑↓ / Enter |
| **Suche** | Titel, Domain, URL — Taste `/` öffnet Suchfeld |
| **Domain-Filter** | Chips nach Plattform filtern |
| **Favoriten** | ♥-Button oder Taste `F` — localStorage |
| **Shuffle** | Zufällige Reihenfolge |
| **Link kopieren** | Clipboard |
| **Links hinzufügen** | `+`-Button, JSON export |
| **Dark / Light Mode** | Toggle, folgt System-Präferenz |

---

## CORS / Bot-Blocking / Login-Probleme

| Problem | Ursache | Lösung |
|---------|---------|--------|
| `build:videos` findet keine Titel | Seite blockiert Scraper | `--browser` mit Playwright, oder manuell editieren |
| 403 beim Fetchen | IP-Blocking / Login erforderlich | Proxy, VPN, Browser-Mode |
| Thumbnails fehlen | CDN-CORS-Restriction | Thumbnails manuell in `videos.json` eintragen |
| Alles leer | `videos.json` nicht gefunden | `npm run build:videos` ausführen |

---

## Projektstruktur

```
VideoFeed/
├── public/
│   ├── videos.json          ← Haupt-Datendatei
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── VideoCard.jsx    ← Einzelne Karte
│   │   ├── VideoFeed.jsx    ← Scroll-Feed
│   │   ├── Navbar.jsx       ← Top-Navigation
│   │   ├── DomainFilter.jsx ← Filter-Chips
│   │   ├── AddLinks.jsx     ← Links hinzufügen
│   │   ├── Toast.jsx        ← Benachrichtigungen
│   │   └── Icons.jsx        ← SVG Icons
│   ├── hooks/
│   │   ├── useFavorites.js
│   │   └── useToast.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── scripts/
│   ├── build-videos.js
│   └── check-videos.js
├── reports/                 ← git-ignoriert
├── .github/workflows/
│   └── deploy.yml
├── package.json
├── vite.config.js
└── README.md
```
