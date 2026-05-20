import { useNavigate } from 'react-router-dom'
import { useColors }  from '../../hooks/useTheme.jsx'

const RANGES = {
  heart_rate:       [60, 100],
  spo2:             [95, 100],
  respiration_rate: [12, 20],
  body_temperature: [97.5, 100.4]
}

function vitalColor(key, val, C) {
  if (val == null) return C.textFaint
  const [lo, hi] = RANGES[key] || [0, 999]
  if (val < lo || val > hi) {
    const pct = val < lo ? (lo - val) / lo : (val - hi) / hi
    return pct > 0.06 ? C.criticalText : C.warningText
  }
  return C.textPrimary
}

function fmt(v) {
  if (v == null) return '—'
  return Number.isInteger(v) ? v : parseFloat(Number(v).toFixed(1))
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function PatientCard({
  patient }) {
  const C = useColors()
  const navigate   = useNavigate()
  const info       = patient.patient    || {}
  const reading    = patient.reading    || {}
  const assessment = patient.assessment || {}
  const risk       = assessment.risk_level || 'stable'
  const bullets    = assessment.explanation_bullets || []

  const leftBorderColor = { critical: C.criticalPure, warning: C.warningPure, stable: C.stablePure }[risk]
  const cardBg          = { critical: C.criticalBg, warning: C.warningBg, stable: C.textInverse  }[risk]

  return (
    <div
      onClick={() => navigate(`/patient/${info.id}`, { state: { from: '/ward' } })}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/patient/${info.id}`, { state: { from: '/ward' } })}
      style={{
        background:   cardBg,
        border:       '1px solid #EBEBEB',
        borderLeft:   `4px solid ${leftBorderColor}`,
        borderRadius: '10px',
        padding:      '13px 15px',
        cursor:       'pointer',
        display:      'flex',
        flexDirection:'column',
        gap:          '10px',
        animation:    risk === 'critical' ? 'pulseRing 2.5s ease-in-out infinite' : 'none',
        transition:   'box-shadow 0.14s, transform 0.1s'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Row 1 — name (Manrope) + bed + risk badge */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
        <span style={{ fontFamily:"'Manrope', sans-serif", fontSize:'14.5px', fontWeight:'700', color:C.textPrimary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>
          {info.full_name || `Patient ${(info.id || '').slice(0, 8)}`}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'7px', flexShrink:0 }}>
          <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', fontWeight:'500', color:C.textMuted, background:C.bgTertiary, border:'1px solid #EBEBEB', padding:'1px 7px', borderRadius:'4px' }}>
            {info.bed_number || '—'}
          </span>
          <RiskBadge level={risk} C={C} />
        </div>
      </div>

      {/* Row 2 — vitals grid */}
      <div style={{ display:'flex', background:C.bgSecondary, border:'1px solid #EBEBEB', borderRadius:'8px', overflow:'hidden' }}>
        {[
          { key:'heart_rate',       label:'HR',   unit:'bpm'  },
          { key:'spo2',             label:'SpO₂', unit:'%'    },
          { key:'respiration_rate', label:'RR',   unit:'brpm' },
          { key:'body_temperature', label:'Temp', unit:'°F'   }
        ].map(({ key, label, unit }, i) => (
          <div key={key} style={{ flex:1, padding:'8px 10px', borderRight: i < 3 ? '1px solid #EBEBEB' : 'none' }}>
            {/* Label — IBM Plex Sans */}
            <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'9.5px', fontWeight:'600', color:C.textFaint, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'3px' }}>
              {label}
            </div>
            {/* Value — Manrope */}
            <div style={{ fontFamily:"'Manrope', sans-serif", fontSize:'18px', fontWeight:'800', color: vitalColor(key, reading[key], C), lineHeight:1, letterSpacing:'-0.5px' }}>
              {fmt(reading[key])}
              <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'9.5px', fontWeight:'500', color:C.textFaint, marginLeft:'1px' }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 3 — AI insight + timestamp */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px' }}>
        {bullets[0] ? (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'5px', flex:1, minWidth:0 }}>
            {/* AI tag — IBM Plex Sans */}
            <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'9px', fontWeight:'600', color:C.aiText, background:C.aiBg, border:'1px solid #BFDBFE', padding:'1px 5px', borderRadius:'3px', flexShrink:0, letterSpacing:'0.4px', marginTop:'1px' }}>
              AI
            </span>
            {/* Bullet text — Inter */}
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize:'12px', color:C.textSecondary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
              {bullets[0].text}
            </span>
          </div>
        ) : <div />}
        {/* Timestamp — IBM Plex Sans */}
        <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', color:C.textFaint, whiteSpace:'nowrap', flexShrink:0, display:'flex', alignItems:'center', gap:'4px' }}>
          {timeAgo(reading.read_at)}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </div>
    </div>
  )
}

function RiskBadge({ level, C }) {
  const s = {
    stable:   { bg:C.stableBg, color:C.stableText, border:C.stableBorder },
    warning:  { bg:C.warningBg, color:C.warningText, border:C.warningBorder },
    critical: { bg:C.criticalBg, color:C.criticalText, border:C.criticalBorder }
  }[level] || { bg:C.stableBg, color:C.stableText, border:C.stableBorder }

  return (
    <span style={{
      fontFamily:"'IBM Plex Sans', sans-serif",
      fontSize:'10px', fontWeight:'700', letterSpacing:'0.5px',
      textTransform:'uppercase', padding:'2px 7px', borderRadius:'4px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace:'nowrap'
    }}>
      {level}
    </span>
  )
}
