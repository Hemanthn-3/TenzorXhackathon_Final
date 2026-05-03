import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const STEPS = [
  { path: '/', label: 'Start' },
  { path: '/capture', label: 'Capture & Test' },
  { path: '/analysing', label: 'Analysing' },
  { path: '/result', label: 'Result' },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentIdx = STEPS.findIndex(s => s.path === location.pathname);
  const showBack = location.pathname !== '/' && location.pathname !== '/result' && location.pathname !== '/needs-verification';

  if (isMobile) {
    // Mobile: thin progress bar under a compact nav
    const pct = Math.max(0, (currentIdx / (STEPS.length - 1)) * 100);
    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', minHeight: 60 }}>
          {showBack && (
            <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 24, marginRight: 16 }}>
              ←
            </button>
          )}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: 'var(--accent-gold)' }}>GoldSense</span>
        </div>
        {location.pathname !== '/' && (
          <div style={{ height: 3, background: 'var(--border)', width: '100%' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-gold)', transition: 'width 0.3s ease' }} />
          </div>
        )}
      </div>
    );
  }

  // Desktop: persistent top nav
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(26,26,26,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', minHeight: 70 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {showBack && (
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 24 }}>
            ←
          </button>
        )}
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: 'var(--accent-gold)', fontWeight: 700 }}>GoldSense AI</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {STEPS.map((step, idx) => {
          let style = { padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif" };
          if (idx < currentIdx) {
            style = { ...style, background: 'rgba(76,175,122,0.1)', color: 'var(--success)', border: '1px solid var(--success)' }; // completed
          } else if (idx === currentIdx) {
            style = { ...style, background: 'rgba(201,168,76,0.15)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }; // active
          } else {
            style = { ...style, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }; // pending
          }
          return (
            <div key={idx} style={style}>
              {idx < currentIdx && '✓ '}{step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
