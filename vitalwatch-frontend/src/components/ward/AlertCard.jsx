import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../hooks/useAuth.jsx'
import { useColors }   from '../../hooks/useTheme.jsx'

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

export default function AlertCard({ alert, onAcknowledge, onEscalate, isNew }) {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const C          = useColors()
  const isUnacked  = alert.status === 'unacknowledged'
  const isCritical = alert.severity === 'critical'

  const accent   = isCritical ? C.criticalPure : C.warningPure
  const surfBg   = isUnacked ? (isCritical ? C.criticalBg : C.warningBg) : C.bgPrimary
  const bdColor  = isUnacked ? (isCritical ? C.criticalBorder : C.warningBorder) : C.borderSubtle

  function go(e) { if (e.target.closest('button')) return; navigate(`/patient/${alert.patient_id}`) }

  return (
    <div onClick={go} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&go(e)}
      style={{ background:surfBg, border:`1px solid ${bdColor}`, borderLeft:`3px solid ${isUnacked?accent:C.borderStrong}`, borderRadius:'8px', padding:'11px 13px', display:'flex', flexDirection:'column', gap:'7px', cursor:'pointer', opacity:isUnacked?1:0.65, animation:isNew?'slideIn 0.22s ease':'none', transition:'box-shadow 0.12s', fontFamily:"'Inter',sans-serif" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowSm}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
    >
      {/* Row 1 */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        {isUnacked && isCritical && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.criticalPure, flexShrink:0, animation:'blink 1.2s ease-in-out infinite' }} />}
        <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:'12.5px', fontWeight:'700', color:C.textPrimary, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {alert.patient_name || 'Unknown'}
        </span>
        {isUnacked && (
          <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10px', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase', padding:'2px 7px', borderRadius:'4px', background:isCritical?C.criticalBg:C.warningBg, color:isCritical?C.criticalText:C.warningText, border:`1px solid ${isCritical?C.criticalBorder:C.warningBorder}`, whiteSpace:'nowrap' }}>
            {alert.severity}
          </span>
        )}
        {alert.status==='escalated'  && <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10px', fontWeight:'700', textTransform:'uppercase', padding:'2px 7px', borderRadius:'4px', background:C.aiBg, color:C.aiText, border:`1px solid ${C.aiBorder}` }}>Escalated</span>}
        {alert.status==='acknowledged'&&<span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10px', fontWeight:'700', textTransform:'uppercase', padding:'2px 7px', borderRadius:'4px', background:C.bgTertiary, color:C.textMuted, border:`1px solid ${C.borderDefault}` }}>Acked</span>}
      </div>

      {/* Row 2 — description */}
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:'12px', color:isUnacked?C.textPrimary:C.textSecondary, lineHeight:1.45, margin:0, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {alert.trigger_description}
      </p>

      {/* Row 3 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
        <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10.5px', color:C.textFaint, flexShrink:0 }}>
          {timeAgo(alert.triggered_at)}
        </span>
        {isUnacked && (
          <div style={{ display:'flex', gap:'5px' }}>
            <button
              onClick={e=>{ e.stopPropagation(); onAcknowledge(alert.id, user?.id||'unknown') }}
              style={{ padding:'3px 10px', borderRadius:'5px', fontSize:'11.5px', fontWeight:'600', background:C.textPrimary, color:C.bgPrimary, border:'none', fontFamily:"'IBM Plex Sans',sans-serif", cursor:'pointer' }}
            >Acknowledge</button>
            <button
              onClick={e=>{ e.stopPropagation(); onEscalate(alert.id, user?.id||'unknown') }}
              style={{ padding:'3px 10px', borderRadius:'5px', fontSize:'11.5px', fontWeight:'600', background:'transparent', color:C.criticalText, border:`1px solid ${C.criticalBorder}`, fontFamily:"'IBM Plex Sans',sans-serif", cursor:'pointer' }}
            >Escalate</button>
          </div>
        )}
      </div>
    </div>
  )
}
