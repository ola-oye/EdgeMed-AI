/**
 * AdminPage.jsx
 * ─────────────
 * Admin panel — two tabs:
 *   1. Patient Registration (register + enroll)
 *   2. Device Assignment (assign device to patient)
 *   3. Staff Management (create staff accounts)
 */

import { useState, useEffect } from 'react'
import { useColors }           from '../hooks/useTheme.jsx'
import { patientsApi, devicesApi, authApi } from '../api/client'

export default function AdminPage() {
  const C = useColors()
  const [tab, setTab] = useState('patients')

  const tabStyle = (active) => ({
    padding: '10px 20px', border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", fontSize: '13.5px', fontWeight: active ? 600 : 500,
    color: active ? C.textPrimary : C.textSecondary,
    background: 'transparent',
    borderBottom: `2px solid ${active ? C.textPrimary : 'transparent'}`,
    transition: 'all 0.12s'
  })

  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:C.bgCanvas, fontFamily:"'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ background:C.bgPrimary, borderBottom:`1px solid ${C.borderSubtle}`, padding:'16px 24px 0', flexShrink:0 }}>
        <h1 style={{ fontFamily:"'Manrope', sans-serif", fontSize:'18px', fontWeight:'800', color:C.textPrimary, marginBottom:'14px' }}>
          Admin Panel
        </h1>
        <div style={{ display:'flex', gap:0 }}>
          <button style={tabStyle(tab==='patients')} onClick={() => setTab('patients')}>Patient Registration</button>
          <button style={tabStyle(tab==='devices')}  onClick={() => setTab('devices')}>Device Assignment</button>
          <button style={tabStyle(tab==='staff')}    onClick={() => setTab('staff')}>Staff Management</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
      {tab === 'patients' ? <PatientRegistrationTab C={C} /> :
       tab === 'devices'  ? <DeviceAssignmentTab C={C} />    :
                            <StaffManagementTab C={C} />}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PATIENT REGISTRATION TAB
// ──────────────────────────────────────────────────────────
function PatientRegistrationTab({ C }) {
  const [form, setForm] = useState({
    patient_id:'', full_name:'', age:'', gender:'',
    bed_number:'', surgery_type:'', surgery_at:''
  })
  const [status,  setStatus]  = useState(null)  // { type:'success'|'error', msg }
  const [loading, setLoading] = useState(false)

  function update(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.patient_id.trim() || !form.full_name.trim() || !form.bed_number.trim()) {
      setStatus({ type:'error', msg:'Patient ID, Full Name, and Bed Number are required.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await patientsApi.register({
        patient_id: form.patient_id.trim(),
        full_name:  form.full_name.trim(),
        age:        form.age ? parseInt(form.age) : undefined,
        gender:     form.gender || undefined
      })
      await patientsApi.enroll({
        patient_id:   form.patient_id.trim(),
        bed_number:   form.bed_number.trim(),
        surgery_type: form.surgery_type || undefined,
        surgery_at:   form.surgery_at   || undefined
      })
      setStatus({ type:'success', msg:`Patient ${form.full_name} registered and enrolled in Bed ${form.bed_number}.` })
      setForm({ patient_id:'', full_name:'', age:'', gender:'', bed_number:'', surgery_type:'', surgery_at:'' })
    } catch (err) {
      setStatus({ type:'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth:'520px' }}>
      <p style={{ fontSize:'13px', color:C.textSecondary, marginBottom:'24px', lineHeight:1.6 }}>
        Register a new patient in the central registry and enroll them in post-surgery monitoring.
        The Patient ID will be used to configure the monitoring device.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <FieldRow label="Patient ID *" hint="Used to configure the device">
          <Input C={C} value={form.patient_id} onChange={v => update('patient_id', v)} placeholder="e.g. patient-006" />
        </FieldRow>
        <FieldRow label="Full Name *">
          <Input C={C} value={form.full_name} onChange={v => update('full_name', v)} placeholder="e.g. James Okafor" />
        </FieldRow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <FieldRow label="Age">
            <Input C={C} value={form.age} onChange={v => update('age', v)} placeholder="42" type="number" />
          </FieldRow>
          <FieldRow label="Gender">
            <Select C={C} value={form.gender} onChange={v => update('gender', v)}
              options={[{v:'',l:'Select…'},{v:'male',l:'Male'},{v:'female',l:'Female'},{v:'other',l:'Other'}]} />
          </FieldRow>
        </div>
        <div style={{ borderTop:`1px solid ${C.borderSubtle}`, paddingTop:'16px', marginTop:'4px' }}>
          <p style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'10.5px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.textMuted, marginBottom:'14px' }}>
            Ward Enrollment
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <FieldRow label="Bed Number *">
              <Input C={C} value={form.bed_number} onChange={v => update('bed_number', v)} placeholder="e.g. Bed 06" />
            </FieldRow>
            <FieldRow label="Surgery Type">
              <Input C={C} value={form.surgery_type} onChange={v => update('surgery_type', v)} placeholder="e.g. Appendectomy" />
            </FieldRow>
            <FieldRow label="Surgery Date / Time">
              <Input C={C} value={form.surgery_at} onChange={v => update('surgery_at', v)} type="datetime-local" />
            </FieldRow>
          </div>
        </div>

        {status && (
          <div style={{ padding:'10px 14px', borderRadius:'7px', fontSize:'13px',
            background: status.type === 'success' ? C.stableBg : C.criticalBg,
            border: `1px solid ${status.type === 'success' ? C.stableBorder : C.criticalBorder}`,
            color: status.type === 'success' ? C.stableText : C.criticalText
          }}>
            {status.msg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ padding:'10px 20px', borderRadius:'7px', border:'none', cursor:'pointer',
            background: loading ? C.bgTertiary : C.textPrimary,
            color: loading ? C.textMuted : C.bgPrimary,
            fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'13px', fontWeight:600,
            alignSelf:'flex-start', transition:'all 0.12s'
          }}
        >
          {loading ? 'Registering…' : 'Register & Enroll Patient'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// DEVICE ASSIGNMENT TAB
// ──────────────────────────────────────────────────────────
function DeviceAssignmentTab({ C }) {
  const [devices,    setDevices]    = useState([])
  const [deviceId,   setDeviceId]   = useState('')
  const [patientId,  setPatientId]  = useState('')
  const [assignedBy, setAssignedBy] = useState('')
  const [status,     setStatus]     = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => { loadDevices() }, [])

  async function loadDevices() {
    try {
      const data = await devicesApi.getAll()
      setDevices(data.devices || [])
    } catch (_) {}
  }

  async function handleAssign() {
    if (!deviceId.trim() || !patientId.trim()) {
      setStatus({ type:'error', msg:'Device ID and Patient ID are required.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await devicesApi.assign({ device_id: deviceId.trim(), patient_id: patientId.trim(), assigned_by: assignedBy || 'admin' })
      setStatus({ type:'success', msg:`Device ${deviceId} assigned to patient ${patientId}.` })
      setDeviceId(''); setPatientId(''); setAssignedBy('')
      loadDevices()
    } catch (err) {
      setStatus({ type:'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleUnassign(dId) {
    try {
      await devicesApi.unassign({ device_id: dId, unassigned_by: 'admin' })
      loadDevices()
    } catch (err) {
      setStatus({ type:'error', msg: err.message })
    }
  }

  return (
    <div style={{ maxWidth:'640px' }}>
      <p style={{ fontSize:'13px', color:C.textSecondary, marginBottom:'24px', lineHeight:1.6 }}>
        Assign a monitoring device to a patient by entering the device hardware ID and the patient ID.
        A device can only be assigned to one patient at a time.
      </p>

      {/* Assign form */}
      <div style={{ background:C.bgPrimary, border:`1px solid ${C.borderSubtle}`, borderRadius:'10px', padding:'20px', marginBottom:'24px' }}>
        <p style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.textMuted, marginBottom:'16px' }}>
          New Assignment
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <FieldRow label="Device Hardware ID">
              <Input C={C} value={deviceId}   onChange={setDeviceId}   placeholder="e.g. OXI-3A:F2:C1" />
            </FieldRow>
            <FieldRow label="Patient ID">
              <Input C={C} value={patientId}  onChange={setPatientId}  placeholder="e.g. patient-001" />
            </FieldRow>
          </div>
          <FieldRow label="Assigned By (optional)">
            <Input C={C} value={assignedBy} onChange={setAssignedBy} placeholder="Nurse name or ID" />
          </FieldRow>
          {status && (
            <div style={{ padding:'9px 13px', borderRadius:'6px', fontSize:'12.5px',
              background: status.type==='success' ? C.stableBg : C.criticalBg,
              border:`1px solid ${status.type==='success' ? C.stableBorder : C.criticalBorder}`,
              color: status.type==='success' ? C.stableText : C.criticalText }}>
              {status.msg}
            </div>
          )}
          <button onClick={handleAssign} disabled={loading}
            style={{ padding:'9px 18px', borderRadius:'7px', border:'none', cursor:'pointer', alignSelf:'flex-start',
              background:loading ? C.bgTertiary : C.textPrimary, color:loading ? C.textMuted : C.bgPrimary,
              fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'12.5px', fontWeight:600 }}>
            {loading ? 'Assigning…' : 'Assign Device'}
          </button>
        </div>
      </div>

      {/* Current assignments */}
      {devices.length > 0 && (
        <div>
          <p style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.textMuted, marginBottom:'12px' }}>
            Current Assignments
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {devices.map(d => (
              <div key={d.device_id} style={{ background:C.bgPrimary, border:`1px solid ${C.borderSubtle}`, borderRadius:'8px', padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                <div>
                  <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'12px', fontWeight:600, color:C.textPrimary }}>{d.device_id}</div>
                  {d.patient_id ? (
                    <div style={{ fontSize:'12px', color:C.textSecondary, marginTop:'2px' }}>
                      {d.patient_name || d.patient_id}
                      {d.bed_number && <span style={{ color:C.textMuted, marginLeft:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>{d.bed_number}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize:'12px', color:C.textMuted, marginTop:'2px' }}>Unassigned</div>
                  )}
                </div>
                {d.patient_id && (
                  <button onClick={() => handleUnassign(d.device_id)}
                    style={{ padding:'4px 10px', borderRadius:'5px', border:`1px solid ${C.criticalBorder}`, background:'transparent', color:C.criticalText, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11.5px', fontWeight:600, cursor:'pointer' }}>
                    Unassign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// STAFF MANAGEMENT TAB
// ──────────────────────────────────────────────────────────
const ROLES = [
  { v:'',            l:'Select role…' },
  { v:'nurse',       l:'Nurse' },
  { v:'doctor',      l:'Doctor' },
  { v:'radiologist', l:'Radiologist' },
  { v:'oncologist',  l:'Oncologist' },
  { v:'admin',       l:'Administrator' },
]

function StaffManagementTab({ C }) {
  const [form, setForm]     = useState({ email:'', name:'', role:'', password:'', confirm:'' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  function update(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    if (!form.email.trim())    return 'Email is required.'
    if (!form.name.trim())     return 'Full name is required.'
    if (!form.role)            return 'Role is required.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setStatus({ type:'error', msg: err }); return }

    setLoading(true)
    setStatus(null)
    try {
      await authApi.createUser({
        email:    form.email.trim().toLowerCase(),
        name:     form.name.trim(),
        role:     form.role,
        password: form.password
      })
      setStatus({ type:'success', msg:`Account created for ${form.name} (${form.role}).` })
      setForm({ email:'', name:'', role:'', password:'', confirm:'' })
    } catch (err) {
      setStatus({ type:'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth:'480px' }}>
      <p style={{ fontSize:'13px', color:C.textSecondary, marginBottom:'24px', lineHeight:1.6 }}>
        Create a new staff account. The staff member can log in immediately
        with the credentials you set here.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

        <FieldRow label="Full Name *">
          <Input C={C} value={form.name} onChange={v => update('name', v)} placeholder="e.g. Adaeze Okafor" />
        </FieldRow>

        <FieldRow label="Email Address *">
          <Input C={C} value={form.email} onChange={v => update('email', v)} placeholder="e.g. nurse@hospital.org" type="email" />
        </FieldRow>

        <FieldRow label="Role *">
          <Select C={C} value={form.role} onChange={v => update('role', v)} options={ROLES} />
        </FieldRow>

        {/* Password section */}
        <div style={{ borderTop:`1px solid ${C.borderSubtle}`, paddingTop:'16px', marginTop:'4px' }}>
          <p style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'10.5px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.textMuted, marginBottom:'14px' }}>
            Password
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <FieldRow label="Password *" hint="Minimum 8 characters">
              <Input C={C} value={form.password} onChange={v => update('password', v)}
                placeholder="••••••••" type={showPwd ? 'text' : 'password'} />
            </FieldRow>
            <FieldRow label="Confirm Password *">
              <Input C={C} value={form.confirm} onChange={v => update('confirm', v)}
                placeholder="••••••••" type={showPwd ? 'text' : 'password'} />
            </FieldRow>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12.5px', color:C.textSecondary, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)}
                style={{ width:'14px', height:'14px', cursor:'pointer' }} />
              Show password
            </label>
          </div>
        </div>

        {/* Password strength hint */}
        {form.password.length > 0 && (
          <PasswordStrength password={form.password} C={C} />
        )}

        {status && (
          <div style={{
            padding:'10px 14px', borderRadius:'7px', fontSize:'13px',
            background: status.type === 'success' ? C.stableBg   : C.criticalBg,
            border:    `1px solid ${status.type === 'success' ? C.stableBorder : C.criticalBorder}`,
            color:      status.type === 'success' ? C.stableText  : C.criticalText
          }}>
            {status.msg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding:'10px 20px', borderRadius:'7px', border:'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? C.bgTertiary : C.textPrimary,
            color:      loading ? C.textMuted  : C.bgPrimary,
            fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'13px', fontWeight:600,
            alignSelf:'flex-start', transition:'all 0.12s'
          }}
        >
          {loading ? 'Creating account…' : 'Create Staff Account'}
        </button>
      </div>
    </div>
  )
}

function PasswordStrength({ password, C }) {
  const checks = [
    { label: '8+ characters',       pass: password.length >= 8 },
    { label: 'Uppercase letter',     pass: /[A-Z]/.test(password) },
    { label: 'Number',               pass: /[0-9]/.test(password) },
    { label: 'Special character',    pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const score  = checks.filter(c => c.pass).length
  const color  = score <= 1 ? C.criticalText : score <= 2 ? C.warningText : score <= 3 ? C.warningText : C.stableText
  const label  = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : 'Strong'

  return (
    <div style={{ background:C.bgSecondary, border:`1px solid ${C.borderSubtle}`, borderRadius:'7px', padding:'10px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
        <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', color:C.textMuted }}>Password strength</span>
        <span style={{ fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11px', fontWeight:600, color }}>{label}</span>
      </div>
      <div style={{ display:'flex', gap:'4px', marginBottom:'10px' }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{ flex:1, height:'3px', borderRadius:'2px', background: n <= score ? color : C.borderDefault, transition:'background 0.2s' }} />
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'10.5px',
            color: c.pass ? C.stableText : C.textMuted,
            display:'flex', alignItems:'center', gap:'4px'
          }}>
            <span>{c.pass ? '✓' : '○'}</span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── SHARED SMALL COMPONENTS ────────────────────────────────
function FieldRow({ label, hint, children }) {
  return (
    <div>
      <label style={{ display:'block', fontFamily:"'IBM Plex Sans', sans-serif", fontSize:'11.5px', fontWeight:600, color:'#666', marginBottom:'5px' }}>
        {label}
        {hint && <span style={{ fontWeight:400, color:'#AAAAAA', marginLeft:'6px' }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ C, value, onChange, placeholder='', type='text' }) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ width:'100%', padding:'8px 12px', borderRadius:'6px', border:`1px solid ${C.borderDefault}`, background:C.bgSecondary, color:C.textPrimary, fontFamily:"'Inter', sans-serif", fontSize:'13px', outline:'none' }}
      onFocus={e => e.target.style.borderColor = C.aiVivid}
      onBlur={e  => e.target.style.borderColor = C.borderDefault}
    />
  )
}

function Select({ C, value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', padding:'8px 12px', borderRadius:'6px', border:`1px solid ${C.borderDefault}`, background:C.bgSecondary, color:C.textPrimary, fontFamily:"'Inter', sans-serif", fontSize:'13px', outline:'none' }}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}
