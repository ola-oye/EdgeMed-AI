/**
 * components/ward/PatientGrid.jsx
 * ────────────────────────────────
 * Left column of the ward overview.
 * Shows summary counters, search bar, and sorted patient list.
 *
 * Props:
 *  patients    — sorted array from usePatients
 *  counts      — { critical, warning, stable }
 *  loading     — bool
 *  countdown   — seconds until next refresh
 *  lastUpdated — Date object of last successful fetch
 */

import { useColors } from '../../hooks/useTheme.jsx'
import { useState, useMemo } from 'react'
import PatientCard from './PatientCard.jsx'

export default function PatientGrid({
  patients = [],
  counts = {},
  loading = false,
  connected = true
}) {
  const C = useColors()
  const [search,      setSearch]      = useState('')
  const [activeFilter, setActiveFilter] = useState(null)  // null | 'critical' | 'warning' | 'stable'

  const filtered = useMemo(() => {
    let list = patients

    // Filter by severity button
    if (activeFilter) {
      list = list.filter(p =>
        (p.assessment?.risk_level || 'stable') === activeFilter
      )
    }

    // Filter by search
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(p => {
        const name = (p.patient?.full_name || '').toLowerCase()
        const bed  = (p.patient?.bed_number || '').toLowerCase()
        return name.includes(q) || bed.includes(q)
      })
    }

    return list
  }, [patients, search, activeFilter])

  function toggleFilter(level) {
    setActiveFilter(prev => prev === level ? null : level)
  }

  return (
    <div className="pg-wrap">

      {/* ── HEADER ───────────────────────────── */}
      <div className="pg-header">

        {/* Title row */}
        <div className="pg-title-row">
          <h2 className="pg-title">Ward Overview</h2>
          <span className="pg-refresh">
            {connected ? '● Live' : '○ Reconnecting…'
            }
          </span>
        </div>

        {/* Summary counters */}
        <div className="pg-counters">
          <CounterBtn
            C={C}
            label="Critical"
            count={counts.critical || 0}
            color="critical"
            active={activeFilter === 'critical'}
            onClick={() => toggleFilter('critical')}
          />
          <CounterBtn
            C={C}
            label="Warning"
            count={counts.warning || 0}
            color="warning"
            active={activeFilter === 'warning'}
            onClick={() => toggleFilter('warning')}
          />
          <CounterBtn
            C={C}
            label="Stable"
            count={counts.stable || 0}
            color="stable"
            active={activeFilter === 'stable'}
            onClick={() => toggleFilter('stable')}
          />
          {activeFilter && (
            <button className="pg-clear-filter" onClick={() => setActiveFilter(null)}>
              Clear filter ×
            </button>
          )}
        </div>

        {/* Search */}
        <div className="pg-search-wrap">
          <SearchIcon />
          <input
            className="pg-search"
            type="text"
            placeholder="Search by name or bed…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pg-search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>

        {/* Sub-label */}
        <p className="pg-sublabel">
          {activeFilter || search
            ? `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} shown`
            : `${patients.length} patient${patients.length !== 1 ? 's' : ''} monitored · sorted by severity`
          }
        </p>
      </div>

      {/* ── PATIENT LIST ─────────────────────── */}
      <div className="pg-list">
        {loading && patients.length === 0 ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} filter={activeFilter} total={patients.length} C={C} />
        ) : (
          filtered.map(p => (
            <PatientCard key={p.patient?.id} patient={p} />
          ))
        )}
      </div>

      <style>{`
        .pg-wrap {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* Header */
        .pg-header {
          padding: 16px 20px 12px;
          background: #FFFFFF;
          border-bottom: 1px solid #EBEBEB;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pg-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pg-title {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          letter-spacing: -0.2px;
        }
        .pg-refresh {
          font-size: 11px;
          color: #AAAAAA;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        /* Counters */
        .pg-counters {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .pg-clear-filter {
          margin-left: 4px;
          font-size: 12px;
          color: #888888;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .pg-clear-filter:hover { background: #F4F4F4; color: #333333; }

        /* Search */
        .pg-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .pg-search-wrap svg {
          position: absolute;
          left: 10px;
          color: #AAAAAA;
          pointer-events: none;
          flex-shrink: 0;
        }
        .pg-search {
          width: 100%;
          padding: 8px 32px 8px 32px;
          border: 1px solid #EBEBEB;
          border-radius: 8px;
          font-size: 13px;
          background: #F8F8F8;
          color: #111111;
          transition: border-color 0.15s, background 0.15s;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .pg-search:focus {
          border-color: #16A34A;
          background: #FFFFFF;
        }
        .pg-search-clear {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: #AAAAAA;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 2px;
        }
        .pg-search-clear:hover { color: #555555; }

        .pg-sublabel {
          font-size: 11.5px;
          color: #AAAAAA;
          margin: -4px 0 0;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        /* List */
        .pg-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pg-list::-webkit-scrollbar       { width: 4px; }
        .pg-list::-webkit-scrollbar-track { background: transparent; }
        .pg-list::-webkit-scrollbar-thumb { background: #DDDDDD; border-radius: 2px; }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function CounterBtn({ label, count, color, active, onClick, C }) {
  const colors = {
    critical: { dot: C.criticalPure, activeBg: C.criticalBg, activeBorder: C.criticalBorder, activeText: C.criticalText },
    warning:  { dot: C.warningPure, activeBg: C.warningBg, activeBorder: C.warningBorder, activeText: C.warningText },
    stable:   { dot: C.stablePure, activeBg: C.stableBg, activeBorder: C.stableBorder, activeText: C.stableText }
  }
  const c = colors[color]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '12.5px', fontWeight: active ? 600 : 500,
        fontFamily: "'Inter', sans-serif",
        border: `1px solid ${active ? c.activeBorder : C.borderSubtle}`,
        background: active ? c.activeBg : C.textInverse,
        color: active ? c.activeText : C.textSecondary,
        transition: 'all 0.15s'
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label}
      <span style={{
        background: active ? c.activeBorder : C.borderSubtle,
        color: active ? c.activeText : '#777777',
        padding: '0 5px', borderRadius: '4px',
        fontSize: '11px', fontWeight: 700, minWidth: '18px',
        textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif"
      }}>
        {count}
      </span>
    </button>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function LoadingSkeleton() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div key={i} style={{
      height: '96px', borderRadius: '10px',
      background: 'linear-gradient(90deg, var(--skeleton-from,#F4F4F4) 25%, var(--skeleton-mid,#EBEBEB) 50%, var(--skeleton-from,#F4F4F4) 75%)',
      backgroundSize: '200% 100%',
      animation: `shimmer 1.4s ease-in-out ${i * 0.1}s infinite`
    }} />
  ))
}

function EmptyState({ search, filter, total, C }) {
  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: C.textFaint, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>🏥</div>
        <p style={{ fontSize: '14px', fontWeight: 500, color: C.textSecondary, marginBottom: '6px' }}>No patients registered</p>
        <p style={{ fontSize: '13px', color: C.textFaint }}>Register patients via the API before the device starts sending readings.</p>
      </div>
    )
  }
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: C.textFaint, fontFamily: "'Inter', sans-serif" }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: C.textSecondary, marginBottom: '6px' }}>No patients match</p>
      <p style={{ fontSize: '13px' }}>
        {search ? `No results for "${search}"` : `No ${filter} patients right now`}
      </p>
    </div>
  )
}
