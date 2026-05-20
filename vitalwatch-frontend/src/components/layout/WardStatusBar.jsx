import { useColors } from '../../hooks/useTheme.jsx'
export default function WardStatusBar({ wardStatus = 'stable' }) {
  const C  = useColors()
  const bg = wardStatus === 'critical' ? C.criticalPure : wardStatus === 'warning' ? C.warningPure : C.stablePure
  return <div style={{ height:'3px', background:bg, flexShrink:0, transition:'background 0.5s ease' }} role="status" aria-label={`Ward status: ${wardStatus}`} />
}
