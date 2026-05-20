/**
 * components/detail/ContextDrawer.jsx
 * ──────────────────────────────────────
 * Collapsible bottom drawer on the patient detail screen.
 * Two tabs: Patient Info and Alert History.
 *
 * Props:
 *  patient      — patient record object
 *  alertHistory — array of alert history items
 */

import { useColors } from '../../hooks/useTheme.jsx'
import { useState } from 'react'

export default function ContextDrawer({
patient = {}, alertHistory = [] }) {
  const C = useColors()
  const { subTitleStyle, tdStyle } = getDrawerStyles(C)
  const [open,       setOpen]       = useState(false)
  const [activeTab,  setActiveTab]  = useState('info')  // 'info' | 'alerts'

  const medications  = patient.medications  || []
  const conditions   = patient.conditions   || []
  const careNotes    = patient.care_notes   || patient.surgery_type
    ? `Post-surgery care for ${patient.surgery_type || 'procedure'}. Monitor vitals closely for the first 24 hours.`
    : null

  return (
    <div style={{ flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>

      {/* Trigger bar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '8px',
          padding:        '10px',
          background:     '#FAFAFA',
          borderTop:      '1px solid #EBEBEB',
          border:         'none',
          borderTop:      '1px solid #EBEBEB',
          cursor:         'pointer',
          fontSize:       '12.5px',
          fontWeight:     500,
          color:          '#666666',
          transition:     'background 0.15s',
          fontFamily:     "'Inter', sans-serif"
        }}
      >
        Patient Context & Alert History
        <span style={{
          fontSize:   '11px',
          transition: 'transform 0.2s',
          transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          display:    'inline-block'
        }}>▲</span>
      </button>

      {/* Drawer content */}
      {open && (
        <div style={{
          background:  C.textInverse,
          borderTop:   '1px solid #EBEBEB',
          maxHeight:   '280px',
          display:     'flex',
          flexDirection:'column',
          overflow:    'hidden'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #EBEBEB', flexShrink: 0 }}>
            {[
              { key: 'info',   label: 'Patient Info' },
              { key: 'alerts', label: `Alert History ${alertHistory.length > 0 ? `(${alertHistory.length})` : ''}` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding:       '10px 20px',
                  fontSize:      '13px',
                  fontWeight:    activeTab === tab.key ? 600 : 500,
                  color:         activeTab === tab.key ? C.textPrimary : C.textMuted,
                  background:    'transparent',
                  border:        'none',
                  borderBottom:  activeTab === tab.key ? '2px solid #111111' : '2px solid transparent',
                  cursor:        'pointer',
                  fontFamily:    "'Inter', sans-serif",
                  transition:    'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Conditions */}
                {conditions.length > 0 && (
                  <div>
                    <div style={subTitleStyle}>Pre-existing conditions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {conditions.map((c, i) => (
                        <span key={i} style={{
                          padding:      '3px 10px',
                          background:   C.bgTertiary,
                          border:       '1px solid #EBEBEB',
                          borderRadius: '4px',
                          fontSize:     '12.5px',
                          color:        '#444444'
                        }}>{typeof c === 'string' ? c : c.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {medications.length > 0 ? (
                  <div>
                    <div style={subTitleStyle}>Current medications</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', marginTop: '6px' }}>
                      <thead>
                        <tr>
                          {['Medication', 'Dose', 'Frequency', 'Last changed'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: C.textFaint, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #EBEBEB' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {medications.map((med, i) => {
                          const recentlyChanged = med.last_changed_at && isRecent(med.last_changed_at, 48)
                          return (
                            <tr key={i} style={{ background: recentlyChanged ? C.warningBg : 'transparent' }}>
                              <td style={tdStyle}>
                                {med.name}
                                {recentlyChanged && (
                                  <span style={{ fontSize: '10px', background: C.warningBorder, color: C.warningText, padding: '1px 5px', borderRadius: '3px', marginLeft: '6px' }}>
                                    Changed
                                  </span>
                                )}
                              </td>
                              <td style={tdStyle}>{med.dose || '—'}</td>
                              <td style={tdStyle}>{med.frequency || '—'}</td>
                              <td style={tdStyle}>{med.last_changed_at ? formatDate(med.last_changed_at) : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>
                    <div style={subTitleStyle}>Medications</div>
                    <p style={{ fontSize: '12.5px', color: C.textFaint, marginTop: '6px' }}>No medications recorded</p>
                  </div>
                )}

                {/* Care notes */}
                {careNotes && (
                  <div>
                    <div style={subTitleStyle}>Post-surgery care notes</div>
                    <p style={{ fontSize: '12.5px', color: '#444444', lineHeight: 1.6, marginTop: '6px' }}>
                      {careNotes}
                    </p>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                {alertHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: C.textFaint }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: C.stableBg, marginBottom: '10px'
                    }}>
                      <span style={{ color: C.stablePure, fontSize: '16px' }}>✓</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px' }}>No alerts in the last 24 hours</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Patient has been stable</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {alertHistory.map((alert, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                          background: alert.status === 'resolved' ? C.stableBg : C.criticalBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', marginTop: '2px'
                        }}>
                          <span style={{ color: alert.status === 'resolved' ? C.stablePure : C.criticalPure }}>
                            {alert.status === 'resolved' ? '✓' : '!'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '12.5px', fontWeight: 500, margin: '0 0 2px', color: C.textPrimary }}>
                            {alert.trigger_description}
                          </p>
                          <p style={{ fontSize: '11px', color: C.textFaint, margin: '0 0 2px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            {formatDate(alert.triggered_at)}
                          </p>
                          {alert.action_taken && (
                            <p style={{ fontSize: '11.5px', color: C.textSecondary, margin: 0 }}>
                              {alert.action_taken}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SHARED STYLES + HELPERS
// ─────────────────────────────────────────────

// Styles that depend on C are computed inside ContextDrawer using getDrawerStyles(C)
function getDrawerStyles(C) {
  return {
    subTitleStyle: {
      fontSize:'10.5px', fontWeight:600, textTransform:'uppercase',
      letterSpacing:'0.6px', color:C.textFaint
    },
    tdStyle: {
      padding:'6px 8px', color:C.textSecondary,
      borderBottom:`1px solid ${C.borderSubtle}`, verticalAlign:'middle'
    }
  }
}

function isRecent(isoString, hours) {
  return Date.now() - new Date(isoString).getTime() < hours * 3600 * 1000
}

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
