/**
 * hooks/useAlerts.js
 * ───────────────────
 * Polls alert count every 15 seconds.
 * Detects new alerts and triggers browser sounds.
 * Also provides the alert feed list and action handlers.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { alertsApi } from '../api/client'
import { playWarningAlert, playCriticalAlert, playAllClear, initAudio } from '../utils/sound'

const POLL_INTERVAL = 15_000

export function useAlerts() {
  const [count,       setCount]       = useState(0)
  const [wardStatus,  setWardStatus]  = useState('stable')
  const [alerts,      setAlerts]      = useState([])
  const [filter,      setFilter]      = useState('all')   // 'all' | 'critical'
  const [loading,     setLoading]     = useState(true)

  const prevAlertIds  = useRef(new Set())
  const prevOpenIds   = useRef(new Set())
  const intervalRef   = useRef(null)

  // Initialise audio context on first user interaction
  useEffect(() => {
    const init = () => { initAudio(); }
    document.addEventListener('click',    init, { once: true })
    document.addEventListener('keypress', init, { once: true })
    return () => {
      document.removeEventListener('click',    init)
      document.removeEventListener('keypress', init)
    }
  }, [])

  async function fetchAlertCount() {
    try {
      const data = await alertsApi.getCount()
      setCount(data.total)
      setWardStatus(data.ward_status)
    } catch (err) {
      // Silent fail for count — don't show error for background poll
    }
  }

  async function fetchAlertFeed() {
    try {
      const params = filter === 'critical'
        ? { severity: 'critical' }
        : {}

      const data = await alertsApi.getAlerts(params)
      const incoming = data.alerts || []

      // Detect new alerts for sound triggering
      const currentIds   = new Set(incoming.map(a => a.id))
      const currentOpen  = new Set(
        incoming.filter(a => a.status === 'unacknowledged').map(a => a.id)
      )

      const newAlerts     = incoming.filter(a => !prevAlertIds.current.has(a.id))
      const resolvedCount = [...prevOpenIds.current].filter(id => !currentOpen.has(id)).length

      const hasNewCritical = newAlerts.some(a => a.severity === 'critical')
      const hasNewWarning  = newAlerts.some(a => a.severity === 'warning')

      if (hasNewCritical)                          playCriticalAlert()
      else if (hasNewWarning)                      playWarningAlert()
      else if (resolvedCount > 0 && !newAlerts.length) playAllClear()

      prevAlertIds.current = currentIds
      prevOpenIds.current  = currentOpen

      setAlerts(incoming)
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlertCount()
    fetchAlertFeed()

    intervalRef.current = setInterval(() => {
      fetchAlertCount()
      fetchAlertFeed()
    }, POLL_INTERVAL)

    return () => clearInterval(intervalRef.current)
  }, [filter])

  // ── Alert actions ──────────────────────────────────────

  const acknowledge = useCallback(async (alertId, userId) => {
    await alertsApi.acknowledge(alertId, userId)
    fetchAlertFeed()
    fetchAlertCount()
  }, [])

  const escalate = useCallback(async (alertId, userId, note) => {
    await alertsApi.escalate(alertId, userId, note)
    fetchAlertFeed()
    fetchAlertCount()
  }, [])

  const resolve = useCallback(async (alertId, userId) => {
    await alertsApi.resolve(alertId, userId)
    fetchAlertFeed()
    fetchAlertCount()
  }, [])

  // Separate unacknowledged and acknowledged for display
  const unacknowledged = alerts.filter(a => a.status === 'unacknowledged')
  const acknowledged   = alerts.filter(a => a.status !== 'unacknowledged')

  return {
    count,
    wardStatus,
    alerts,
    unacknowledged,
    acknowledged,
    filter,
    setFilter,
    loading,
    acknowledge,
    escalate,
    resolve
  }
}
