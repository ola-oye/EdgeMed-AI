import { useColors } from '../../hooks/useTheme.jsx'
export default function ConnectionBanner({ visible }) {
  const C = useColors()
  if (!visible) return null
  return (
    <div style={{ background:C.warningBg, borderBottom:`1px solid ${C.warningBorder}`, padding:'6px 20px', display:'flex', alignItems:'center', gap:'8px', flexShrink:0, fontFamily:"'Inter',sans-serif", fontSize:'12.5px', color:C.warningText, fontWeight:500 }}>
      <span>⚠</span>
      Connection lost — retrying…
      <span style={{ marginLeft:'auto', fontSize:'10.5px', color:C.warningText, fontFamily:"'IBM Plex Sans',sans-serif", opacity:0.7 }}>Data may be outdated</span>
    </div>
  )
}
