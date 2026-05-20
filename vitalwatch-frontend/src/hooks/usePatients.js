/**
 * hooks/usePatients.js
 * ─────────────────────
 * Polls GET /api/patients every 15 seconds.
 * Returns the sorted patient list and a loading flag.
 *
 * Sorting: Critical first, then Warning, then Stable.
 * Within each group sorted by most recently updated.
 */

import { useState, useEffect, useRef } from 'react'
import { patientsApi } from '../api/client'

const POLL_INTERVAL = 15_000   // 15 seconds
const SEVERITY_RANK = { critical: 0, warning: 1, stable: 2 }

function sortPatients(patients) {
  return [...patients].sort((a, b) => {
    const aLevel = a.assessment?.risk_level || 'stable'
    const bLevel = b.assessment?.risk_level || 'stable'

    // Primary sort — by severity
    const rankDiff = SEVERITY_RANK[aLevel] - SEVERITY_RANK[bLevel]
    if (rankDiff !== 0) return rankDiff

    // Secondary sort — by most recently updated
    const aTime = new Date(a.reading?.read_at || 0).getTime()
    const bTime = new Date(b.reading?.read_at || 0).getTime()
    return bTime - aTime
  })
}

export function usePatients() {
  const [patients,       setPatients]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [lastUpdated,    setLastUpdated]    = useState(null)
  const [countdown,      setCountdown]      = useState(POLL_INTERVAL / 1000)
  const intervalRef      = useRef(null)
  const countdownRef     = useRef(null)

  async function fetchPatients() {
    try {
      const data = await patientsApi.getAll()
      setPatients(sortPatients(data.patients || []))
      setError(null)
      setLastUpdated(new Date())
      setCountdown(POLL_INTERVAL / 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()

    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchPatients, POLL_INTERVAL)

    // Countdown timer — updates every second for the "last refreshed" display
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1))
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  // Derived counts for the summary counter buttons
  const counts = patients.reduce((acc, p) => {
    const level = p.assessment?.risk_level || 'stable'
    acc[level] = (acc[level] || 0) + 1
    return acc
  }, { critical: 0, warning: 0, stable: 0 })

  return { patients, loading, error, lastUpdated, countdown, counts, refetch: fetchPatients }
}
