import { useColors }       from '../../hooks/useTheme.jsx'
import { useState, useMemo } from 'react'
import PatientCard           from './PatientCard.jsx'

export default function PatientGrid({
  patients    = [],
  counts      = {},
  alerts      = [],
  loading     = false,
  connected   = true,
  onAcknowledge,
  onEscalate
}) {
  console.log('PatientGrid render:', { patients, counts, alerts, loading, connected })
  const C = useColors()
  const [search,       setSearch]       = useState('')
  const [activeFilter, setActiveFilter] = useState(null)

  // Build a map: patient_id → most severe open alert
  const alertByPatient = useMemo(() => {
    const map = {}
    alerts.forEach(a => {
      if (a.status !== 'unacknowledged') return
      const existing = map[a.patient_id]
      // Keep the more severe one if multiple exist
      if (!existing || (a.severity === 'critical' && existing.severity !== 'critical')) {
        map[a.patient_id] = a
      }
    })
    return map
  }, [alerts])

  const filtered = useMemo(() => {
    let list = patients
    if (activeFilter) {
      list = list.filter(p =>
        (p.assessment?.risk_level || 'stable') === activeFilter
      )
    }
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

      {/* ── HEADER ─────────────────────────────── */}
      <div className="pg-header">
        <div className="pg-title-row">
          <h2 className="pg-title">Ward Overview</h2>
          <span className="pg-refresh">
            {connected ? '● Live' : '○ Reconnecting…'}
          </span>
        </div>

        <div className="pg-counters">
          {[
            { label:'Critical', key:'critical', color:'critical' },
            { label:'Warning',  key:'warning',  color:'warning'  },
            { label:'Stable',   key:'stable',   color:'stable'   }
          ].map(({ label, key, color }) => (
            <CounterBtn key={key} C={C}
              label={label} count={counts[key] || 0} color={color}
              active={activeFilter === key}
              onClick={() => toggleFilter(key)}
            />
          ))}
          {activeFilter && (
            <button className="pg-clear-filter" onClick={() => setActiveFilter(null)}>
              Clear ×
            </button>
          )}
        </div>

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

        <p className="pg-sublabel">
          {activeFilter || search
            ? `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} shown`
            : `${patients.length} patient${patients.length !== 1 ? 's' : ''} monitored · sorted by severity`
          }
        </p>
      </div>

      {/* ── PATIENT LIST ───────────────────────── */}
      <div className="pg-list">
        {loading && patients.length === 0 ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} filter={activeFilter} total={patients.length} C={C} />
        ) : (
          filtered.map(p => {
            const pid   = p.patient?.patient_id || p.patient?.id
            const alert = alertByPatient[pid] || null
            return (
              <PatientCard
                key={pid}
                patient={p}
                alert={alert}
                onAcknowledge={onAcknowledge}
                onEscalate={onEscalate}
              />
            )
          })
        )}
      </div>

      <style>{`
        .pg-wrap {
          display: flex; flex-direction: column;
          height: 100%; width: 100%; overflow: hidden;
          font-family: 'Inter', sans-serif;
        }
        .pg-header {
          padding: 16px 20px 12px;
          background: #FFFFFF;
          border-bottom: 1px solid #EBEBEB;
          flex-shrink: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .pg-title-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .pg-title {
          font-family: 'Manrope', sans-serif;
          font-size: 15px; font-weight: 700; color: #111111; letter-spacing: -0.2px;
        }
        .pg-refresh {
          font-size: 11px; color: #AAAAAA; font-family: 'IBM Plex Sans', sans-serif;
        }
        .pg-counters {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .pg-clear-filter {
          font-size: 12px; color: #888888; background: transparent;
          border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px;
          transition: background 0.12s; font-family: 'Inter', sans-serif;
        }
        .pg-clear-filter:hover { background: #F4F4F4; color: #333333; }
        .pg-search-wrap {
          position: relative; display: flex; align-items: center;
        }
        .pg-search-wrap svg {
          position: absolute; left: 10px; color: #AAAAAA; pointer-events: none;
        }
        .pg-search {
          width: 100%; padding: 8px 32px;
          border: 1px solid #EBEBEB; border-radius: 8px;
          font-size: 13px; background: #F8F8F8; color: #111111;
          transition: border-color 0.15s, background 0.15s;
          outline: none; font-family: 'Inter', sans-serif;
        }
        .pg-search:focus { border-color: #16A34A; background: #FFFFFF; }
        .pg-search-clear {
          position: absolute; right: 10px; background: transparent;
          border: none; color: #AAAAAA; cursor: pointer;
          font-size: 16px; line-height: 1; padding: 2px;
        }
        .pg-search-clear:hover { color: #555555; }
        .pg-sublabel {
          font-size: 11.5px; color: #AAAAAA;
          margin: -4px 0 0; font-family: 'IBM Plex Sans', sans-serif;
        }
        .pg-list {
          flex: 1; overflow-y: auto;
          padding: 14px 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 12px;
          align-content: start;
        }
        .pg-list::-webkit-scrollbar       { width: 4px; }
        .pg-list::-webkit-scrollbar-track { background: transparent; }
        .pg-list::-webkit-scrollbar-thumb { background: #DDDDDD; border-radius: 2px; }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes pulseRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(198,40,40,0); }
          50%     { box-shadow: 0 0 0 5px rgba(198,40,40,0.08); }
        }

        /* Dark mode overrides */
        [data-theme="dark"] .pg-header { background: #161B22; border-color: #21262D; }
        [data-theme="dark"] .pg-title  { color: #E6EDF3; }
        [data-theme="dark"] .pg-search { background: #1C2128; border-color: #21262D; color: #E6EDF3; }
        [data-theme="dark"] .pg-search:focus { border-color: #2EA043; background: #1C2128; }
        [data-theme="dark"] .pg-list   { background: #0D1117; }
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
    warning:  { dot: C.warningPure,  activeBg: C.warningBg,  activeBorder: C.warningBorder,  activeText: C.warningText  },
    stable:   { dot: C.stablePure,   activeBg: C.stableBg,   activeBorder: C.stableBorder,   activeText: C.stableText   }
  }
  const c = colors[color]
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:'6px',
      padding:'5px 12px', borderRadius:'6px', cursor:'pointer',
      fontSize:'12.5px', fontWeight: active ? 600 : 500,
      fontFamily:"'Inter', sans-serif",
      border:`1px solid ${active ? c.activeBorder : C.borderSubtle}`,
      background: active ? c.activeBg : C.bgPrimary,
      color: active ? c.activeText : C.textSecondary,
      transition:'all 0.15s'
    }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
      {label}
      <span style={{
        background: active ? c.activeBorder : C.borderSubtle,
        color: active ? c.activeText : C.textMuted,
        padding:'0 5px', borderRadius:'4px',
        fontSize:'11px', fontWeight:700, minWidth:'18px',
        textAlign:'center', fontFamily:"'IBM Plex Sans', sans-serif"
      }}>{count}</span>
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
  return Array.from({ length: 6 }).map((_, i) => (
    <div key={i} style={{
      height:'140px', borderRadius:'10px',
      background:'linear-gradient(90deg,#F4F4F4 25%,#EBEBEB 50%,#F4F4F4 75%)',
      backgroundSize:'200% 100%',
      animation:`shimmer 1.4s ease-in-out ${i * 0.1}s infinite`
    }} />
  ))
}

function EmptyState({ search, filter, total, C }) {
  if (total === 0) return (
    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 24px', fontFamily:"'Inter', sans-serif" }}>
      <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.4 }}>🏥</div>
      <p style={{ fontSize:'14px', fontWeight:500, color:C.textSecondary, marginBottom:'6px' }}>No patients registered</p>
      <p style={{ fontSize:'13px', color:C.textFaint }}>Register patients via the Admin Panel before monitoring begins.</p>
    </div>
  )
  return (
    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 24px', fontFamily:"'Inter', sans-serif" }}>
      <p style={{ fontSize:'14px', fontWeight:500, color:C.textSecondary, marginBottom:'6px' }}>No patients match</p>
      <p style={{ fontSize:'13px', color:C.textFaint }}>
        {search ? `No results for "${search}"` : `No ${filter} patients right now`}
      </p>
    </div>
  )
}
