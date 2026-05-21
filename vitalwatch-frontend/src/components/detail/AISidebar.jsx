import { useColors } from '../../hooks/useTheme.jsx'
export default function AISidebar({
assessment }) {
  const C = useColors()
  const { wrap, sec, secTitle } = getStyles(C)
  if (!assessment) return (
    <div style={wrap}>
      <div style={sec}>
        <p style={{ fontSize:'12px', color:C.textFaint, textAlign:'center', padding:'28px 0' }}>
          Waiting for assessment…
        </p>
      </div>
    </div>
  )

  const { risk_level='stable', confidence_score=0, explanation_bullets=[],
          suggested_action, contributing_factors={}, data_confidence, assessed_at } = assessment

  const rd = {
    stable:   { label:'Stable',   color:C.stableText,   bg:C.stableBg,   border:C.stableBorder },
    warning:  { label:'Warning',  color:C.warningText,  bg:C.warningBg,  border:C.warningBorder },
    critical: { label:'Critical', color:C.criticalText, bg:C.criticalBg, border:C.criticalBorder }
  }[risk_level] || { label:'Stable', color:C.stableText, bg:C.stableBg, border:C.stableBorder }

  const dotCol = { high:C.criticalPure, moderate:C.warningPure, low:C.stablePure }
  // Defensive: parse if backend sends as string instead of object
  const parsedFactors = typeof contributing_factors === 'string'
    ? (() => { try { return JSON.parse(contributing_factors) } catch { return {} } })()
    : (contributing_factors || {})
  const sorted = Object.entries(parsedFactors).sort((a,b)=>b[1]-a[1])

  function timeAgo(iso) {
    if (!iso) return ''
    const s = Math.floor((Date.now()-new Date(iso).getTime())/1000)
    if (s<60) return `${s}s ago`
    if (s<3600) return `${Math.floor(s/60)}m ago`
    return `${Math.floor(s/3600)}h ago`
  }

  return (
    <div style={wrap}>
      {/* Risk level */}
      <div style={{ padding:'16px', borderBottom:'1px solid #EBEBEB' }}>
        <div style={{ fontSize:'9.5px', fontWeight:'700', color:C.textFaint, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
          AI Assessment
        </div>
        <div style={{ background:rd.bg, border:`1px solid ${rd.border}`, borderRadius:'8px', padding:'12px' }}>
          <div style={{ fontSize:'20px', fontWeight:'800', color:rd.color, letterSpacing:'-0.5px', lineHeight:1, fontFamily:"'Manrope', sans-serif" }}>
            {rd.label}
          </div>
          <div style={{ fontSize:'10px', color:C.textFaint, marginTop:'4px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {assessed_at ? timeAgo(assessed_at) : 'pending'}
          </div>
        </div>
      </div>

      {/* Data confidence */}
      {data_confidence && data_confidence !== 'full' && (
        <div style={{ margin:'10px 14px 0', padding:'8px 10px', background:C.warningBg, border:'1px solid #FCD34D', borderRadius:'6px', fontSize:'11px', color:C.warningText }}>
          Limited history — improving with more readings
        </div>
      )}

      {/* Explanation */}
      {explanation_bullets.length > 0 && (
        <div style={sec}>
          <div style={secTitle}>Clinical observations</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
            {explanation_bullets.map((b,i) => (
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:dotCol[b.severity]||C.textFaint, flexShrink:0, marginTop:'5px' }} />
                <span style={{ fontSize:'12px', color:C.textPrimary, lineHeight:1.55 }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributing factors */}
      {sorted.length > 0 && (
        <div style={sec}>
          <div style={secTitle}>Contributing factors</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {sorted.filter(([,pct]) => typeof pct === 'number' && pct > 0).map(([vital, pct]) => (
              <div key={vital}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                  <span style={{ fontSize:'11.5px', color:C.textSecondary }}>{vital}</span>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:C.textPrimary, fontFamily:"'IBM Plex Sans', sans-serif" }}>{Math.round(pct)}%</span>
                </div>
                <div style={{ height:'3px', background:C.borderSubtle, borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,pct)}%`, borderRadius:'2px', transition:'width 0.5s ease',
                    background: pct>35?C.criticalPure:pct>20?C.warningPure:C.aiVivid }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested action */}
      {suggested_action && risk_level !== 'stable' && (
        <div style={sec}>
          <div style={secTitle}>Recommended action</div>
          <div style={{ background:C.aiBg, border:'1px solid #BFDBFE', borderRadius:'8px', padding:'11px 12px' }}>
            <p style={{ fontSize:'12px', color:C.aiText, lineHeight:1.55, margin:0, fontWeight:'500' }}>
              {suggested_action}
            </p>
          </div>
        </div>
      )}

      {/* Confidence */}
      {confidence_score > 0 && (
        <div style={{ ...sec, marginTop:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
            <span style={{ fontSize:'11px', color:C.textMuted }}>Model confidence</span>
            <span style={{ fontSize:'11.5px', fontWeight:'700', color:C.textPrimary, fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {Math.round(confidence_score)}%
            </span>
          </div>
          <div style={{ height:'4px', background:C.borderSubtle, borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(100,confidence_score)}%`, background:C.aiVivid, borderRadius:'2px', transition:'width 0.5s' }} />
          </div>
        </div>
      )}
    </div>
  )
}

const getStyles = (C) => ({
  wrap:     { width:'260px', flexShrink:0, borderLeft:`1px solid ${C.borderSubtle}`, display:'flex', flexDirection:'column', overflowY:'auto', background:C.bgPrimary, fontFamily:"'Inter', sans-serif" },
  sec:      { padding:'14px 16px', borderBottom:`1px solid ${C.borderSubtle}` },
  secTitle: { fontSize:'9.5px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', color:C.textFaint, marginBottom:'10px', fontFamily:"'IBM Plex Sans', sans-serif" }
})
