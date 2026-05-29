/**
 * hooks/usePatientDetail.js
 * ──────────────────────────
 * Polls patient status every 15 seconds.
 * Fetches reading history for trend charts.
 * Fetches alert history for the context drawer.
 */

import { useState, useEffect, useRef } from 'react'
import { patientsApi, alertsApi }       from '../api/client'

const POLL_INTERVAL  = 15_000
const HISTORY_WINDOW = 120   // 2 hours — matches fixed chart window

export const VITAL_RANGES = {
  heart_rate:       { low: 60,   high: 100,   label: 'HR',    fullLabel: 'Heart Rate',       unit: 'bpm'  },
  spo2:             { low: 95,   high: 100,   label: 'SpO₂', fullLabel: 'Oxygen Saturation',  unit: '%'    },
  respiration_rate: { low: 12,   high: 20,    label: 'RR',   fullLabel: 'Respiration Rate',  unit: 'brpm' },
  body_temperature: { low: 97.5, high: 100.4, label: 'TEMP', fullLabel: 'Body Temperature',  unit: '°F'   }
}

export function usePatientDetail(patientId) {
  const [patient,      setPatient]      = useState(null)
  const [reading,      setReading]      = useState(null)
  const [assessment,   setAssessment]   = useState(null)
  const [alertSev,     setAlertSev]     = useState(null)
  const [readings,     setReadings]     = useState([])
  const [alertHistory, setAlertHistory] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const prevReadAt  = useRef(null)
  const intervalRef = useRef(null)

  // ── Fetch current status (polled) ──────────────────────
  async function fetchStatus() {
    try {
      const data = await patientsApi.getStatus(patientId)
      setPatient(prev => data.patient    ?? prev)
      setReading(data.reading    || null)
      setAssessment(data.assessment || null)
      setAlertSev(data.open_alert_severity || null)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch reading history for charts ───────────────────
  async function fetchReadings() {
    try {
      const data = await patientsApi.getReadings(patientId, HISTORY_WINDOW)
      setReadings(data.readings || [])
    } catch (err) {
      // Silent — charts show empty state if no history
    }
  }

  // ── Fetch alert history for context drawer ─────────────
  async function fetchAlertHistory() {
    try {
      const data = await alertsApi.getAlerts({ patientId, limit: 20 })
      setAlertHistory(data.alerts || [])
    } catch (err) {
      // Silent
    }
  }

  useEffect(() => {
    if (!patientId) return

    setLoading(true)

    // Initial fetch — all three in parallel
    Promise.all([fetchStatus(), fetchReadings(), fetchAlertHistory()])

    // Poll status + readings every 15 seconds
    intervalRef.current = setInterval(() => {
      fetchStatus()
      fetchReadings()
    }, POLL_INTERVAL)

    return () => clearInterval(intervalRef.current)
  }, [patientId])

  // Flash animation — detect when read_at changes
  const isNewReading = reading?.read_at !== prevReadAt.current
  useEffect(() => {
    if (reading?.read_at) prevReadAt.current = reading.read_at
  }, [reading?.read_at])

  // Trend direction — compare last 3 readings
  function getTrend(vitalKey) {
    if (readings.length < 2) return 'flat'
    const recent = readings
      .slice(-4)
      .map(r => r[vitalKey])
      .filter(v => v != null)
    if (recent.length < 2) return 'flat'
    const diff = recent[recent.length - 1] - recent[0]
    const threshold = { heart_rate: 3, spo2: 0.5, respiration_rate: 1, body_temperature: 0.2 }
    const t = threshold[vitalKey] || 1
    if (Math.abs(diff) < t) return 'flat'
    return diff > 0 ? 'up' : 'down'
  }

  return {
    patient,
    reading,
    assessment,
    alertSev,
    readings,
    alertHistory,
    loading,
    error,
    isNewReading,
    getTrend,
    refetch: fetchStatus
  }
}
