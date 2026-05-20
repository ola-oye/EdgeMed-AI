import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }             from './hooks/useAuth.jsx'
import { WardSocketProvider }  from './hooks/useWardSocket.jsx'
import AppShell                from './components/layout/AppShell.jsx'
import LoginPage               from './pages/LoginPage'
import WardOverviewPage        from './pages/WardOverviewPage'
import PatientDetailPage       from './pages/PatientDetailPage'
import AdminPage               from './pages/AdminPage'

const MONITORING_ROLES = ['nurse', 'doctor']
const CANCER_ROLES     = ['radiologist', 'oncologist']

function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:'12px', fontFamily:"'Inter', sans-serif", color:'#888', fontSize:'14px' }}>
      <div style={{ width:20, height:20, border:'2px solid #E0E0E0', borderTopColor:'#16A34A', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  if (MONITORING_ROLES.includes(user.role)) return <Navigate to="/ward"   replace />
  if (CANCER_ROLES.includes(user.role))     return <Navigate to="/cancer" replace />
  if (user.role === 'admin')                return <Navigate to="/admin"  replace />
  return <Navigate to="/login" replace />
}

/**
 * MonitoringLayout wraps all nurse/doctor routes with:
 *  - Auth check
 *  - WardSocketProvider  (one WebSocket connection shared across all child screens)
 *  - AppShell            (navbar, status bar, connection banner)
 */
function MonitoringLayout({ children }) {
  return (
    <RequireAuth allowedRoles={MONITORING_ROLES}>
      <WardSocketProvider>
        <AppShell>
          {children}
        </AppShell>
      </WardSocketProvider>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Monitoring — nurse / doctor */}
      <Route path="/ward"        element={<MonitoringLayout><WardOverviewPage /></MonitoringLayout>} />
      <Route path="/patient/:patientId" element={<MonitoringLayout><PatientDetailPage /></MonitoringLayout>} />

      {/* Admin */}
      <Route path="/admin" element={
        <RequireAuth allowedRoles={['admin']}>
          <AppShell><AdminPage /></AppShell>
        </RequireAuth>
      } />

      {/* Cancer detection — placeholder */}
      <Route path="/cancer/*" element={
        <RequireAuth allowedRoles={CANCER_ROLES}>
          <div style={{ padding:40, fontFamily:"'Inter', sans-serif" }}>Cancer detection — coming soon</div>
        </RequireAuth>
      } />

      <Route path="/"  element={<RoleRedirect />} />
      <Route path="*"  element={<Navigate to="/" replace />} />
    </Routes>
  )
}
