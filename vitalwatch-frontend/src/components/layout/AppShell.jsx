import { useNavigate, useLocation } from 'react-router-dom'
import { useColors }      from '../../hooks/useTheme.jsx'
import { useWardSocket }  from '../../hooks/useWardSocket.jsx'
import Navbar             from './Navbar.jsx'
import WardStatusBar      from './WardStatusBar.jsx'
import ConnectionBanner   from './ConnectionBanner.jsx'

export default function AppShell({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const C         = useColors()

  // Safely consume WS context — may not be available on admin/cancer routes
  let wsData = { count:0, wardStatus:'stable', connected:true, error:null }
  try { wsData = useWardSocket() } catch (_) {}

  const { count, wardStatus, connected, error } = wsData

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:C.bgCanvas }}>
      <Navbar
        alertCount={count}
        onBellClick={() => { if (location.pathname.startsWith('/patient')) navigate('/ward') }}
      />
      <WardStatusBar wardStatus={wardStatus} />
      <ConnectionBanner visible={!connected || !!error} />
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  )
}
