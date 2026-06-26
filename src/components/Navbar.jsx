import { useRef } from 'react'
import {
  IconSearch, IconSun, IconMoon, IconShuffle,
  IconPlus, IconFilter, IconVideo
} from './Icons.jsx'

export function Navbar({
  search, onSearch,
  theme, onThemeToggle,
  onShuffle,
  onAddLinks,
  showFavsOnly, onFavsToggle,
  showFilters, onFiltersToggle,
  hidden,
}) {
  const inputRef = useRef(null)

  return (
    <nav className={`navbar${hidden ? ' hidden' : ''}`} role="navigation" aria-label="Hauptnavigation">
      <div className="navbar-inner">
        <div className="navbar-logo" aria-label="VideoFeed">
          <IconVideo />
          <span>Feed</span>
        </div>

        <div className="navbar-search" role="search">
          <span className="navbar-search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            ref={inputRef}
            className="navbar-search-input"
            type="search"
            placeholder="Suchen…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            aria-label="Videos suchen"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {search && (
            <button
              className="navbar-search-clear"
              onClick={() => { onSearch(''); inputRef.current?.focus() }}
              aria-label="Suche löschen"
            >
              ×
            </button>
          )}
        </div>

        <button
          className={`navbar-icon-btn${showFilters ? ' active' : ''}`}
          onClick={onFiltersToggle}
          title="Domain-Filter"
          aria-label="Domain-Filter"
          aria-pressed={showFilters}
        >
          <IconFilter />
        </button>

        <button
          className={`navbar-icon-btn${showFavsOnly ? ' active' : ''}`}
          onClick={onFavsToggle}
          title={showFavsOnly ? 'Alle anzeigen' : 'Nur Favoriten'}
          aria-label={showFavsOnly ? 'Alle anzeigen' : 'Nur Favoriten'}
          aria-pressed={showFavsOnly}
        >
          <HeartIcon filled={showFavsOnly} />
        </button>

        <button
          className="navbar-icon-btn"
          onClick={onShuffle}
          title="Zufällige Reihenfolge"
          aria-label="Zufällige Reihenfolge"
        >
          <IconShuffle />
        </button>

        <button
          className="navbar-icon-btn"
          onClick={onAddLinks}
          title="Links hinzufügen"
          aria-label="Links hinzufügen"
        >
          <IconPlus />
        </button>

        <button
          className="navbar-icon-btn"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          aria-label={theme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </nav>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
