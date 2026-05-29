import { useColors }     from '../hooks/useTheme.jsx'
import { useWardSocket } from '../hooks/useWardSocket.jsx'
import PatientGrid       from '../components/ward/PatientGrid.jsx'

export default function WardOverviewPage() {
  const C = useColors()
  const {
    patients, counts, alerts,
    loading, connected,
    acknowledge, escalate
  } = useWardSocket()

  console.log('WardOverviewPage render:', { patients, counts, alerts, loading, connected })

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', background:C.bgCanvas }}>
      <PatientGrid
        patients={patients}
        counts={counts}
        alerts={alerts}
        loading={loading}
        connected={connected}
        onAcknowledge={acknowledge}
        onEscalate={escalate}
      />
    </div>
  )
}
