/**
 * LoginPage.jsx
 * ─────────────
 * Login screen for VitalWatch.
 *
 * Aesthetic direction: Clinical precision
 * - Dark left panel with system identity + animated vital line
 * - Clean white right panel with the login form
 * - Sharp geometry, monospaced type accents, instrument-panel feel
 * - No gradients, no purple, no consumer-app softness
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
  const { login }    = useAuth()
  const navigate     = useNavigate()

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

      {/* ── LEFT PANEL ─────────────────────────────── */}
      <div className="lp-left">

        {/* Animated ECG line — pure CSS SVG */}
        <div className="lp-ecg-wrap" aria-hidden="true">
          <svg className="lp-ecg" viewBox="0 0 600 80" preserveAspectRatio="none">
            <polyline
              className="lp-ecg-line"
              points="
                0,40 60,40 70,40 80,15 90,65 100,40
                160,40 170,40 180,15 190,65 200,40
                260,40 270,40 280,15 290,65 300,40
                360,40 370,40 380,15 390,65 400,40
                460,40 470,40 480,15 490,65 500,40
                560,40 600,40
              "
            />
          </svg>
        </div>

        {/* System identity */}
        <div className="lp-identity">
          <div className="lp-wordmark">
            <span className="lp-vital">Vital</span>
            <span className="lp-watch">Watch</span>
          </div>
          <p className="lp-tagline">
            Post-Surgery Patient Monitoring System
          </p>
        </div>

        {/* Status indicators */}
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
            <span className="lp-status-label">MQTT Connected</span>
          </div>
        </div>

        {/* Footer */}
        <p className="lp-left-footer">
          Authorised personnel only.<br />
          All access is logged and monitored.
        </p>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────── */}
      <div className="lp-right">
        <div className="lp-form-wrap">

          <header className="lp-form-header">
            <div className="lp-form-eyebrow">Clinical Access Portal</div>
            <h1 className="lp-form-title">Sign In</h1>
            <p className="lp-form-subtitle">
              Enter your credentials to access the dashboard
            </p>
          </header>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>

            <div className="lp-field">
              <label className="lp-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                className={`lp-input ${error ? 'lp-input-error' : ''}`}
                type="email"
                autoComplete="email"
                placeholder="you@hospital.org"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
                disabled={loading}
              />
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className={`lp-input ${error ? 'lp-input-error' : ''}`}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="lp-error" role="alert">
                <span className="lp-error-icon">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="lp-submit"
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

      {/* ── INLINE STYLES ──────────────────────────── */}
      <style>{`
        /* ─── SHELL ──────────────────────────────── */
        .lp-shell {
          display: flex;
          min-height: 100vh;
          background: #0C0E12;
          font-family: 'Sora', 'Helvetica Neue', sans-serif;
        }

        /* ─── LEFT PANEL ─────────────────────────── */
        .lp-left {
          width: 42%;
          background: #0C0E12;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px 52px;
          position: relative;
          overflow: hidden;
          border-right: 1px solid #111827;
          flex-shrink: 0;
        }

        /* Cross-hair corner marks */
        .lp-left::before,
        .lp-left::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .lp-left::before {
          top: 24px; left: 24px;
          border-top: 1px solid var(--stable-pure);
          border-left: 1px solid var(--stable-pure);
        }
        .lp-left::after {
          bottom: 24px; right: 24px;
          border-bottom: 1px solid var(--stable-pure);
          border-right: 1px solid var(--stable-pure);
        }

        /* ─── ECG LINE ───────────────────────────── */
        .lp-ecg-wrap {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 80px;
          opacity: 0.18;
          pointer-events: none;
        }
        .lp-ecg {
          width: 100%;
          height: 100%;
        }
        .lp-ecg-line {
          fill: none;
          stroke: var(--stable-pure);
          stroke-width: 1.5;
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: lp-ecg-draw 3s ease-out forwards,
                     lp-ecg-loop 6s ease-in-out 3s infinite;
        }
        @keyframes lp-ecg-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes lp-ecg-loop {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }

        /* ─── IDENTITY ───────────────────────────── */
        .lp-identity {
          margin-top: auto;
          margin-bottom: auto;
        }
        .lp-wordmark {
          font-size: 52px;
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1;
          margin-bottom: 16px;
        }
        .lp-vital { color: #FFFFFF; }
        .lp-watch { color: var(--stable-pure); }

        .lp-tagline {
          font-size: 13px;
          color: #6B7A99;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          line-height: 1.6;
          max-width: 280px;
        }

        /* ─── STATUS GRID ────────────────────────── */
        .lp-status-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 40px;
        }
        .lp-status-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--stable-pure);
          flex-shrink: 0;
        }
        .lp-dot-static {
          /* solid green dot — no animation */
          opacity: 0.85;
        }
        .lp-dot-pulse {
          animation: lp-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0.6); }
          50%      { box-shadow: 0 0 0 5px rgba(46,204,113,0); }
        }
        .lp-status-label {
          font-size: 12px;
          color: #8A9BBF;
          letter-spacing: 0.4px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
        }

        /* ─── LEFT FOOTER ────────────────────────── */
        .lp-left-footer {
          font-size: 11px;
          color: #3D4F6E;
          line-height: 1.7;
          letter-spacing: 0.2px;
        }

        /* ─── RIGHT PANEL ────────────────────────── */
        .lp-right {
          flex: 1;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        /* ─── FORM HEADER ────────────────────────── */
        .lp-form-header {
          margin-bottom: 40px;
        }
        .lp-form-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--stable-pure);
          margin-bottom: 12px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
        }
        .lp-form-title {
          font-size: 34px;
          font-weight: 700;
          color: #0C0E12;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin-bottom: 10px;
        }
        .lp-form-subtitle {
          font-size: 14px;
          color: #6B7A99;
          line-height: 1.5;
        }

        /* ─── FORM FIELDS ────────────────────────── */
        .lp-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 32px;
        }

        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lp-label {
          font-size: 12px;
          font-weight: 600;
          color: #3D4F6E;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .lp-input {
          padding: 14px 16px;
          border: 1.5px solid var(--border-subtle);
          border-radius: 6px;
          font-size: 15px;
          color: #0C0E12;
          background: var(--bg-secondary);
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          outline: none;
          width: 100%;
          font-family: inherit;
        }
        .lp-input::placeholder { color: #B0BAD0; }
        .lp-input:focus {
          border-color: var(--stable-pure);
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(46,204,113,0.12);
        }
        .lp-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .lp-input-error {
          border-color: var(--critical-pure);
        }
        .lp-input-error:focus {
          border-color: var(--critical-pure);
          box-shadow: 0 0 0 3px rgba(198,40,40,0.10);
        }

        /* ─── ERROR ──────────────────────────────── */
        .lp-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: var(--critical-surface);
          border: 1px solid var(--critical-border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--critical-pure);
          animation: lp-shake 0.35s ease;
        }
        @keyframes lp-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-4px); }
          40%      { transform: translateX(4px); }
          60%      { transform: translateX(-3px); }
          80%      { transform: translateX(3px); }
        }
        .lp-error-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--critical-pure);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* ─── SUBMIT BUTTON ──────────────────────── */
        .lp-submit {
          width: 100%;
          padding: 15px;
          background: #0C0E12;
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: inherit;
          margin-top: 4px;
        }
        .lp-submit:hover:not(:disabled) {
          background: #111827;
        }
        .lp-submit:active:not(:disabled) {
          transform: scale(0.99);
        }
        .lp-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .lp-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: lp-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes lp-spin {
          to { transform: rotate(360deg); }
        }

        /* ─── FORM FOOTER ────────────────────────── */
        .lp-form-footer {
          font-size: 12px;
          color: #9BAABB;
          line-height: 1.7;
          text-align: center;
        }

        /* ─── RESPONSIVE ─────────────────────────── */
        @media (max-width: 768px) {
          .lp-shell    { flex-direction: column; }
          .lp-left     { width: 100%; padding: 40px 32px 32px; min-height: 220px; }
          .lp-identity { margin: 0; }
          .lp-wordmark { font-size: 36px; }
          .lp-status-grid { display: none; }
          .lp-right    { padding: 32px 24px; align-items: flex-start; }
        }

        /* ─── DARK MODE ─────────────────────────── */
        [data-theme="dark"] .lp-right {
          background: #0C1018;
        }
        [data-theme="dark"] .lp-form-title {
          color: #E6EDF3;
        }
        [data-theme="dark"] .lp-form-subtitle,
        [data-theme="dark"] .lp-form-footer {
          color: #6E7681;
        }
        [data-theme="dark"] .lp-label {
          color: #8B949E;
        }
        [data-theme="dark"] .lp-input {
          background: #161B22;
          border-color: #21262D;
          color: #E6EDF3;
        }
        [data-theme="dark"] .lp-input:focus {
          border-color: #2EA043;
          background: #161B22;
          box-shadow: 0 0 0 3px rgba(46,160,67,0.15);
        }
        [data-theme="dark"] .lp-submit {
          background: #E6EDF3;
          color: #0C1018;
        }
        [data-theme="dark"] .lp-submit:hover:not(:disabled) {
          background: #FFFFFF;
        }
        [data-theme="dark"] .lp-form-eyebrow {
          color: var(--stable-pure, #2EA043);
        }
        [data-theme="dark"] .lp-error {
          background: #1A0808;
          border-color: #3D1515;
          color: #FF6B6B;
        }
        [data-theme="dark"] .lp-left-footer {
          color: #2E4458;
        }
        [data-theme="dark"] .lp-error {
          background: #1A0808;
          border-color: #3D1515;
        }
      `}</style>

      {/* Google font for DM Sans + DM Mono */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
      />
    </div>
  )
}
