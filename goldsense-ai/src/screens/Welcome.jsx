import { useNavigate } from 'react-router-dom';
import { useGoldSense } from '../context/GoldSenseContext';
import GoldPriceTicker from '../components/GoldPriceTicker';

const steps = [
  { number: 1, text: 'Photograph your jewelry', icon: '📷' },
  { number: 2, text: 'AI analyses purity & authenticity', icon: '🧠' },
  { number: 3, text: 'Get your loan offer instantly', icon: '💰' }
];

export default function Welcome() {
  const navigate = useNavigate();
  const { resetState, setField, isDemoMode, demoScenario } = useGoldSense();
  const ctx = { demoScenario }; // for backward-compat with template strings below

  const handleBegin = () => {
    resetState();
    navigate('/capture');
  };

  return (
    <div className="screen" style={styles.root}>
      {/* ── Background Particles (CSS only) ── */}
      <div style={styles.particles} />
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes rotateGem {
            0% { transform: rotate(45deg) scale(1); }
            50% { transform: rotate(45deg) scale(1.05); box-shadow: 0 0 40px rgba(201,168,76,0.5); }
            100% { transform: rotate(45deg) scale(1); }
          }
          @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
          }
          @keyframes blinkCursor {
            from, to { border-color: transparent; }
            50% { border-color: var(--accent-gold); }
          }
          .typewriter-text {
            overflow: hidden;
            border-right: 2px solid var(--accent-gold);
            white-space: nowrap;
            margin: 0 auto;
            animation: typewriter 2s steps(40, end), blinkCursor 0.75s step-end infinite;
          }
          .step-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .step-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(201,168,76,0.15);
          }
          .cta-btn {
            transition: all 0.3s ease;
          }
          .cta-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(201,168,76,0.4);
          }
          .steps-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            width: 100%;
          }
          @media (min-width: 768px) {
            .steps-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        `}
      </style>

      {/* ── Hero Section ── */}
      <div style={styles.hero}>
        <div style={styles.gem}>
          <div style={styles.gemInner}>◈</div>
        </div>
        <h1 className="gold-text" style={{ textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>GoldSense AI</h1>
        <div style={{ display: 'inline-block' }}>
          <p className="typewriter-text" style={styles.subtitle}>Remote Gold Pre-Underwriting Engine</p>
        </div>
      </div>

      {/* ── Live Gold Price Ticker ── */}
      <GoldPriceTicker />

      {/* ── 3-Step Explainer ── */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={styles.stepsHeading}>How it works</p>
        <div className="steps-grid">
          {steps.map(({ number, text, icon }) => (
            <div key={number} className="card step-card" style={styles.stepCard}>
              <div style={styles.stepHeader}>
                <span style={styles.stepIcon}>{icon}</span>
                <div style={styles.stepNumberBadge}>
                  <span>{number}</span>
                </div>
              </div>
              <p style={styles.stepText}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust Indicators ── */}
      <div style={styles.trustRow}>
        {['BIS Certified', 'AI Powered', '256-bit Secure', 'RBI Compliant'].map(label => (
          <div key={label} style={styles.trustPill}>
            <span style={styles.trustDot}>●</span>
            <span style={styles.trustLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={styles.ctaWrapper}>
        {/* Demo Scenario Selector — always visible */}
        <div style={{
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
              {isDemoMode ? '🎟️ Demo Mode — Select Scenario' : '⚡ Live AI Mode'}
            </span>
            <button
              onClick={() => setField('isDemoMode', !isDemoMode)}
              style={{
                background: isDemoMode ? 'rgba(76,175,122,0.15)' : 'rgba(232,168,76,0.15)',
                border: `1px solid ${isDemoMode ? '#4CAF7A' : '#E8A84C'}`,
                color: isDemoMode ? '#4CAF7A' : '#E8A84C',
                padding: '3px 10px',
                borderRadius: '10px',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {isDemoMode ? 'DEMO' : 'LIVE'}
            </button>
          </div>

          {isDemoMode ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[
                { key: 'genuine', label: '✓ Genuine Gold', color: '#4CAF7A', bg: 'rgba(76,175,122,0.15)' },
                { key: 'ambiguous', label: '∼ Ambiguous', color: '#E8A84C', bg: 'rgba(232,168,76,0.15)' },
                { key: 'plated', label: '✕ Plated Metal', color: '#E85C4A', bg: 'rgba(232,92,74,0.15)' }
              ].map(({ key, label, color, bg }) => {
                const isActive = ctx.demoScenario === key;
                return (
                  <button
                    key={key}
                    onClick={() => setField('demoScenario', key)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: `1px solid ${color}`,
                      background: isActive ? bg : 'transparent',
                      color: color,
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: isActive ? `0 0 12px ${color}33` : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
              Will call Gemini AI to analyse your real jewelry.<br/>Internet connection required.
            </p>
          )}
        </div>

        <button
          id="btn-begin-assessment"
          className="gold-gradient cta-btn"
          style={styles.ctaButton}
          onClick={isDemoMode ? () => { resetState(); setField('isDemoMode', true); setField('demoScenario', ctx.demoScenario || 'genuine'); navigate('/analysing'); } : handleBegin}
        >
          {isDemoMode ? `Run Demo — ${(ctx.demoScenario || 'genuine').charAt(0).toUpperCase() + (ctx.demoScenario || 'genuine').slice(1)} Scenario` : 'Begin Live Assessment'}
        </button>
      </div>



      {/* ── Footer ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
        <p style={styles.footer}>
          Powered by Poonawalla Fincorp&nbsp;|&nbsp;Hackathon 2026
        </p>
        

      </div>
    </div>
  );
}

/* ─────────────────────────────── styles ──────────────────────────────────── */
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '60px',
    paddingBottom: '40px',
    gap: '40px',
    position: 'relative',
  },
  particles: {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    backgroundImage: 'radial-gradient(rgba(201,168,76,0.1) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    opacity: 0.5,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
    marginTop: '20px',
  },
  gem: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(26,26,26,0.8))',
    border: '2px solid var(--accent-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    borderRadius: '16px',
    animation: 'rotateGem 4s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(201,168,76,0.2)',
  },
  gemInner: {
    fontSize: '40px',
    color: 'var(--accent-gold-light)',
    transform: 'rotate(-45deg)', // Counter-rotate the icon
    textShadow: '0 0 10px rgba(201,168,76,0.8)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.5px',
    display: 'inline-block',
  },
  stepsHeading: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--accent-gold)',
    textAlign: 'center',
    marginBottom: '8px',
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    alignItems: 'flex-start',
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: '28px',
  },
  stepNumberBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(201,168,76,0.15)',
    border: '1px solid var(--accent-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-gold)',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  stepText: {
    fontSize: '16px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  trustRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '10px',
  },
  trustPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(26,26,26,0.6)',
    border: '1px solid var(--accent-gold-dim)',
    borderRadius: '24px',
    padding: '6px 14px',
    backdropFilter: 'blur(4px)',
  },
  trustDot: {
    fontSize: '8px',
    color: 'var(--success)',
  },
  trustLabel: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  ctaWrapper: {
    width: '100%',
    maxWidth: '400px',
    marginTop: '20px',
  },
  ctaButton: {
    width: '100%',
    color: '#000',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '16px',
    padding: '18px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    boxShadow: '0 8px 24px rgba(201,168,76,0.2)',
  },
  footer: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.5,
    marginTop: 'auto',
  },
};
