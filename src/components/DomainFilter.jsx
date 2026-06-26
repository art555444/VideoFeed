import { getSourceName } from '../utils/helpers.js'

export function DomainFilter({ domains, selected, onSelect, hidden }) {
  return (
    <div className={`filter-bar${hidden ? ' hidden' : ''}`} role="toolbar" aria-label="Domain-Filter">
      <button
        className={`filter-chip${!selected ? ' active' : ''}`}
        onClick={() => onSelect(null)}
        aria-pressed={!selected}
      >
        Alle
        <span className="count">({domains.reduce((s, d) => s + d.count, 0)})</span>
      </button>

      {domains.map(({ domain, count }) => (
        <button
          key={domain}
          className={`filter-chip${selected === domain ? ' active' : ''}`}
          onClick={() => onSelect(selected === domain ? null : domain)}
          aria-pressed={selected === domain}
        >
          {getSourceName(domain)}
          <span className="count">({count})</span>
        </button>
      ))}
    </div>
  )
}
