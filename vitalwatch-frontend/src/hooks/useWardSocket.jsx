/**
 * hooks/useWardSocket.js
 * ───────────────────────
 * WebSocket connection + alert/patient state.
 * Provided via WardSocketProvider — one connection per session.
 * Both AppShell and WardOverviewPage consume the same context.
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { patientsApi, alertsApi } from '../api/client'
import { playWarningAlert, playCriticalAlert, playAllClear, initAudio } from '../utils/sound'

const WardSocketContext = createContext(null)

const SEVERITY_RANK    = { critical: 0, warning: 1, stable: 2 }
const INITIAL_RETRY_MS = 2_000
const MAX_RETRY_MS     = 30_000

function sortPatients(list) {
  return [...list].sort((a, b) => {
    const ra = SEVERITY_RANK[a.assessment?.risk_level || 'stable']
    const rb = SEVERITY_RANK[b.assessment?.risk_level || 'stable']
    if (ra !== rb) return ra - rb
    return new Date(b.reading?.read_at || 0) - new Date(a.reading?.read_at || 0)
  })
}

export function WardSocketProvider({ children }) {
  const [patients,   setPatients]   = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [count,      setCount]      = useState(0)
  const [wardStatus, setWardStatus] = useState('stable')
  const [connected,  setConnected]  = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [filter,     setFilter]     = useState('all')

  const wsRef        = useRef(null)
  const retryMs      = useRef(INITIAL_RETRY_MS)
  const retryTimer   = useRef(null)
  const prevAlertIds = useRef(new Set())
  const filterRef    = useRef(filter)

  useEffect(() => { filterRef.current = filter }, [filter])

  // Audio init
  useEffect(() => {
    const init = () => initAudio()
    document.addEventListener('click',    init, { once: true })
    document.addEventListener('keypress', init, { once: true })
    return () => {
      document.removeEventListener('click',    init)
      document.removeEventListener('keypress', init)
    }
  }, [])

  // Initial data load
  async function initialLoad() {
    try {
      const [pd, ad, cd] = await Promise.all([
        patientsApi.getAll(),
        alertsApi.getAlerts(),
        alertsApi.getCount()
      ])
      setPatients(sortPatients(pd.patients || []))
      setAlerts(ad.alerts || [])
      setCount(cd.total)
      setWardStatus(cd.ward_status)
      prevAlertIds.current = new Set((ad.alerts || []).map(a => a.id))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Refresh on WS push
  const refreshPatients = useCallback(async () => {
    try {
      const data = await patientsApi.getAll()
      setPatients(sortPatients(data.patients || []))
    } catch (_) {}
  }, [])

  const refreshAlerts = useCallback(async () => {
    try {
      const params = filterRef.current === 'critical' ? { severity: 'critical' } : {}
      const [ad, cd] = await Promise.all([alertsApi.getAlerts(params), alertsApi.getCount()])
      const incoming   = ad.alerts || []
      const currentIds = new Set(incoming.map(a => a.id))
      const newAlerts  = incoming.filter(a => !prevAlertIds.current.has(a.id))
      const resolved   = [...prevAlertIds.current].filter(id => !currentIds.has(id))

      if      (newAlerts.some(a => a.severity === 'critical')) playCriticalAlert()
      else if (newAlerts.some(a => a.severity === 'warning'))  playWarningAlert()
      else if (resolved.length && !newAlerts.length)           playAllClear()

      prevAlertIds.current = currentIds
      setAlerts(incoming)
      setCount(cd.total)
      setWardStatus(cd.ward_status)
    } catch (_) {}
  }, [])

  // WebSocket
  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const port     = import.meta.env.DEV ? '8000' : window.location.port
    const url      = `${protocol}://${window.location.hostname}:${port}/ws/ward`
    const ws       = new WebSocket(url)
    wsRef.current  = ws

    ws.onopen  = () => { setConnected(true); setError(null); retryMs.current = INITIAL_RETRY_MS }
    ws.onclose = () => { setConnected(false); scheduleReconnect() }
    ws.onerror = () => { setConnected(false); setError('Connection lost') }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'ping')           ws.send(JSON.stringify({ type: 'pong' }))
        if (msg.type === 'patient_update') { refreshPatients(); refreshAlerts() }
      } catch (_) {}
    }
  }

  function scheduleReconnect() {
    clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      retryMs.current = Math.min(retryMs.current * 1.5, MAX_RETRY_MS)
      connect()
    }, retryMs.current)
  }

  // Alert actions
  const acknowledge = useCallback(async (id, by) => { await alertsApi.acknowledge(id, by); refreshAlerts() }, [refreshAlerts])
  const escalate    = useCallback(async (id, by, note) => { await alertsApi.escalate(id, by, note); refreshAlerts() }, [refreshAlerts])
  const resolve     = useCallback(async (id, by) => { await alertsApi.resolve(id, by); refreshAlerts() }, [refreshAlerts])

  useEffect(() => {
    initialLoad()
    connect()
    return () => { clearTimeout(retryTimer.current); wsRef.current?.close() }
  }, [])

  const unacknowledged = alerts.filter(a => a.status === 'unacknowledged')
  const acknowledged   = alerts.filter(a => a.status !== 'unacknowledged')
  const counts         = patients.reduce((acc, p) => {
    const l = p.assessment?.risk_level || 'stable'
    acc[l]  = (acc[l] || 0) + 1
    return acc
  }, { critical:0, warning:0, stable:0 })

  const value = {
    patients, counts, loading, error, connected,
    alerts, unacknowledged, acknowledged,
    count, wardStatus,
    filter, setFilter,
    acknowledge, escalate, resolve,
    refetch: () => { refreshPatients(); refreshAlerts() }
  }

  return <WardSocketContext.Provider value={value}>{children}</WardSocketContext.Provider>
}

export function useWardSocket() {
  const ctx = useContext(WardSocketContext)
  if (!ctx) throw new Error('useWardSocket must be inside WardSocketProvider')
  return ctx
}
