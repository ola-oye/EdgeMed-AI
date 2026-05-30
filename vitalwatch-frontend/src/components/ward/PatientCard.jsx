import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../hooks/useAuth.jsx'
import { useColors }   from '../../hooks/useTheme.jsx'

const RANGES = {
  heart_rate:       [60,   100],
  spo2:             [95,   100],
  respiration_rate: [12,    20],
  body_temperature: [97.5, 100.4]
}

const VITALS = [
  { key:'heart_rate',       label:'HR',   unit:'bpm'  },
  { key:'spo2',             label:'SpO₂', unit:'%'    },
  { key:'respiration_rate', label:'RR',   unit:'brpm' },
  { key:'body_temperature', label:'Temp', unit:'°F'   }
]

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

export default function PatientCard({ patient, alert, onAcknowledge, onEscalate }) {
  const C          = useColors()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  console.log('PatientCard render:', { patient, alert })
  
  const enrollment = patient.patient    || {}
  const reading    = patient.reading    || {}
  const assessment = patient.assessment || {}
  // enrollment uses 'patient_id' from monitoring_enrollments table
  const info       = { ...enrollment, id: enrollment.patient_id || enrollment.id }
  const risk       = assessment.risk_level || 'stable'
  const bullets    = assessment.explanation_bullets || []
  const hasAlert   = !!alert   // unacknowledged alert exists

  // Card accent driven by active alert severity, then assessment risk
  const accentLevel = hasAlert ? alert.severity : risk
  const leftBorderColor = {
    critical: C.criticalPure,
    warning:  C.warningPure,
    stable:   C.stablePure
  }[accentLevel] || C.stablePure

  const cardBg = {
    critical: C.criticalBg,
    warning:  C.warningBg,
    stable:   C.bgPrimary
  }[accentLevel] || C.bgPrimary

  function goToDetail(e) {
    // Don't navigate if the user clicked an action button
    if (e.target.closest('button')) return
    navigate(`/patient/${info.id}`, { state: { from: '/ward' } })
  }

  function handleAcknowledge(e) {
    e.stopPropagation()
    onAcknowledge?.(alert.id, user?.id || 'unknown')
  }

  function handleEscalate(e) {
    e.stopPropagation()
    onEscalate?.(alert.id, user?.id || 'unknown')
  }

  return (
    <div
      onClick={goToDetail}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && goToDetail(e)}
      style={{
        background:    cardBg,
        border:        `1px solid ${C.borderSubtle}`,
        borderLeft:    `4px solid ${leftBorderColor}`,
        borderRadius:  '10px',
        padding:       '14px 15px',
        cursor:        'pointer',
        display:       'flex',
        flexDirection: 'column',
        gap:           '11px',
        animation:     accentLevel === 'critical' ? 'pulseRing 2.5s ease-in-out infinite' : 'none',
        transition:    'box-shadow 0.14s, transform 0.1s'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.08)'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none';                         e.currentTarget.style.transform='translateY(0)' }}
    >

      {/* ── ROW 1: name · bed · risk badge ─────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
        <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:'15px', fontWeight:'700', color:C.textPrimary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'58%' }}>
          {info.full_name || `Patient ${(info.id||'').slice(0,8)}`}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'7px', flexShrink:0 }}>
          <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11px', fontWeight:'600', color:C.textMuted, background:C.bgTertiary, border:`1px solid ${C.borderSubtle}`, padding:'2px 8px', borderRadius:'4px' }}>
            {info.bed_number || '—'}
          </span>
          <RiskBadge level={risk} C={C} />
        </div>
      </div>

      {/* ── ROW 2: vitals grid ──────────────────── */}
      <div style={{ display:'flex', background:C.bgSecondary, border:`1px solid ${C.borderSubtle}`, borderRadius:'8px', overflow:'hidden' }}>
        {VITALS.map(({ key, label, unit }, i) => (
          <div key={key} style={{ flex:1, padding:'9px 10px', borderRight: i < 3 ? `1px solid ${C.borderSubtle}` : 'none' }}>
            <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'9.5px', fontWeight:'600', color:C.textFaint, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'4px' }}>
              {label}
            </div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:'20px', fontWeight:'800', color:vitalColor(key, reading[key], C), lineHeight:1, letterSpacing:'-0.5px' }}>
              {fmt(reading[key])}
              <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'9px', fontWeight:'500', color:C.textFaint, marginLeft:'2px' }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 3: AI observation ───────────────── */}
      {bullets[0] && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:'6px' }}>
          <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'9px', fontWeight:'700', color:C.aiText, background:C.aiBg, border:`1px solid ${C.aiBorder}`, padding:'2px 6px', borderRadius:'3px', flexShrink:0, letterSpacing:'0.4px', marginTop:'1px' }}>
            AI
          </span>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'12.5px', color:C.textSecondary, lineHeight:1.4, flex:1 }}>
            {bullets[0].text}
          </span>
        </div>
      )}

      {/* ── ROW 4: alert bar — always visible when alert is active ── */}
      {hasAlert && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'9px 12px', borderRadius:'7px', gap:'10px',
            background: alert.severity === 'critical' ? C.criticalBg : C.warningBg,
            border: `1px solid ${alert.severity === 'critical' ? C.criticalBorder : C.warningBorder}`
          }}
        >
          {/* Alert description */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
              {alert.severity === 'critical' && (
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.criticalPure, flexShrink:0, animation:'blink 1.2s ease-in-out infinite' }} />
              )}
              <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10px', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase', color: alert.severity === 'critical' ? C.criticalText : C.warningText }}>
                {alert.severity} alert
              </span>
            </div>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:'11.5px', color: alert.severity === 'critical' ? C.criticalText : C.warningText, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:0.85 }}>
              {alert.trigger_description}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
            <button
              onClick={handleAcknowledge}
              style={{
                padding:'5px 12px', borderRadius:'5px', border:'none',
                background: C.textPrimary, color: C.bgPrimary,
                fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11.5px', fontWeight:'600',
                cursor:'pointer', whiteSpace:'nowrap', transition:'opacity 0.12s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}
            >
              Acknowledge
            </button>
            <button
              onClick={handleEscalate}
              style={{
                padding:'5px 12px', borderRadius:'5px',
                border:`1px solid ${C.criticalBorder}`,
                background:'transparent', color: C.criticalText,
                fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11.5px', fontWeight:'600',
                cursor:'pointer', whiteSpace:'nowrap', transition:'background 0.12s'
              }}
              onMouseEnter={e => e.currentTarget.style.background=C.criticalBg}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              Escalate
            </button>
          </div>
        </div>
      )}

      {/* ── ROW 5: timestamp + navigate hint ────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11px', color:C.textFaint }}>
          {reading.read_at ? timeAgo(reading.read_at) : 'No readings yet'}
        </span>
        <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11px', color:C.textFaint, display:'flex', alignItems:'center', gap:'3px' }}>
          View details
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </div>

    </div>
  )
}

function RiskBadge({ level, C }) {
  const s = {
    stable:   { bg:C.stableBg,   color:C.stableText,   border:C.stableBorder   },
    warning:  { bg:C.warningBg,  color:C.warningText,  border:C.warningBorder  },
    critical: { bg:C.criticalBg, color:C.criticalText, border:C.criticalBorder }
  }[level] || { bg:C.stableBg, color:C.stableText, border:C.stableBorder }

  return (
    <span style={{
      fontFamily:"'IBM Plex Sans',sans-serif",
      fontSize:'10px', fontWeight:'700', letterSpacing:'0.5px',
      textTransform:'uppercase', padding:'2px 8px', borderRadius:'4px',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      whiteSpace:'nowrap'
    }}>
      {level}
    </span>
  )
}
