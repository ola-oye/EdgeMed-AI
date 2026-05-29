/**
 * LoginPage.jsx
 * ─────────────
 * Represents both clinical systems:
 *   — Post-Surgery Patient Monitoring
 *   — Breast Cancer Detection
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const ROLE_ROUTES = {
  nurse:       '/ward',
  doctor:      '/ward',
  radiologist: '/cancer',
  oncologist:  '/cancer',
  admin:       '/admin'
}

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(ROLE_ROUTES[user.role] || '/ward', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-shell">

      {/* ── LEFT PANEL ─────────────────────────── */}
      <div className="lp-left">

        {/* Animated ECG */}
        <div className="lp-ecg-wrap" aria-hidden="true">
          <svg className="lp-ecg" viewBox="0 0 600 80" preserveAspectRatio="none">
            <polyline className="lp-ecg-line" points="
              0,40 60,40 70,40 80,15 90,65 100,40
              160,40 170,40 180,15 190,65 200,40
              260,40 270,40 280,15 290,65 300,40
              360,40 370,40 380,15 390,65 400,40
              460,40 470,40 480,15 490,65 500,40
              560,40 600,40
            "/>
          </svg>
        </div>

        {/* Wordmark */}
        <div className="lp-identity">
          <div className="lp-wordmark">
            <span className="lp-vital">Vital</span>
            <span className="lp-watch">Watch</span>
          </div>
          <p className="lp-tagline">Health AI Platform · Edge Computing</p>
        </div>

        {/* ── TWO SYSTEM MODULES ─────────────────── */}
        <div className="lp-modules">

          <div className="lp-module">
            <div className="lp-module-header">
              <span className="lp-module-icon">♥</span>
              <span className="lp-module-title">Post-Surgery Monitoring</span>
            </div>
            <p className="lp-module-desc">
              Continuous vital sign surveillance with real-time AI risk
              assessment for post-operative patients.
            </p>
            <div className="lp-module-roles">
              <span className="lp-role-tag">Nurse</span>
              <span className="lp-role-tag">Doctor</span>
            </div>
          </div>

          <div className="lp-module-divider" aria-hidden="true" />

          <div className="lp-module">
            <div className="lp-module-header">
              <span className="lp-module-icon lp-module-icon--pink">✦</span>
              <span className="lp-module-title">Breast Cancer Detection</span>
            </div>
            <p className="lp-module-desc">
              On-device AI analysis of ultrasound and mammogram scans
              with bounding box localisation and confidence scoring.
            </p>
            <div className="lp-module-roles">
              <span className="lp-role-tag">Radiologist</span>
              <span className="lp-role-tag">Oncologist</span>
            </div>
          </div>
        </div>

        {/* System status */}
        <div className="lp-status-grid">
          <div className="lp-status-item">
            <span className="lp-status-dot lp-dot-pulse" />
            <span className="lp-status-label">System Online</span>
          </div>
          <div className="lp-status-item">
            <span className="lp-status-dot lp-dot-static" />
            <span className="lp-status-label">AI Engine Ready</span>
          </div>
          <div className="lp-status-item">
            <span className="lp-status-dot lp-dot-static" />
            <span className="lp-status-label">All Processing On-Device</span>
          </div>
        </div>

        <p className="lp-left-footer">
          Authorised personnel only.<br />
          All access is logged and monitored.
        </p>
      </div>

      {/* ── RIGHT PANEL ────────────────────────── */}
      <div className="lp-right">
        <div className="lp-form-wrap">

          <header className="lp-form-header">
            <div className="lp-form-eyebrow">Clinical Access Portal</div>
            <h1 className="lp-form-title">Sign In</h1>
            <p className="lp-form-subtitle">
              You will be directed to your module based on your assigned role.
            </p>
          </header>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>

            <div className="lp-field">
              <label className="lp-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                className={`lp-input ${error ? 'lp-input-error' : ''}`}
                type="email" autoComplete="email"
                placeholder="you@hospital.org"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required disabled={loading}
              />
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="password">Password</label>
              <input
                id="password"
                className={`lp-input ${error ? 'lp-input-error' : ''}`}
                type="password" autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required disabled={loading}
              />
            </div>

            {error && (
              <div className="lp-error" role="alert">
                <span className="lp-error-icon">!</span>
                {error}
              </div>
            )}

            <button
              type="submit" className="lp-submit"
              disabled={loading || !email || !password}
            >
              {loading
                ? <><span className="lp-btn-spinner" /> Authenticating…</>
                : 'Sign In'
              }
            </button>

          </form>

          <p className="lp-form-footer">
            Contact your system administrator<br />
            if you are unable to access your account.
          </p>

        </div>
      </div>

      {/* ── STYLES ─────────────────────────────── */}
      <style>{`
        .lp-shell {
          display: flex; min-height: 100vh;
          background: #0C0E12;
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
        }

        /* ─── LEFT ───────────────────────────── */
        .lp-left {
          width: 46%;
          background: #0C0E12;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 52px 52px 48px;
          position: relative; overflow: hidden;
          border-right: 1px solid #111827;
          flex-shrink: 0;
        }
        .lp-left::before, .lp-left::after {
          content: ''; position: absolute;
          width: 20px; height: 20px;
        }
        .lp-left::before {
          top: 24px; left: 24px;
          border-top: 1px solid #16A34A;
          border-left: 1px solid #16A34A;
        }
        .lp-left::after {
          bottom: 24px; right: 24px;
          border-bottom: 1px solid #16A34A;
          border-right: 1px solid #16A34A;
        }

        /* ECG */
        .lp-ecg-wrap {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 80px; opacity: 0.15; pointer-events: none;
        }
        .lp-ecg { width: 100%; height: 100%; }
        .lp-ecg-line {
          fill: none; stroke: #16A34A;
          stroke-width: 1.5;
          stroke-dasharray: 1200; stroke-dashoffset: 1200;
          animation: lp-ecg-draw 3s ease-out forwards,
                     lp-ecg-loop 6s ease-in-out 3s infinite;
        }
        @keyframes lp-ecg-draw { to { stroke-dashoffset: 0; } }
        @keyframes lp-ecg-loop { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* Wordmark */
        .lp-identity { flex-shrink: 0; }
        .lp-wordmark {
          font-family: 'Manrope', sans-serif;
          font-size: 50px; font-weight: 800;
          letter-spacing: -2px; line-height: 1; margin-bottom: 10px;
        }
        .lp-vital { color: #FFFFFF; }
        .lp-watch { color: #16A34A; }
        .lp-tagline {
          font-family: 'IBM Plex Sans', monospace;
          font-size: 11px; color: #4B5A7A;
          letter-spacing: 0.8px; text-transform: uppercase;
        }

        /* ─── MODULE CARDS ───────────────────── */
        .lp-modules {
          display: flex; flex-direction: column; gap: 0;
          border: 1px solid #1A2035; border-radius: 10px;
          overflow: hidden; flex-shrink: 0;
        }
        .lp-module {
          padding: 18px 20px;
          background: rgba(255,255,255,0.025);
          transition: background 0.2s;
        }
        .lp-module:hover { background: rgba(255,255,255,0.04); }
        .lp-module-divider {
          height: 1px; background: #1A2035;
        }
        .lp-module-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 8px;
        }
        .lp-module-icon {
          width: 28px; height: 28px; border-radius: '6px';
          background: rgba(22,163,74,0.15);
          border: 1px solid rgba(22,163,74,0.25);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px; color: #16A34A; flex-shrink: 0;
          border-radius: 6px;
        }
        .lp-module-icon--pink {
          background: rgba(236,72,153,0.12);
          border-color: rgba(236,72,153,0.22);
          color: #F472B6;
        }
        .lp-module-title {
          font-family: 'Manrope', sans-serif;
          font-size: 13.5px; font-weight: 700; color: #D1D9E6;
          letter-spacing: -0.1px;
        }
        .lp-module-desc {
          font-family: 'Inter', sans-serif;
          font-size: 12px; color: #5A6A88;
          line-height: 1.6; margin: 0 0 10px;
        }
        .lp-module-roles {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .lp-role-tag {
          font-family: 'IBM Plex Sans', monospace;
          font-size: 10px; font-weight: 600;
          color: #4B5A7A; background: rgba(255,255,255,0.04);
          border: 1px solid #1A2035;
          padding: 2px 8px; border-radius: 4px;
          letter-spacing: 0.3px;
        }

        /* ─── STATUS ─────────────────────────── */
        .lp-status-grid {
          display: flex; flex-direction: column; gap: 10px;
          flex-shrink: 0;
        }
        .lp-status-item {
          display: flex; align-items: center; gap: 10px;
        }
        .lp-status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #16A34A; flex-shrink: 0;
        }
        .lp-dot-static { opacity: 0.75; }
        .lp-dot-pulse {
          animation: lp-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.6); }
          50%      { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
        .lp-status-label {
          font-family: 'IBM Plex Sans', monospace;
          font-size: 11.5px; color: #5A6A88; letter-spacing: 0.3px;
        }

        /* ─── LEFT FOOTER ────────────────────── */
        .lp-left-footer {
          font-family: 'Inter', sans-serif;
          font-size: 11px; color: #2E3D55;
          line-height: 1.7; flex-shrink: 0;
        }

        /* ─── RIGHT PANEL ────────────────────── */
        .lp-right {
          flex: 1; background: #FFFFFF;
          display: flex; align-items: center; justify-content: center;
          padding: 48px;
        }
        .lp-form-wrap { width: 100%; max-width: 400px; }

        /* Form header */
        .lp-form-header { margin-bottom: 36px; }
        .lp-form-eyebrow {
          font-family: 'IBM Plex Sans', monospace;
          font-size: 11px; font-weight: 600;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #16A34A; margin-bottom: 12px;
        }
        .lp-form-title {
          font-family: 'Manrope', sans-serif;
          font-size: 34px; font-weight: 800;
          color: #0C0E12; letter-spacing: -0.8px;
          line-height: 1.1; margin-bottom: 10px;
        }
        .lp-form-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 13.5px; color: #6B7A99; line-height: 1.55;
        }

        /* Fields */
        .lp-form {
          display: flex; flex-direction: column; gap: 22px; margin-bottom: 28px;
        }
        .lp-field { display: flex; flex-direction: column; gap: 7px; }
        .lp-label {
          font-family: 'IBM Plex Sans', monospace;
          font-size: 11.5px; font-weight: 600; color: #3D4F6E;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .lp-input {
          padding: 13px 16px; border: 1.5px solid #E5E8EF;
          border-radius: 7px; font-size: 15px; color: #0C0E12;
          background: #F8F9FB;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          outline: none; width: 100%;
          font-family: 'Inter', sans-serif;
        }
        .lp-input::placeholder { color: #B0BAD0; }
        .lp-input:focus {
          border-color: #16A34A; background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
        }
        .lp-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-input-error   { border-color: #DC2626; }
        .lp-input-error:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.10);
        }

        /* Error */
        .lp-error {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 13px;
          background: #FEF2F2; border: 1px solid #FECACA;
          border-radius: 7px; font-size: 13px; color: #DC2626;
          animation: lp-shake 0.35s ease;
        }
        @keyframes lp-shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)}
          40%{transform:translateX(4px)}   60%{transform:translateX(-3px)}
          80%{transform:translateX(3px)}
        }
        .lp-error-icon {
          width: 18px; height: 18px; border-radius: 50%;
          background: #DC2626; color: #FFFFFF;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }

        /* Submit */
        .lp-submit {
          width: 100%; padding: 14px;
          background: #0C0E12; color: #FFFFFF;
          border: none; border-radius: 7px;
          font-family: 'Manrope', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 0.1px; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center;
          gap: 10px; margin-top: 4px;
        }
        .lp-submit:hover:not(:disabled) { background: #1A2035; }
        .lp-submit:active:not(:disabled) { transform: scale(0.99); }
        .lp-submit:disabled { opacity: 0.45; cursor: not-allowed; }
        .lp-btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FFFFFF; border-radius: 50%;
          animation: lp-spin 0.65s linear infinite; flex-shrink: 0;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* Form footer */
        .lp-form-footer {
          font-family: 'Inter', sans-serif;
          font-size: 12px; color: #9BAABB;
          line-height: 1.7; text-align: center;
        }

        /* ─── RESPONSIVE ─────────────────────── */
        @media (max-width: 900px) {
          .lp-shell    { flex-direction: column; }
          .lp-left     { width: 100%; padding: 40px 32px 32px; }
          .lp-modules  { display: none; }
          .lp-identity { margin-bottom: 20px; }
          .lp-wordmark { font-size: 38px; }
          .lp-right    { padding: 32px 24px; align-items: flex-start; }
        }

        /* ─── DARK MODE ──────────────────────── */
        [data-theme="dark"] .lp-right        { background: #0C1018; }
        [data-theme="dark"] .lp-form-title   { color: #E6EDF3; }
        [data-theme="dark"] .lp-form-subtitle,
        [data-theme="dark"] .lp-form-footer  { color: #6E7681; }
        [data-theme="dark"] .lp-label        { color: #8B949E; }
        [data-theme="dark"] .lp-input {
          background: #161B22; border-color: #21262D; color: #E6EDF3;
        }
        [data-theme="dark"] .lp-input::placeholder { color: #484F58; }
        [data-theme="dark"] .lp-input:focus {
          border-color: #2EA043; background: #161B22;
          box-shadow: 0 0 0 3px rgba(46,160,67,0.15);
        }
        [data-theme="dark"] .lp-submit {
          background: #E6EDF3; color: #0C1018;
        }
        [data-theme="dark"] .lp-submit:hover:not(:disabled) { background: #FFFFFF; }
        [data-theme="dark"] .lp-error {
          background: #1A0808; border-color: #3D1515; color: #FF6B6B;
        }
        [data-theme="dark"] .lp-form-eyebrow { color: #2EA043; }
      `}</style>

    </div>
  )
}
