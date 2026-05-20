import { useColors } from '../../hooks/useTheme.jsx'
export default function VitalTile({
label, value, unit, rangeLow, rangeHigh, trend='flat', flash=false }) {
  const C = useColors()
  const s = getStatus(value, rangeLow, rangeHigh)
  const valueColor = s === 'red' ? C.criticalText : s === 'amber' ? C.warningText : C.textPrimary
  const tileBorder = s === 'red' ? C.criticalBorder : s === 'amber' ? C.warningBorder : C.borderSubtle
  const tileBg     = s === 'red' ? C.criticalBg : s === 'amber' ? C.warningBg : C.bgSecondary
  const trendColor = { up: s==='red'?C.criticalText:C.warningText, down:C.stableText, flat:C.textFaint }
  const trendIcon  = { up:'↑', down:'↓', flat:'→' }

  return (
    <div style={{
      flex:1, background:tileBg, border:`1px solid ${tileBorder}`,
      borderRadius:'10px', padding:'12px 14px',
      display:'flex', flexDirection:'column', gap:'5px', minWidth:0,
      fontFamily:"'Inter', sans-serif"
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'10px', fontWeight:'600', color:C.textFaint, textTransform:'uppercase', letterSpacing:'0.7px' }}>
          {label}
        </span>
        <span style={{ fontSize:'16px', lineHeight:1, color:trendColor[trend] }}>{trendIcon[trend]}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
        <span
          className={flash ? 'vt-flash' : ''}
          style={{ fontSize:'34px', fontWeight:'800', color:valueColor, lineHeight:1, fontFamily:"'Manrope', sans-serif", fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:'-1px' }}
        >
          {value != null ? fmt(value) : '—'}
        </span>
        <span style={{ fontSize:'12px', color:C.textFaint, fontWeight:'500' }}>{unit}</span>
      </div>
      {rangeLow != null && (
        <span style={{ fontSize:'10.5px', color:C.textFaint }}>
          {rangeLow}–{rangeHigh} {unit}
        </span>
      )}
      <style>{`
        @keyframes vt-flash { 0%{opacity:0.3} 60%{opacity:1} 100%{opacity:1} }
        .vt-flash { animation: vt-flash 0.4s ease; }
      `}</style>
    </div>
  )
}

function getStatus(v, lo, hi) {
  if (v==null||lo==null||hi==null) return 'normal'
  if (v<lo||v>hi) { const p=v<lo?(lo-v)/lo:(v-hi)/hi; return p>0.06?'red':'amber' }
  return 'normal'
}
function fmt(v) { return Number.isInteger(v)?v:parseFloat(Number(v).toFixed(1)) }
