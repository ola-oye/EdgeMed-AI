/**
 * PatientDetailPage.jsx
 * ──────────────────────
 * Layout ensures AI Risk panel is always visible beside charts.
 * Charts use continuous scrolling view (bedside monitor style).
 * No scrolling needed to see the full assessment.
 */

import { useColors } from '../hooks/useTheme.jsx'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { usePatientDetail, VITAL_RANGES }       from '../hooks/usePatientDetail.js'
import VitalTile    from '../components/detail/VitalTile.jsx'
import VitalChart   from '../components/detail/VitalChart.jsx'
import AISidebar    from '../components/detail/AISidebar.jsx'
import ContextDrawer from '../components/detail/ContextDrawer.jsx'

const VITALS = ['heart_rate', 'spo2', 'respiration_rate', 'body_temperature']

export default function PatientDetailPage() {
  const C = useColors()
  const { patientId } = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()

  const {
    patient, reading, assessment, alertSev,
    readings, alertHistory, loading, error,
    isNewReading, getTrend
  } = usePatientDetail(patientId)

  function goBack() {
    location.state?.from === '/ward' ? navigate(-1) : navigate('/ward')
  }

  const risk = assessment?.risk_level || 'stable'
  const rb = {
    stable:   { label:'Stable',   color:C.stableText, bg:C.stableBg, border:C.stableBorder },
    warning:  { label:'Warning',  color:C.warningText, bg:C.warningBg, border:C.warningBorder },
    critical: { label:'Critical', color:C.criticalText, bg:C.criticalBg, border:C.criticalBorder }
  }[risk]

  const hoursPost = patient?.surgery_at
    ? Math.floor((Date.now() - new Date(patient.surgery_at).getTime()) / 3600000)
    : null

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, gap:'12px', fontFamily:"'Inter', sans-serif", color:C.textMuted, fontSize:'14px' }}>
      <div className="spinner" /> Loading patient data…
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, fontFamily:"'Inter', sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:C.criticalPure, fontWeight:600, marginBottom:'8px', fontFamily:"'Manrope', sans-serif" }}>Failed to load patient</p>
        <p style={{ color:C.textMuted, fontSize:'13px', marginBottom:'16px' }}>{error}</p>
        <button onClick={goBack} style={{ padding:'8px 16px', background:C.textPrimary, color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontFamily:"'Inter', sans-serif", fontSize:'13px', fontWeight:600 }}>
          ← Back to Ward
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', fontFamily:"'Inter', sans-serif" }}>

      {/* ── BREADCRUMB ─────────────────────── */}
      <div style={{ padding:'7px 22px', background:C.textInverse, borderBottom:'1px solid #EBEBEB', display:'flex', alignItems:'center', gap:'7px', flexShrink:0 }}>
        <button onClick={goBack} style={{ background:'transparent', border:'none', color:'#1565C0', fontFamily:"'Inter', sans-serif", fontSize:'12.5px', fontWeight:500, cursor:'pointer', padding:0 }}>
          ← Ward Overview
        </button>
        <span style={{ color:C.borderStrong, fontSize:'12px' }}>/</span>
        <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'12px', color:C.textMuted }}>
          {patient?.bed_number} — {patient?.full_name || 'Patient'}
        </span>
      </div>

      {/* ── PATIENT HEADER ─────────────────── */}
      <div style={{ padding:'14px 22px', background:C.textInverse, borderBottom:'1px solid #EBEBEB', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>

          {/* Left — identity */}
          <div>
            {/* Name — Manrope */}
            <h1 style={{ fontFamily:"'Manrope', sans-serif", fontSize:'21px', fontWeight:'800', color:C.textPrimary, letterSpacing:'-0.4px', margin:'0 0 3px' }}>
              {patient?.full_name || `Patient ${patientId?.slice(0,8)}`}
            </h1>
            {/* Meta — IBM Plex Sans */}
            <p style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'12.5px', color:C.textMuted, margin:'0 0 6px' }}>
              {[patient?.age ? `${patient.age} yrs` : null, patient?.gender, patient?.bed_number].filter(Boolean).join(' · ')}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              {patient?.surgery_type && (
                <span style={{ fontFamily:"'Manrope', sans-serif", fontSize:'13.5px', fontWeight:'700', color:C.textPrimary }}>
                  {patient.surgery_type}
                </span>
              )}
              {hoursPost != null && (
                <span style={{
                  fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11.5px', fontWeight:500,
                  padding:'2px 8px', borderRadius:'4px',
                  background: hoursPost < 24 ? C.warningBg : C.stableBg,
                  color: hoursPost < 24 ? C.warningText : C.stableText
                }}>
                  {hoursPost}h post-surgery
                </span>
              )}
            </div>
          </div>

          {/* Right — risk badge */}
          <div style={{ padding:'8px 16px', borderRadius:'8px', border:`1px solid ${rb.border}`, background:rb.bg, flexShrink:0, textAlign:'center' }}>
            <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'9.5px', fontWeight:'600', color:C.textFaint, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'2px' }}>
              AI Risk
            </div>
            <div style={{ fontFamily:"'Manrope', sans-serif", fontSize:'17px', fontWeight:'800', color:rb.color, letterSpacing:'-0.3px' }}>
              {rb.label}
            </div>
          </div>
        </div>

        {/* Vital tiles row */}
        <div style={{ display:'flex', gap:'10px' }}>
          {VITALS.map(key => {
            const vr = VITAL_RANGES[key]
            return (
              <VitalTile
                key={key}
                label={vr.label}
                fullLabel={vr.fullLabel}
                value={reading?.[key]}
                unit={vr.unit}
                rangeLow={vr.low}
                rangeHigh={vr.high}
                trend={getTrend(key)}
                flash={isNewReading}
              />
            )
          })}
        </div>
      </div>

      {/* ── MAIN BODY: charts left + AI sidebar right ── */}
      {/*
        KEY LAYOUT RULE:
        The outer container is flex row with fixed height (flex:1 + overflow:hidden).
        The left charts area has overflow-y:auto so it can scroll IF needed
        but with the 2x2 grid and compact charts it should fit.
        The AI sidebar is fixed width, full height, always visible.
        No layout causes the sidebar to be pushed below the fold.
      */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* Charts + time toggle */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'14px 14px 0' }}>

          {/* 2×2 chart grid — fills remaining height */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', flex:1, overflowY:'auto', paddingBottom:'10px', minHeight:0 }}>
            {VITALS.map(key => {
              const vr = VITAL_RANGES[key]
              const vReadings = [...readings
                .map(r => ({ value: r[key], read_at: r.read_at }))
                .filter(r => r.value != null)]

              if (reading?.[key] != null && reading?.read_at) {
                const exists = vReadings.some(r => r.read_at === reading.read_at)
                if (!exists) vReadings.push({ value: reading[key], read_at: reading.read_at })
              }

              return (
                <VitalChart
                  key={key}
                  label={vr.label}
                  unit={vr.unit}
                  readings={vReadings}
                  rangeLow={vr.low}
                  rangeHigh={vr.high}
                  timeWindow={120}
                  currentValue={reading?.[key]}
                />
              )
            })}
          </div>
        </div>

        {/* AI Sidebar — fixed width, always in viewport */}
        <AISidebar assessment={assessment} />
      </div>

      {/* ── CONTEXT DRAWER ─────────────────── */}
      <ContextDrawer patient={patient} alertHistory={alertHistory} />

    </div>
  )
}
