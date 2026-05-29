/**
 * api/client.js
 * Every API call in one file.
 */

const BASE = '/api'

async function request(method, path, body = null) {
  const opts = {
    method,
    headers:     { 'Content-Type': 'application/json' },
    credentials: 'include'
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
  console.log('API response:', res)
}

const get  = (path)       => request('GET',  path)
const post = (path, body) => request('POST', path, body)

// ── AUTH ──────────────────────────────────────────────────
export const authApi = {
  login:  (email, password) => post('/auth/login', { email, password }),
  logout: ()                => post('/auth/logout', {}),
  me:     ()                => get('/auth/me'),
  createUser: (data)        => post('/auth/users', data)
}

// ── PATIENTS ──────────────────────────────────────────────
export const patientsApi = {
  getAll:    ()                          => get('/patients'),
  getStatus: (id)                        => get(`/patients/${id}/status`),
  getReadings:(id, minutes=180)          => get(`/patients/${id}/readings?minutes=${minutes}`),
  register:  (data)                      => post('/patients', data),
  enroll:    (data)                      => post('/monitoring/enroll', data),
  alertHistory:(id, limit=20)            => get(`/alerts/patient/${id}?limit=${limit}`)
}

// ── ALERTS ────────────────────────────────────────────────
export const alertsApi = {
  getCount:  ()            => get('/alerts/count'),
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.status)    qs.set('status',     params.status)
    if (params.severity)  qs.set('severity',   params.severity)
    if (params.patientId) qs.set('patient_id', params.patientId)
    if (params.limit)     qs.set('limit',      params.limit)
    const q = qs.toString()
    return get(`/alerts${q ? `?${q}` : ''}`)
  },
  acknowledge: (id, by, action=null) => post(`/alerts/${id}/acknowledge`, { acknowledged_by: by, action_taken: action }),
  escalate:    (id, by, note=null)   => post(`/alerts/${id}/escalate`,    { escalated_by: by, note }),
  resolve:     (id, by, action=null) => post(`/alerts/${id}/resolve`,     { resolved_by: by, action_taken: action })
}

// ── DEVICES ───────────────────────────────────────────────
export const devicesApi = {
  getAll:   ()     => get('/devices'),
  assign:   (data) => post('/devices/assign',   data),
  unassign: (data) => post('/devices/unassign', data)
}
