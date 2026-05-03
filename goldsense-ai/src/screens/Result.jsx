import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoldSense } from '../context/GoldSenseContext';
import { callGemini }   from '../utils/geminiClient';
import SignalBreakdown  from '../components/SignalBreakdown';
import DisclaimerBanner from '../components/DisclaimerBanner';
import GoldPriceTicker  from '../components/GoldPriceTicker';

const fmt = n => Number(n).toLocaleString('en-IN');

export default function Result() {
  const navigate = useNavigate();
  const { 
    fusionResult, fraudResult, loanOffer, ocrResult, acousticResult, 
    surfaceResult, weightEstimate, userInputs, capturedImages, setField, resetState, isDemoMode 
  } = useGoldSense();

  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [timestamp] = useState(new Date().toLocaleString());

  useEffect(() => {
    capturedImages?.forEach(img => { if (img.objectURL) URL.revokeObjectURL(img.objectURL); });
    setField('capturedImages', []);
  }, []); // eslint-disable-line

  useEffect(() => {
    (async () => {
      setAiLoading(true);
      const reply = await callGemini({
        systemPrompt: 'You are GoldSense AI, a gold loan pre-qualification assistant.',
        userText: `Given these analysis results: ${JSON.stringify({ fusionResult, fraudResult, loanOffer, ocrResult, acousticResult })}. Write a 2-sentence plain-language explanation for the customer explaining why they received this assessment. Be specific about which signals were strongest. Do not mention technical terms like FFT or ResNet.`,
        maxTokens: 200,
      });
      setAiText(reply || 'Our AI analysed multiple signals from your jewelry including visual surface quality, hallmark detection, and acoustic characteristics to generate this estimate.');
      setAiLoading(false);
    })();
  }, []); // eslint-disable-line

  if (!fusionResult || !loanOffer) {
    return (
      <div className="screen" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <p style={{ color:'var(--text-muted)', fontFamily:"'Inter', sans-serif" }}>No results available. <button style={s.linkBtn} onClick={() => navigate('/')}>Start over</button></p>
      </div>
    );
  }

  // Safe defaults — routing
  const routing = fusionResult?.routing || 'LIKELY_ELIGIBLE';
  const isPreQual = routing === 'PRE_QUALIFIED';
  const routingLabel = isPreQual ? '✓ Pre-Qualified' : '~ Likely Eligible';
  const routingColor = isPreQual ? 'var(--success)' : 'var(--warning)';
  const routingBg    = isPreQual ? 'rgba(76,175,122,0.15)' : 'rgba(232,168,76,0.15)';

  const score    = fusionResult?.overallScore ?? 0;
  const pct      = Math.round(score * 100);
  const riskClear = fraudResult?.overallRisk === 'CLEAR';

  // Safe defaults — loan offer
  const ll           = loanOffer?.loanLow        ?? 0;
  const lh           = loanOffer?.loanHigh       ?? 0;
  const cl           = loanOffer?.collateralLow  ?? 0;
  const ch           = loanOffer?.collateralHigh ?? 0;
  const rate         = loanOffer?.ratePerGram    ?? 0;
  const rate24k      = loanOffer?.rate24k        ?? 0;
  const rate22k      = loanOffer?.rate22k        ?? 0;
  const rate18k      = loanOffer?.rate18k        ?? 0;
  const source       = loanOffer?.rateSource     ?? 'fallback';
  const provider     = loanOffer?.rateProvider   ?? 'MCX reference rate';
  const lKarat       = loanOffer?.karat          ?? '22K';
  const weightMid    = loanOffer?.weightMid      ?? 0;
  const ltvReference = loanOffer?.ltvReference   ?? 'RBI Circular RBI/2022-23/92';

  const wl = weightEstimate?.weightLow  ?? 0;
  const wh = weightEstimate?.weightHigh ?? 0;

  // Karat rate table rows
  const karatRows = [
    { karat: '24K', purity: '99.9%', rate: rate24k },
    { karat: '22K', purity: '91.6%', rate: rate22k },
    { karat: '18K', purity: '75.0%', rate: rate18k },
  ];

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
      <style>
        {`
          @keyframes shimmerBorder {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .hero-card {
            position: relative;
            background: var(--bg-card);
            border-radius: 20px;
            padding: 3px;
            overflow: hidden;
          }
          .hero-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, var(--accent-gold-dim), var(--accent-gold-light), var(--accent-gold-dim), var(--accent-gold));
            background-size: 300% 300%;
            animation: shimmerBorder 4s linear infinite;
            z-index: 0;
          }
          .hero-card-inner {
            position: relative;
            background: rgba(26,26,26,0.95);
            backdrop-filter: blur(12px);
            border-radius: 17px;
            padding: 32px;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .jewelry-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          @media (min-width: 768px) {
            .jewelry-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          .skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmerLoading 1.5s infinite;
            border-radius: 4px;
            height: 14px;
            margin-bottom: 12px;
          }
          @keyframes shimmerLoading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .score-dial {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: conic-gradient(var(--accent-gold) ${pct * 3.6}deg, var(--bg-card) 0deg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 4px 20px rgba(201,168,76,0.2);
          }
          .score-dial-inner {
            width: 124px;
            height: 124px;
            border-radius: 50%;
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          @media print {
            body { background: #fff !important; color: #000 !important; }
            .screen { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
            button { display: none !important; }
            * { color: #000 !important; text-shadow: none !important; }
            .hero-card::before { display: none !important; }
            .hero-card-inner { background: #fff !important; border: 1px solid #000 !important; }
            .score-dial-inner { background: #fff !important; }
          }
        `}
      </style>

      {/* ── HERO SECTION ── */}
      <div style={{
        border: '1px solid rgba(201,168,76,0.4)',
        background: 'linear-gradient(180deg, rgba(201,168,76,0.06) 0%, transparent 100%)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>

        {/* Live gold ticker */}
        <GoldPriceTicker compact={true} />

        {/* ── 1. TOP ROW — routing badge + rate source badge ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{
            background: routingBg, color: routingColor,
            border: `1px solid ${routingColor}`,
            borderRadius: 999, padding: '6px 16px',
            fontSize: 13, fontWeight: 700,
            fontFamily: "'Inter', sans-serif", letterSpacing: '1px'
          }}>
            {routingLabel}
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: source === 'live' ? 'rgba(76,175,122,0.1)' : 'rgba(232,168,76,0.1)',
            border: `1px solid ${source === 'live' ? 'rgba(76,175,122,0.3)' : 'rgba(232,168,76,0.3)'}`,
            borderRadius: 999, padding: '5px 12px',
            fontSize: 11, fontFamily: "'Inter', sans-serif"
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: source === 'live' ? '#4CAF7A' : '#E8A84C'
            }} />
            <span style={{ color: source === 'live' ? '#4CAF7A' : '#E8A84C', fontWeight: 600 }}>
              {source === 'live' ? `Live rate · ${provider}` : 'MCX reference rate'}
            </span>
          </span>
        </div>

        {/* ── 2. MAIN HEADING ── */}
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(22px, 4vw, 36px)',
            color: 'var(--text-primary)',
            margin: 0, fontWeight: 700
          }}>
            Your Estimated Gold Loan
          </h2>
        </div>

        {/* ── 3. LARGE LOAN RANGE ── */}
        <div>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(28px, 6vw, 52px)',
            fontWeight: 700, color: 'var(--accent-gold)',
            lineHeight: 1.15, margin: 0
          }}>
            ₹{fmt(ll)} – ₹{fmt(lh)}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", margin: '4px 0 0', letterSpacing: '0.5px' }}>
            ELIGIBLE LOAN AMOUNT
          </p>
        </div>

        {/* ── 4. FORMULA BREAKDOWN CARD ── */}
        <div style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
            color: 'var(--accent-gold)', textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif", margin: '0 0 14px'
          }}>
            How this was calculated
          </p>

          {/* Row 1 — Gold rate */}
          <div style={hRow}>
            <div style={hLeft}>
              <span style={hLabel}>Gold rate ({lKarat})</span>
            </div>
            <div style={hRight}>
              <span style={hValue}>₹{fmt(rate)}/gram</span>
              <span style={hBadge}>{provider}</span>
            </div>
          </div>
          <div style={hDivider} />

          {/* Row 2 — Weight estimate */}
          <div style={hRow}>
            <div style={hLeft}>
              <span style={hLabel}>Estimated weight</span>
              <span style={hNote}>via geometric estimation</span>
            </div>
            <div style={hRight}>
              <span style={hValue}>{weightMid}g</span>
              <span style={hMuted}>range: {wl}–{wh}g</span>
            </div>
          </div>
          <div style={hDivider} />

          {/* Row 3 — Collateral value */}
          <div style={hRow}>
            <div style={hLeft}>
              <span style={hLabel}>Collateral value</span>
              <span style={hNote}>weight × purity-adjusted rate</span>
            </div>
            <div style={hRight}>
              <span style={hValue}>₹{fmt(cl)} – ₹{fmt(ch)}</span>
            </div>
          </div>
          <div style={hDivider} />

          {/* Row 4 — Eligible loan (highlighted) */}
          <div style={{
            ...hRow,
            background: 'rgba(201,168,76,0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
            margin: '0 -6px'
          }}>
            <div style={hLeft}>
              <span style={{ ...hLabel, color: 'var(--accent-gold)' }}>Eligible loan (75% LTV)</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                Per {ltvReference}
              </span>
            </div>
            <div style={hRight}>
              <span style={{ ...hValue, color: 'var(--accent-gold)', fontSize: 17 }}>
                ₹{fmt(ll)} – ₹{fmt(lh)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 5. KARAT RATE TABLE ── */}
        <div>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.5px', margin: '0 0 10px'
          }}>
            Today's rates used for this assessment
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(0,0,0,0.3)', padding: '8px 14px' }}>
              {['Karat', 'Purity', 'Rate / gram'].map(h => (
                <span key={h} style={{ fontSize: 10, color: 'var(--accent-gold)', fontFamily: "'Inter', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</span>
              ))}
            </div>
            {karatRows.map(({ karat, purity, rate: r }, i) => {
              const isActive = karat === lKarat;
              return (
                <div key={karat} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '9px 14px',
                  borderLeft: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
                  background: isActive
                    ? 'rgba(201,168,76,0.08)'
                    : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderTop: '1px solid rgba(201,168,76,0.08)'
                }}>
                  <span style={{ fontSize: 13, color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)', fontFamily: "'Inter', sans-serif", fontWeight: isActive ? 700 : 500 }}>{karat}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>{purity}</span>
                  <span style={{ fontSize: 13, color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)', fontFamily: "'Inter', sans-serif", fontWeight: isActive ? 700 : 400 }}>₹{fmt(r)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 6. RESPONSIBLE LENDING NOTE ── */}
        <div style={{
          background: 'rgba(232,168,76,0.06)',
          border: '1px solid rgba(232,168,76,0.2)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <p style={{ fontSize: 12, color: '#C9A07A', fontFamily: "'Inter', sans-serif", lineHeight: 1.6, margin: 0 }}>
            * Based on maximum LTV permitted by RBI for gold loans.
            Final amount subject to branch verification and KYC.
          </p>
        </div>

      </div>

      <div className="two-column">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ── JEWELRY SUMMARY CARD ── */}
          <div className="card">
            <h3 style={s.sectionHead}>Jewelry Summary</h3>
            <div className="jewelry-grid" style={{ marginTop: 20 }}>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Detected Purity</span>
                <span style={s.summaryValue}>{ocrResult?.karat ?? 'Not detected'}</span>
              </div>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Declared Purity</span>
                <span style={s.summaryValue}>{userInputs?.declaredKarat || 'Not provided'}</span>
              </div>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Jewelry Type</span>
                <span style={s.summaryValue}>{userInputs?.jewelryType || 'Unknown'}</span>
              </div>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Acoustic Match</span>
                <span style={s.summaryValue}>
                  {acousticResult?.material ?? 'Test skipped'} 
                  {acousticResult ? ` (${Math.round((acousticResult?.matchProbability ?? 0) * 100)}% confidence)` : ''}
                </span>
              </div>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Surface Condition</span>
                <span style={s.summaryValue}>{surfaceResult?.wearCategory ?? 'Unknown'}</span>
              </div>
              <div style={s.summaryItem}>
                <span style={s.summaryLabel}>Structure</span>
                <span style={s.summaryValue}>{surfaceResult?.structureType ?? 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* ── FRAUD CHECK SECTION ── */}
          <div className="card" style={{
            background: riskClear ? 'rgba(76,175,122,0.05)' : 'rgba(232,168,76,0.05)',
            borderColor: riskClear ? 'var(--success)' : 'var(--warning)',
          }}>
            <h3 style={s.sectionHead}>Fraud & Consistency Checks</h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif", margin: '12px 0 16px' }}>
              4 checks performed: OCR-Acoustic consistency, Visual-Acoustic, Weight sanity, Image consistency
            </p>
            
            {riskClear ? (
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:22 }}>✅</span>
                <p style={{ fontSize:16, fontWeight:600, color:'var(--success)', fontFamily:"'Inter', sans-serif" }}>
                  ✓ No fraud indicators detected across all checks
                </p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {fraudResult?.flags?.map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20 }}>⚠️</span>
                    <p style={{ fontSize:15, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif", lineHeight: 1.5 }}>
                      {f.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ── FUSION SCORE SECTION ── */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{...s.sectionHead, textAlign: 'center', marginBottom: 24}}>AI Confidence Breakdown</h3>
            
            <div className="score-dial">
              <div className="score-dial-inner">
                <span style={{ fontFamily:"'Inter', sans-serif", fontSize:36, fontWeight:700, color:'var(--accent-gold)' }}>
                  {pct}%
                </span>
              </div>
            </div>
            
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
              <SignalBreakdown signals={fusionResult?.signalBreakdown ?? []} />
            </div>
          </div>

          {/* ── AI EXPLAINABILITY SECTION ── */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)', fontStyle: 'italic' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <p style={{ fontSize:13, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif",
                letterSpacing:'1.5px', textTransform:'uppercase', fontWeight: 700, margin: 0 }}>AI Summary</p>
            </div>
            {aiLoading ? (
              <div style={{ width: '100%', marginTop: 8 }}>
                <div className="skeleton" style={{ width: '100%' }}></div>
                <div className="skeleton" style={{ width: '90%' }}></div>
                <div className="skeleton" style={{ width: '60%' }}></div>
              </div>
            ) : (
              <>
                <p style={{ fontSize:15, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif",
                  lineHeight:1.6, margin: 0 }}>{aiText}</p>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>Analysis powered by:</span>
                  {['MobileNet', 'CLIP', 'TrOCR', 'Gemini 1.5 Flash'].map(model => (
                    <span key={model} style={{ border: '1px solid rgba(125,211,252,0.3)', padding: '2px 6px', borderRadius: 4, background: 'rgba(125,211,252,0.05)', color: 'var(--accent-gold)' }}>
                      {model}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── RESPONSIBLE AI FOOTER ── */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <DisclaimerBanner />
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", margin: 0 }}>
            Assessment Timestamp: {timestamp}
          </p>
          <span style={{ fontSize: 13, color: 'var(--success)', fontFamily: "'Inter', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            Images discarded <span style={{ fontSize: 16 }}>✓</span>
          </span>
        </div>

        {/* ── CTAs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 450, margin: '20px auto 0', width: '100%' }}>
          <button className="gold-gradient" style={s.primaryBtn} onClick={() => alert('Branch booking flow coming soon!')}>
            Book Branch Visit
          </button>
          
          <button style={s.secondaryBtn} onClick={() => window.print()}>
            Download Summary
          </button>
          
          <button style={s.linkBtn} onClick={() => { resetState(); navigate('/'); }}>
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionHead: { fontFamily:"'Inter', sans-serif", fontSize:22, color:'var(--text-primary)', margin: 0 },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)' },
  summaryLabel: { fontSize:11, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 },
  summaryValue: { fontSize:15, color:'#fff', fontFamily:"'Inter', sans-serif", fontWeight: 500, textTransform: 'capitalize' },
  primaryBtn:  { width:'100%', color:'#000', border:'none', borderRadius:16, padding:20, fontSize:18, fontWeight:700, fontFamily:"'Inter', sans-serif", cursor:'pointer', boxShadow:'0 8px 30px rgba(201,168,76,0.25)', transition:'all 200ms ease' },
  secondaryBtn:{ width:'100%', background:'transparent', color:'var(--accent-gold)', border:'2px solid var(--accent-gold)', borderRadius:16, padding:18, fontSize:17, fontWeight:700, fontFamily:"'Inter', sans-serif", cursor:'pointer', transition:'all 200ms ease', boxShadow:'0 4px 15px rgba(0,0,0,0.1)' },
  linkBtn:     { background:'transparent', border:'none', color:'var(--text-muted)', fontSize:15, fontFamily:"'Inter', sans-serif", cursor:'pointer', textDecoration:'underline', textAlign:'center', padding:'12px 0', transition: 'color 0.2s' },
};

// ── Formula breakdown row helpers ─────────────────────────────────────────────
const hRow     = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 0' };
const hLeft    = { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 };
const hRight   = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 };
const hLabel   = { fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" };
const hValue   = { fontSize: 15, color: '#F5F0E8', fontFamily: "'Inter', sans-serif", fontWeight: 600 };
const hNote    = { fontSize: 11, color: '#4A4035', fontFamily: "'Inter', sans-serif" };
const hMuted   = { fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" };
const hBadge   = { fontSize: 10, color: 'var(--accent-gold)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, padding: '2px 6px', fontFamily: "'Inter', sans-serif" };
const hDivider = { height: '1px', background: 'rgba(201,168,76,0.1)', margin: '2px 0' };

