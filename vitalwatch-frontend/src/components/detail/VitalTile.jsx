import { useColors } from '../../hooks/useTheme.jsx'

export default function VitalTile({
  label, fullLabel, value, unit,
  rangeLow, rangeHigh, trend = 'flat', flash = false
}) {
  const C = useColors()
  const s          = getStatus(value, rangeLow, rangeHigh)
  const valueColor = s === 'red' ? C.criticalText : s === 'amber' ? C.warningText : C.textPrimary
  const tileBorder = s === 'red' ? C.criticalBorder : s === 'amber' ? C.warningBorder : C.borderSubtle
  const tileBg     = s === 'red' ? C.criticalBg : s === 'amber' ? C.warningBg : C.bgSecondary
  const trendColor = { up: s==='red'?C.criticalText:C.warningText, down:C.stableText, flat:C.textFaint }

  return (
    <div style={{
      flex:1, background:tileBg, border:`1px solid ${tileBorder}`,
      borderRadius:'10px', padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:'4px',
      minWidth:0
    }}>

      {/* Short clinical label — IBM Plex Sans, all caps */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{
          fontFamily:"'IBM Plex Sans', sans-serif",
          fontSize:'11px', fontWeight:'700',
          color: s !== 'normal' ? valueColor : C.textFaint,
          textTransform:'uppercase', letterSpacing:'1.2px'
        }}>
          {label}
        </span>
        {/* Trend arrow */}
        <span style={{ fontSize:'14px', lineHeight:1, color:trendColor[trend] }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}
        </span>
      </div>

      {/* The big number — Manrope, dominant */}
      <div style={{ display:'flex', alignItems:'baseline', gap:'5px', lineHeight:1 }}>
        <span
          className={flash ? 'vt-flash' : ''}
          style={{
            fontFamily:"'Manrope', sans-serif",
            fontSize:'44px', fontWeight:'800',
            color: valueColor, lineHeight:1,
            letterSpacing:'-2px'
          }}
        >
          {value != null ? fmt(value) : '—'}
        </span>
        <span style={{
          fontFamily:"'IBM Plex Sans', sans-serif",
          fontSize:'13px', fontWeight:'500', color:C.textFaint,
          marginBottom:'4px'
        }}>
          {unit}
        </span>
      </div>

      {/* Full clinical name — subtle, secondary */}
      {fullLabel && (
        <span style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:'11px', color:C.textFaint, marginTop:'1px'
        }}>
          {fullLabel}
        </span>
      )}

      {/* Normal range */}
      {rangeLow != null && (
        <span style={{
          fontFamily:"'IBM Plex Sans', sans-serif",
          fontSize:'10px', color:C.textFaint,
          marginTop:'2px', letterSpacing:'0.2px'
        }}>
          Ref: {rangeLow}–{rangeHigh} {unit}
        </span>
      )}

      <style>{`
        @keyframes vt-flash { 0%{opacity:0.2} 60%{opacity:1} 100%{opacity:1} }
        .vt-flash { animation: vt-flash 0.45s ease; }
      `}</style>
    </div>
  )
}

function getStatus(v, lo, hi) {
  if (v == null || lo == null || hi == null) return 'normal'
  if (v < lo || v > hi) {
    const p = v < lo ? (lo - v) / lo : (v - hi) / hi
    return p > 0.06 ? 'red' : 'amber'
  }
  return 'normal'
}

function fmt(v) {
  return Number.isInteger(v) ? v : parseFloat(Number(v).toFixed(1))
}
