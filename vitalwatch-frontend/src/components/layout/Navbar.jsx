import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation }    from 'react-router-dom'
import { useAuth }    from '../../hooks/useAuth.jsx'
import { useTheme, useColors } from '../../hooks/useTheme.jsx'

export default function Navbar({ alertCount = 0, onBellClick }) {
  const { user, logout } = useAuth()
  const { toggle, isDark } = useTheme()
  const C                = useColors()
  const navigate         = useNavigate()
  const location         = useLocation()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [bellShake, setBellShake]   = useState(false)
  const prevCount  = useRef(alertCount)
  const menuRef    = useRef(null)

  useEffect(() => {
    if (alertCount > prevCount.current) { setBellShake(true); setTimeout(() => setBellShake(false), 600) }
    prevCount.current = alertCount
  }, [alertCount])

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleLogout() { setMenuOpen(false); await logout(); navigate('/login', { replace:true }) }

  const isWard   = location.pathname.startsWith('/ward') || location.pathname.startsWith('/patient')
  const isCancer = location.pathname.startsWith('/cancer')
  const canWard  = user && ['nurse','doctor'].includes(user.role)
  const canCancer= user && ['radiologist','oncologist'].includes(user.role)
  const ini      = (n='') => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  const roleLabel= { nurse:'Nurse', doctor:'Doctor', radiologist:'Radiologist', oncologist:'Oncologist', admin:'Admin' }

  const iBtn = { display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'8px', background:'transparent', border:`1px solid ${C.borderSubtle}`, color:C.textSecondary, cursor:'pointer', transition:'all 0.12s', flexShrink:0 }

  return (
    <>
      <nav style={{ height:'56px', background:C.navBg, borderBottom:`1px solid ${C.navBorder}`, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', padding:'0 24px', gap:0, flexShrink:0, zIndex:100 }}>

        {/* Brand */}
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:'17px', fontWeight:'800', letterSpacing:'-0.4px', marginRight:'28px', flexShrink:0 }}>
          <span style={{ color:C.textPrimary }}>Vital</span>
          <span style={{ color:C.stablePure }}>Watch</span>
        </div>

        {/* Nav */}
        <div style={{ display:'flex', gap:'2px', flex:1 }}>
          {canWard   && <NLink active={isWard}   C={C} onClick={()=>navigate('/ward')}>Ward Monitor</NLink>}
          {canCancer && <NLink active={isCancer} C={C} onClick={()=>navigate('/cancer')}>Cancer Detection</NLink>}
          {canWard   && !canCancer && <NLink disabled C={C}>Cancer Detection</NLink>}
          {canCancer && !canWard   && <NLink disabled C={C}>Ward Monitor</NLink>}
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto' }}>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={iBtn}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.bgSecondary; e.currentTarget.style.color=C.textPrimary }}
            onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.textSecondary }}
          >
            <span style={{ fontSize:'14px', lineHeight:1 }}>{isDark ? '☀' : '◑'}</span>
          </button>

          {/* Bell */}
          <button
            onClick={onBellClick}
            className={bellShake ? 'nb-shake' : ''}
            style={{ ...iBtn, position:'relative' }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.bgSecondary; e.currentTarget.style.color=C.textPrimary }}
            onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.textSecondary }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {alertCount > 0 && (
              <span style={{ position:'absolute', top:'4px', right:'4px', background:C.criticalPure, color:'#FFFFFF', fontSize:'9px', fontWeight:'700', fontFamily:"'IBM Plex Sans',sans-serif", minWidth:'15px', height:'15px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', border:`2px solid ${C.bgPrimary}`, lineHeight:1 }}>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* User avatar */}
          <div ref={menuRef} style={{ position:'relative' }}>
            <button
              onClick={()=>setMenuOpen(o=>!o)}
              style={{ display:'flex', alignItems:'center', gap:'9px', padding:'4px 10px 4px 6px', borderRadius:'8px', background:'transparent', border:`1px solid ${C.borderSubtle}`, cursor:'pointer', transition:'all 0.12s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background=C.bgSecondary; e.currentTarget.style.borderColor=C.borderDefault }}
              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=C.borderSubtle }}
            >
              <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:C.stableBg, border:`1.5px solid ${C.stableBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:C.stableText, fontFamily:"'IBM Plex Sans',sans-serif", flexShrink:0 }}>
                {ini(user?.name)}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'1px', textAlign:'left' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'13px', fontWeight:'600', color:C.textPrimary, lineHeight:1.2, whiteSpace:'nowrap' }}>{user?.name?.split(' ')[0]}</span>
                <span style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'10.5px', color:C.textMuted, lineHeight:1.2 }}>{roleLabel[user?.role]||user?.role}</span>
              </div>
            </button>

            {menuOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:C.bgPrimary, border:`1px solid ${C.borderDefault}`, borderRadius:'10px', boxShadow:C.shadowMd, minWidth:'192px', zIndex:200, overflow:'hidden', animation:'dropIn 0.15s ease' }}>
                <div style={{ padding:'13px 15px 11px', borderBottom:`1px solid ${C.borderSubtle}` }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:'13px', fontWeight:'600', color:C.textPrimary }}>{user?.name}</div>
                  <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:'11.5px', color:C.textMuted, marginTop:'2px' }}>{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{ display:'block', width:'100%', padding:'11px 15px', fontFamily:"'Inter',sans-serif", fontSize:'13px', fontWeight:'500', color:C.criticalText, background:'transparent', textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.criticalBg}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >Sign out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style>{`
        @keyframes nb-shake { 0%,100%{transform:rotate(0)} 15%{transform:rotate(-13deg)} 30%{transform:rotate(13deg)} 45%{transform:rotate(-8deg)} 60%{transform:rotate(8deg)} 75%{transform:rotate(-4deg)} 90%{transform:rotate(4deg)} }
        .nb-shake { animation: nb-shake 0.55s ease; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </>
  )
}

function NLink({ active, disabled, onClick, C, children }) {
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{ padding:'6px 13px', borderRadius:'7px', border:'none', fontFamily:"'Inter',sans-serif", fontSize:'13.5px', fontWeight:active?600:500, background:active?C.stableBg:'transparent', color:active?C.stableText:disabled?C.textFaint:C.textSecondary, cursor:disabled?'not-allowed':'pointer', transition:'all 0.12s' }}
      onMouseEnter={e=>{ if(!active&&!disabled) e.currentTarget.style.background=C.bgSecondary }}
      onMouseLeave={e=>{ if(!active&&!disabled) e.currentTarget.style.background='transparent' }}
    >{children}</button>
  )
}
