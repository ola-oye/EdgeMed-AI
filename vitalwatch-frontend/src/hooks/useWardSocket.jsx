/**
 * hooks/useWardSocket.jsx
 * ───────────────────────
 * WebSocket connection + alert/patient state.
 * WardSocketProvider wraps all monitoring routes — one connection per session.
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
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

// Merge a single patient_update broadcast into the existing patient list.
// Returns { next, found }. If the patient is not in the list, found is
// false and the caller should do a full refresh to pull them in.
function mergePatientUpdate(prev, msg) {
  let found = false
  const next = prev.map(p => {
    const pid = p.patient?.patient_id || p.patient?.id
    if (pid !== msg.patient_id) return p
    found = true
    return {
      ...p,                                  // keep identity, bed, surgery info
      reading:             msg.reading,      // swap in fresh vitals
      assessment:          msg.assessment,   // swap in fresh AI result
      open_alert_severity: msg.open_alert_severity
    }
  })
  return { next: found ? sortPatients(next) : next, found }
}

// Merge a fired/updated alert into the alerts array.
// Adds it if new, replaces it if it already exists.
function mergeAlert(prev, alert) {
  if (!alert) return prev
  const idx = prev.findIndex(a => a.id === alert.id)
  if (idx === -1) return [alert, ...prev]
  const copy = [...prev]
  copy[idx] = alert
  return copy
}

export function WardSocketProvider({ children }) {
  const navigate     = useNavigate()

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
  const hasData      = useRef(false)   // track whether we have loaded data yet

  useEffect(() => { filterRef.current = filter }, [filter])

  // ── Audio — use document-level listener that persists ──────────
  useEffect(() => {
    function init() { initAudio() }
    // Use capture phase so it fires before React handlers
    window.addEventListener('click', init, { once: false, capture: true })
    window.addEventListener('keydown', init, { once: false, capture: true })
    // Init immediately if the context can be created without interaction
    // (some browsers allow this when page is already active)
    try { initAudio() } catch (_) {}
    return () => {
      window.removeEventListener('click', init, { capture: true })
      window.removeEventListener('keydown', init, { capture: true })
    }
  }, [])

  // ── Data load ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
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
      // Seed prevAlertIds so the NEXT load can detect new arrivals
      prevAlertIds.current = new Set((ad.alerts || []).map(a => a.id))
      setError(null)
      hasData.current = true
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('authenticated')) {
        navigate('/login', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── Refresh patients ────────────────────────────────────────────
  const refreshPatients = useCallback(async () => {
    try {
      const data = await patientsApi.getAll()
      setPatients(sortPatients(data.patients || []))
    } catch (err) {
      if (err.message?.includes('401')) navigate('/login', { replace: true })
    }
  }, [navigate])

  // ── Refresh alerts + trigger sound ─────────────────────────────
  const refreshAlerts = useCallback(async () => {
    try {
      const params        = filterRef.current === 'critical' ? { severity:'critical' } : {}
      const [ad, cd]      = await Promise.all([alertsApi.getAlerts(params), alertsApi.getCount()])
      const incoming      = ad.alerts || []
      const currentIds    = new Set(incoming.map(a => a.id))

      // Only treat as "new" if we have a baseline to compare against
      if (hasData.current) {
        const newAlerts  = incoming.filter(
          a => !prevAlertIds.current.has(a.id) && a.status === 'unacknowledged'
        )
        const resolved   = [...prevAlertIds.current].filter(id => !currentIds.has(id))

        if      (newAlerts.some(a => a.severity === 'critical')) playCriticalAlert()
        else if (newAlerts.some(a => a.severity === 'warning'))  playWarningAlert()
        else if (resolved.length > 0 && newAlerts.length === 0)  playAllClear()
      }

      prevAlertIds.current = currentIds
      setAlerts(incoming)
      setCount(cd.total)
      setWardStatus(cd.ward_status)
    } catch (err) {
      if (err.message?.includes('401')) navigate('/login', { replace: true })
    }
  }, [navigate])

  // ── WebSocket ───────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const port     = import.meta.env.DEV ? '8000' : (window.location.port || '')
    const portStr  = port ? `:${port}` : ''
    const url      = `${protocol}://${window.location.hostname}${portStr}/ws/ward`

    const ws      = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      retryMs.current = INITIAL_RETRY_MS
      // Load fresh data when connection is (re)established
      loadData()
    }

    ws.onclose = () => {
      setConnected(false)
      scheduleReconnect()
    }

    ws.onerror = () => {
      setConnected(false)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
          return
        }

        if (msg.type === 'patient_update') {
          // 1. Merge the patient in place using the pushed payload
          setPatients(prev => {
            const { next, found } = mergePatientUpdate(prev, msg)
            // Patient not in list yet (newly enrolled) — pull full list once
            if (!found) refreshPatients()
            return next
          })

          // 2. Handle the alert carried in the payload
          if (msg.alert) {
            // Sound only for genuinely new unacknowledged alerts
            const isNew = !prevAlertIds.current.has(msg.alert.id)
            if (isNew && msg.alert.status === 'unacknowledged') {
              if      (msg.alert.severity === 'critical') playCriticalAlert()
              else if (msg.alert.severity === 'warning')  playWarningAlert()
            }
            prevAlertIds.current.add(msg.alert.id)
            setAlerts(prev => mergeAlert(prev, msg.alert))
          } else if (msg.open_alert_severity === null) {
            // Patient returned to stable — backend auto-resolved their alerts.
            // Drop this patient's open alerts from the local feed.
            setAlerts(prev => {
              const stillOpen = prev.filter(a => a.patient_id !== msg.patient_id)
              if (stillOpen.length !== prev.length) playAllClear()
              return stillOpen
            })
          }

          // 3. Keep count + ward status correct from local alert state
          setAlerts(prev => {
            const unacked  = prev.filter(a => a.status === 'unacknowledged')
            const critical = unacked.some(a => a.severity === 'critical')
            const warning  = unacked.some(a => a.severity === 'warning')
            setCount(unacked.length)
            setWardStatus(critical ? 'critical' : warning ? 'warning' : 'stable')
            return prev   // no change to the array itself, just deriving counts
          })
        }
      } catch (_) {}
    }
  }, [loadData, refreshPatients])

  function scheduleReconnect() {
    clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      retryMs.current = Math.min(retryMs.current * 1.5, MAX_RETRY_MS)
      connect()
    }, retryMs.current)
  }

  // ── Alert actions ───────────────────────────────────────────────
  const acknowledge = useCallback(async (id, by) => {
    await alertsApi.acknowledge(id, by)
    refreshAlerts()
  }, [refreshAlerts])

  const escalate = useCallback(async (id, by, note) => {
    await alertsApi.escalate(id, by, note)
    refreshAlerts()
  }, [refreshAlerts])

  const resolve = useCallback(async (id, by) => {
    await alertsApi.resolve(id, by)
    refreshAlerts()
  }, [refreshAlerts])

  // ── Mount / unmount ─────────────────────────────────────────────
  useEffect(() => {
    // Load initial data immediately (don't wait for WS)
    loadData()
    // Open WebSocket — onopen will reload data again when connected
    connect()

    return () => {
      clearTimeout(retryTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // prevent scheduleReconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const unacknowledged = alerts.filter(a => a.status === 'unacknowledged')
  const acknowledged   = alerts.filter(a => a.status !== 'unacknowledged')
  const counts         = patients.reduce((acc, p) => {
    const l = p.assessment?.risk_level || 'stable'
    acc[l]  = (acc[l] || 0) + 1
    return acc
  }, { critical: 0, warning: 0, stable: 0 })

  const value = {
    patients, counts, loading, error, connected,
    alerts, unacknowledged, acknowledged,
    count, wardStatus,
    filter, setFilter,
    acknowledge, escalate, resolve,
    refetch: loadData
  }

  return (
    <WardSocketContext.Provider value={value}>
      {children}
    </WardSocketContext.Provider>
  )
}

export function useWardSocket() {
  const ctx = useContext(WardSocketContext)
  if (!ctx) throw new Error('useWardSocket must be inside WardSocketProvider')
  return ctx
}
