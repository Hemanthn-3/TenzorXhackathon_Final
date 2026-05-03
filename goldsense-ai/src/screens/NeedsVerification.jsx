import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoldSense }  from '../context/GoldSenseContext';
import { callGemini }    from '../utils/geminiClient';
import DisclaimerBanner  from '../components/DisclaimerBanner';

export default function NeedsVerification() {
  const navigate = useNavigate();
  const { fusionResult, fraudResult, resetState, isDemoMode } = useGoldSense();

  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      setAiLoading(true);
      const reply = await callGemini({
        systemPrompt: 'You are GoldSense AI, a gold loan pre-qualification assistant.',
        userText: `Given these flags: ${JSON.stringify(fraudResult?.flags ?? [])} and fusion score ${fusionResult?.overallScore ?? 0}, write 2 sentences explaining to the customer why branch verification is needed. Be reassuring and clear.`,
        maxTokens: 200,
      });
      setAiText(reply || 'Our system detected some signals that require expert verification to ensure accurate valuation. This is a routine step for items with complex characteristics.');
      setAiLoading(false);
    })();
  }, []); // eslint-disable-line

  const score = fusionResult?.overallScore ?? 0;
  const pct   = Math.round(score * 100);

  return (
    <div className="screen" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {isDemoMode && (
        <div style={{
          background: 'rgba(232,168,76,0.08)',
          border: '1px solid rgba(232,168,76,0.3)',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '16px',
          fontSize: '11px',
          color: '#E8A84C',
          textAlign: 'center',
          letterSpacing: '1px'
        }}>
          DEMO MODE — Results are simulated for presentation purposes
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ textAlign:'center', marginBottom: 32 }}>
        <div style={s.iconBadge}>🔍</div>
        <h2 style={s.title}>Branch Verification Required</h2>
        <p style={s.sub}>Our AI flagged items that need expert review</p>
      </div>

      <div className={isMobile ? "" : "two-column"}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── Fusion Score Bar ── */}
          <div className="card" style={s.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p style={s.label}>AI Confidence Score</p>
              <span style={{ fontSize:24, fontWeight:700, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif" }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:'var(--bg-primary)', borderRadius:4, overflow:'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                height:'100%', width:`${pct}%`, borderRadius:4,
                background:'linear-gradient(90deg,var(--accent-gold-dim),var(--accent-gold))',
                transition:'width 800ms ease',
              }}/>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif", marginTop:8 }}>
              Score below threshold for automatic pre-qualification
            </p>
          </div>

          {/* ── Fraud Flags ── */}
          {fraudResult?.flags?.length > 0 && (
            <div className="card" style={s.card}>
              <p style={s.sectionHead}>Signals Requiring Review</p>
              {fraudResult.flags.map((f, i) => (
                <div key={i} style={s.flagRow}>
                  <span style={{
                    ...s.severityBadge,
                    background: f.severity === 'HIGH' ? 'rgba(232,92,74,0.15)' : 'rgba(232,168,76,0.15)',
                    color:       f.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)',
                    borderColor: f.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)',
                  }}>{f.severity}</span>
                  <p style={s.flagReason}>{f.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: isMobile ? 24 : 0 }}>
          {/* ── AI Explanation ── */}
          <div className="card" style={{ ...s.aiCard, borderLeft: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <p style={{ fontSize:12, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif",
                letterSpacing:'1.5px', textTransform:'uppercase', fontWeight: 700 }}>AI Summary</p>
            </div>
            {aiLoading ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding: '12px 0' }}>
                <span style={{ color:'var(--accent-gold)', animation:'spin 1s linear infinite', display:'inline-block', fontSize: 20 }}>⟳</span>
                <span style={{ fontSize:14, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif" }}>Generating explanation…</span>
              </div>
            ) : (
              <p style={{ fontSize:15, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif",
                lineHeight:1.6 }}>{aiText}</p>
            )}
          </div>

          {/* ── Info message ── */}
          <div className="card" style={{ ...s.card, background:'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize:15, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif", lineHeight:1.7 }}>
              Our system needs a branch expert to verify your jewelry.
              This is normal for items with complex characteristics.
            </p>
          </div>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DisclaimerBanner />

            <button id="btn-book-branch-verify" className="gold-gradient" style={s.ctaBtn}
              onClick={() => alert('Branch booking flow coming soon!')}>
              Book Branch Visit
            </button>

            <button id="btn-new-assessment-nv" style={s.linkBtn}
              onClick={() => { resetState(); navigate('/'); }}>
              Start New Assessment
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
  iconBadge: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(26,26,26,0.8)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
  title:     { fontFamily:"'Inter', sans-serif", fontSize:28, color:'var(--text-primary)', textAlign:'center' },
  sub:       { fontSize:14, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", textAlign:'center', marginTop:8 },
  card:      { padding:24, display:'flex', flexDirection:'column', gap:12 },
  label:     { fontSize:14, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", fontWeight:600 },
  sectionHead:{ fontFamily:"'Inter', sans-serif", fontSize:18, color:'var(--text-primary)' },
  flagRow:   { display:'flex', alignItems:'flex-start', gap:12, paddingTop:12, borderTop:'1px solid var(--border)', marginTop: 8 },
  severityBadge:{ fontSize:11, fontWeight:700, fontFamily:"'Inter', sans-serif", letterSpacing:'0.5px',
    border:'1px solid', borderRadius:6, padding:'4px 10px', flexShrink:0, marginTop:2 },
  flagReason:{ fontSize:14, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", lineHeight:1.6 },
  aiCard:    { padding:24 },
  ctaBtn:    { width:'100%', color:'#000', border:'none', borderRadius:16,
    padding:18, fontSize:16, fontWeight:700, fontFamily:"'Inter', sans-serif", cursor:'pointer',
    boxShadow:'0 8px 24px rgba(201,168,76,0.2)' },
  linkBtn:   { background:'transparent', border:'none', color:'var(--text-muted)', fontSize:14,
    fontFamily:"'Inter', sans-serif", cursor:'pointer', textDecoration:'underline', textAlign:'center', padding:'8px 0', transition: 'color 0.2s' },
};
