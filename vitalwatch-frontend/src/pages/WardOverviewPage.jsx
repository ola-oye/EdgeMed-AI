import { useColors }      from '../hooks/useTheme.jsx'
import { useWardSocket }  from '../hooks/useWardSocket.jsx'
import PatientGrid        from '../components/ward/PatientGrid.jsx'
import AlertFeed          from '../components/ward/AlertFeed.jsx'

export default function WardOverviewPage() {
  const C = useColors()
  const {
    patients, counts, loading, connected,
    unacknowledged, acknowledged, count,
    filter, setFilter, acknowledge, escalate
  } = useWardSocket()

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', background:C.bgCanvas }}>
      <div style={{ flex:'0 0 62%', borderRight:`1px solid ${C.borderSubtle}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <PatientGrid
          patients={patients}
          counts={counts}
          loading={loading}
          connected={connected}
        />
      </div>
      <div style={{ flex:'0 0 38%', display:'flex', flexDirection:'column', overflow:'hidden', background:C.bgPrimary }}>
        <AlertFeed
          unacknowledged={unacknowledged}
          acknowledged={acknowledged}
          count={count}
          filter={filter}
          onFilterChange={setFilter}
          onAcknowledge={acknowledge}
          onEscalate={escalate}
          loading={loading}
        />
      </div>
    </div>
  )
}
