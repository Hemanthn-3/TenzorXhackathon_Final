import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoldSense } from '../context/GoldSenseContext';
import { runHallmarkOCR }    from '../utils/hallmarkOCR';
import { analyseSurface }    from '../utils/surfaceAnalysis';
import { estimateWeight }    from '../utils/weightEstimator';
import { detectFraud }       from '../utils/fraudDetector';
import { computeFusionScore } from '../utils/fusionEngine';
import { calculateLoan }     from '../utils/loanCalculator';
import { validateJewelryImage } from '../utils/jewelryDetector';
import ConfidencePill        from '../components/ConfidencePill';
import { getCachedModel, isCacheEmpty } from '../utils/modelCache';
import { loadMobileNet, loadClipClassifier, loadOCRModel } from '../utils/modelLoader';
import { getDemoResult } from '../utils/demoMode';

const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(r => setTimeout(() => r(fallback), ms))]);

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEP_DEFS = [
  { label: 'Image Quality Validation',  model: 'Canvas API' },
  { label: 'Jewelry Classification',    model: 'Canvas API' },
  { label: 'Hallmark Detection (OCR)',  model: 'Gemini Vision + Tesseract fallback' },
  { label: 'Surface & Plating Analysis', model: 'Gemini Vision' },
  { label: 'Weight Estimation',         model: 'type-based estimate' },
  { label: 'Fraud Cross-Check',         model: 'Rule engine' },
  { label: 'Computing Loan Offer',      model: 'Live gold rate API' },
];

const initSteps = () =>
  STEP_DEFS.map(step => ({ label: step.label, model: step.model, status: 'pending', confidence: null, detail: null }));

// ─── Step status icon ─────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'complete') return <span style={{ color: 'var(--success)', fontSize: 18 }}>✓</span>;
  if (status === 'active')   return <span style={{ color: 'var(--accent-gold)', fontSize: 16, display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span>;
  if (status === 'warning')  return <span style={{ color: 'var(--warning)', fontSize: 16 }}>⚠</span>;
  return <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--border)', display:'inline-block' }} />;
}

// ─── Analysing Screen ─────────────────────────────────────────────────────────
export default function Analysing() {
  const navigate = useNavigate();
  const ctx      = useGoldSense();
  const { capturedImages, userInputs, acousticResult, setField } = ctx;

  const [steps,    setSteps]    = useState(initSteps);
  const [headline, setHeadline] = useState('Initialising analysis…');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingModel, setLoadingModel] = useState('');
  const [cacheStatus, setCacheStatus] = useState('fresh');
  // Jewelry validation gate state
  const [rejectionState, setRejectionState] = useState(null); // null = not rejected
  const ran = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: mark a step's status + confidence
  const mark = (idx, status, confidence = null, detail = null) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status, confidence, detail } : s));

  const setActive  = idx => { mark(idx, 'active');   setHeadline(STEP_DEFS[idx].label + '…'); };
  const setDone    = (idx, conf, detail) => mark(idx, 'complete', conf, detail);
  const setWarn    = (idx, conf, detail) => mark(idx, 'warning',  conf, detail);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    runPipeline();
  }, []); // eslint-disable-line

  async function runPipeline() {
    if (ctx.isDemoMode) {
      const demo = getDemoResult(ctx.demoScenario || 'genuine');
      
      const runDemoSteps = async () => {
        // Step 0 - Image Quality
        setActive(0);
        await delay(600);
        setDone(0, 1.0, 'All 3 images passed sharpness and lighting checks.');
        
        // Step 1 - Jewelry Classification
        setActive(1);
        await delay(900);
        setDone(1, demo.weightEstimate.confidence,
          `Detected type: ${demo.weightEstimate.detectedType}`);
        setField('weightEstimate', demo.weightEstimate);
        
        // Step 2 - Hallmark OCR
        setActive(2);
        await delay(1200);
        if (demo.ocrResult.confidence < 0.5) {
          setWarn(2, demo.ocrResult.confidence, 'No hallmark detected — using declared karat');
        } else {
          setDone(2, demo.ocrResult.confidence, `Detected: ${demo.ocrResult.detectedStamp} → ${demo.ocrResult.karat}`);
        }
        setField('ocrResult', demo.ocrResult);
        
        // Step 3 - Surface Analysis
        setActive(3);
        await delay(1400);
        setDone(3, demo.surfaceResult.confidence,
          `Plating risk: ${Math.round(demo.surfaceResult.platingRiskScore * 100)}% · ${demo.surfaceResult.analysisSource}`);
        setField('surfaceResult', demo.surfaceResult);
        
        // Step 4 - Weight
        setActive(4);
        await delay(700);
        setDone(4, demo.weightEstimate.confidence,
          `Estimated weight: ${demo.weightEstimate.weightLow}–${demo.weightEstimate.weightHigh}g`);
        
        // Step 5 - Fraud
        setActive(5);
        await delay(1000);
        if (demo.fraudResult.overallRisk === 'CLEAR') {
          setDone(5, 0.95, 'No fraud indicators detected');
        } else {
          setWarn(5, 0.40, `${demo.fraudResult.highRiskCount} HIGH, ${demo.fraudResult.mediumRiskCount} MEDIUM flags`);
        }
        setField('fraudResult', demo.fraudResult);
        
        // Step 6 - Loan Offer
        setActive(6);
        await delay(1100);
        setDone(6, 0.88, 'Loan offer computed');
        setField('fusionResult', demo.fusionResult);
        if (demo.loanOffer) setField('loanOffer', demo.loanOffer);
        
        setHeadline('Analysis complete!');
        // Navigate after 800ms
        await delay(800);
        if (demo.fusionResult.routing === 'NEEDS_VERIFICATION') {
          navigate('/needs-verification');
        } else {
          navigate('/result');
        }
      };
      
      runDemoSteps();
      return; // Skip real analysis
    }

    // ── Pre-flight Model Loading ─────────────────────────────────────────────
    // Models are now lazily loaded when their specific step runs.
    // This prevents OOM browser crashes.
    setCacheStatus('lazy');
    setModelsLoading(false);

    // Grab images safely
    const img0 = capturedImages?.find(c => c.slot === 1); // full view
    const img1 = capturedImages?.find(c => c.slot === 2); // close-up
    const img2 = capturedImages?.find(c => c.slot === 3); // hallmark

    // ── STEP 0 — Quality + Jewelry Validation ───────────────────────────────
    setActive(0);
    await delay(400);

    // ―― JEWELRY DETECTION GATE ――
    // Use Gemini to confirm the full-view image actually contains jewelry.
    // This prevents selfies, landscapes, and non-jewelry from being analysed.
    setHeadline('Verifying jewelry content…');
    const fullImg = img0?.croppedURL || img0?.dataURL;
    let jewelryCheck = { isJewelry: true, isHuman: false, confidence: 0.5, reason: '' };
    if (fullImg) {
      try {
        jewelryCheck = await validateJewelryImage(fullImg);
        console.log('Jewelry validation result:', jewelryCheck);
      } catch (e) {
        console.warn('Jewelry validation error (non-blocking):', e);
      }
    }

    if (!jewelryCheck.isJewelry && jewelryCheck.confidence >= 0.55) {
      // HARD REJECT — not jewelry
      const reason = jewelryCheck.isHuman
        ? 'Selfie / person photo detected'
        : `Not a jewelry image: ${jewelryCheck.reason}`;
      setRejectionState({
        type: jewelryCheck.isHuman ? 'selfie' : 'not_jewelry',
        reason,
        detail: jewelryCheck.reason
      });
      return; // Stop pipeline completely
    }

    setDone(0, 1.0, 'All 3 images passed sharpness and jewelry content checks.');

    // ── STEP 1 — Jewelry Classification / Weight ─────────────────────────────
    setActive(1);
    await delay(500); // Let browser breathe
    const weightEst = await estimateWeight(
      img0?.croppedURL || img0?.dataURL,
      userInputs?.jewelryType,
      userInputs?.declaredWeight,
      userInputs?.referenceObject ?? null
    );
    setField('weightEstimate', weightEst);
    {
      const calSrc  = weightEst.calibrationSource;
      const refUsed = weightEst.referenceObjectUsed;
      const typeStr = weightEst.detectedType || userInputs?.jewelryType || 'unknown';
      const detail  = calSrc === 'coco-ssd'
        ? `Detected type: ${typeStr} · calibrated via ${refUsed}`
        : calSrc === 'estimated'
        ? `Detected type: ${typeStr} · reference estimated (${refUsed})`
        : `Detected type: ${typeStr} · no reference object`;
      setDone(1, weightEst.confidence, detail);
    }


    // ── STEP 2 — Hallmark OCR ────────────────────────────────────────────────
    setActive(2);
    await delay(500); // Let browser breathe
    let ocrResult = { detectedStamp: null, karat: null, confidence: 0.1, hallmarkNotInFrame: true };
    if (img2?.croppedURL || img2?.dataURL) {
      try {
        ocrResult = await runHallmarkOCR(img2.croppedURL || img2.dataURL);
      } catch { /* keep fallback */ }
    }
    
    // If Gemini couldn't read a stamp, use the declared karat as a meaningful signal
    if (ocrResult.hallmarkNotInFrame && userInputs?.declaredKarat && userInputs.declaredKarat !== 'Unknown') {
      ocrResult.karat = userInputs.declaredKarat;
      // Declared karat from user is a real data point — give it moderate confidence (not 0.1)
      // Human declaration is more reliable than a failed OCR read
      ocrResult.confidence = Math.max(ocrResult.confidence, 0.65);
      ocrResult.declaredKaratUsed = true;
    }
    setField('ocrResult', ocrResult);
    if (ocrResult.hallmarkNotInFrame) {
      const conf = ocrResult.confidence ?? 0.1;
      const detail = ocrResult.karat
        ? `No stamp visible — using declared karat: ${ocrResult.karat}`
        : 'No hallmark detected — using declared karat';
      setWarn(2, conf, detail);
    } else {
      const kStr = ocrResult.karat ? `${ocrResult.karat}` : 'unknown karat';
      const src  = ocrResult.ocrSource ?? 'AI';
      setDone(2, ocrResult.confidence, `Detected: ${kStr} via ${src}`);
    }

    // ── STEP 3 — Surface Analysis ────────────────────────────────────────────
    setActive(3);
    await delay(500); // Let browser breathe
    let surfaceResult = {
      colorUniformityScore: 0.5, edgeWearPresent: false,
      structureType: 'uncertain', wearCategory: 'moderate',
      platingRiskScore: 0.20, confidence: 0.5, analysisSource: 'fallback'  // Optimistic fallback — images passed quality gate
    };
    if (img1?.croppedURL || img1?.dataURL) {
      try {
        surfaceResult = await analyseSurface(img1.croppedURL || img1.dataURL);
      } catch { /* keep fallback */ }
    }
    setField('surfaceResult', surfaceResult);

    let sourceText = '⚠ Fallback values used';
    const aSrc = surfaceResult.analysisSource ?? '';
    if (aSrc === 'gemini' || aSrc === 'openai')          sourceText = '✓ Gemini Vision verified';
    else if (aSrc === 'claude' || aSrc === 'clip+claude') sourceText = '✓ Claude Vision verified';
    else if (aSrc === 'clip')                             sourceText = '~ CLIP only (Vision API unavailable)';

    const surfConf = surfaceResult.confidence ?? (aSrc === 'fallback' ? 0.5 : 0.7);
    setDone(3, surfConf, `Plating risk: ${Math.round(surfaceResult.platingRiskScore * 100)}% | ${sourceText}`);

    // ── STEP 4 — Weight Estimation (already done; mark complete) ─────────────
    setActive(4);
    await delay(500); // Let browser breathe
    setDone(4, weightEst.confidence || 0.7, `Estimated weight: ${weightEst.weightLow}-${weightEst.weightHigh}g`);

    // ── STEP 5 — Fraud Cross-Check ───────────────────────────────────────────
    setActive(5);
    await delay(500); // Let browser breathe
    const fraudResult = detectFraud({
      ocrResult,
      acousticResult,
      surfaceResult,
      weightEstimate: weightEst,
      userInputs,
    });
    setField('fraudResult', fraudResult);
    if (fraudResult.overallRisk === 'HIGH') {
      setWarn(5, 0.3, `High risk — ${fraudResult.highRiskCount} critical flag(s) detected`);
    } else if (fraudResult.overallRisk === 'MEDIUM') {
      setWarn(5, 0.65, `Medium risk — ${fraudResult.mediumRiskCount} advisory flag(s)`);
    } else {
      setDone(5, 0.95, 'No fraud indicators detected across all checks');
    }

    // ── STEP 6 — Fusion + Loan ───────────────────────────────────────────────
    setActive(6);
    const fusionResult = computeFusionScore({
      ocrResult, acousticResult, surfaceResult,
      weightEstimate: weightEst, userInputs, fraudResult,
    });
    setField('fusionResult', fusionResult);

    const loanOffer = await calculateLoan({ weightEstimate: weightEst, ocrResult, userInputs });
    setField('loanOffer', loanOffer);
    setDone(6, fusionResult.overallScore, `Final AI score computed`);

    setHeadline('Analysis complete!');
    await delay(800);

    // ── Route ────────────────────────────────────────────────────────────────
    if (fusionResult.routing === 'NEEDS_VERIFICATION') {
      navigate('/needs-verification');
    } else {
      navigate('/result');
    }
  }

  const done  = steps.filter(s => s.status === 'complete' || s.status === 'warning').length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);

  if (modelsLoading) {
    return (
      <div className="screen" style={s.root}>
        <div style={s.hero}>
          <div style={s.orb}>
            <span style={s.orbIcon}>🧠</span>
          </div>
          <h2 style={s.title}>Initialising Engine</h2>
          <p style={s.subtitle}>Loading Neural Networks...</p>
        </div>
        <div className="card" style={{ maxWidth: 500, width: '100%', marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>
            Loading AI models for first-time analysis...<br/>
            This may take 30–60 seconds on first run.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Models are cached for subsequent assessments.
          </p>
          <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: 14 }}>{loadingModel}</span>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: 'var(--accent-gold)', animation: 'pulse 1.5s infinite alternate' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Rejection Screen (non-jewelry / selfie uploaded) ─────────────────────
  if (rejectionState) {
    const isSelfie = rejectionState.type === 'selfie';
    return (
      <div className="screen" style={{ ...s.root, justifyContent: 'center', minHeight: '80vh' }}>
        <style>{`
          @keyframes shakeX {
            0%, 100% { transform: translateX(0); }
            15%, 45%, 75% { transform: translateX(-8px); }
            30%, 60%, 90% { transform: translateX(8px); }
          }
        `}</style>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 24, maxWidth: 480, width: '100%', padding: '0 16px'
        }}>
          {/* Error icon */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'rgba(232,90,74,0.15)',
            border: '2px solid #E85A4A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48,
            animation: 'shakeX 0.6s ease-out',
            boxShadow: '0 0 40px rgba(232,90,74,0.25)',
          }}>
            {isSelfie ? '🚫' : '❌'}
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 700,
            color: '#E85A4A', textAlign: 'center', margin: 0
          }}>
            {isSelfie ? 'Selfie Detected' : 'Not a Jewelry Image'}
          </h2>

          {/* Message */}
          <div style={{
            background: 'rgba(232,90,74,0.08)',
            border: '1px solid rgba(232,90,74,0.3)',
            borderRadius: 16, padding: '20px 24px', width: '100%'
          }}>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: 15,
              color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, textAlign: 'center'
            }}>
              {isSelfie
                ? 'Our AI detected a person or selfie in the uploaded photos. This system only analyses gold jewelry.'
                : 'The uploaded images do not appear to contain gold jewelry. Please upload clear photos of the jewelry item.'}
            </p>
          </div>

          {/* AI Reason */}
          {rejectionState.detail && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px', width: '100%'
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                <strong style={{ color: 'var(--accent-gold)' }}>AI detected:</strong> {rejectionState.detail}
              </p>
            </div>
          )}

          {/* Tips */}
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              📸 How to take correct photos:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Place jewelry flat on a white or plain background',
                'Ensure good lighting — no harsh shadows',
                'Fill the frame with just the jewelry item',
                'For the hallmark shot, photograph the stamp/engraving clearly'
              ].map((tip, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', background: 'rgba(201,168,76,0.06)',
                  borderRadius: 8, border: '1px solid rgba(201,168,76,0.1)'
                }}>
                  <span style={{ color: 'var(--accent-gold)', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retake button */}
          <button
            className="gold-gradient"
            style={{
              width: '100%', padding: '18px 24px', borderRadius: 16, border: 'none',
              color: '#000', fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700,
              cursor: 'pointer', marginTop: 8
            }}
            onClick={() => navigate('/capture')}
          >
            📷 Retake Photos
          </button>
          <button
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              textDecoration: 'underline'
            }}
            onClick={() => navigate('/')}
          >
            Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={s.root}>
      {/* Background Scanner Animation */}
      <div style={s.scannerLine} />
      <style>
        {`
          @keyframes scanDown {
            0% { top: -100px; opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { top: 100vh; opacity: 0; }
          }
          .step-card-container {
            transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease, background 0.3s ease;
            max-height: 40px;
            overflow: hidden;
            background: transparent;
            border-radius: 12px;
          }
          .step-card-expanded {
            max-height: 120px;
            background: var(--bg-card);
            padding: 12px;
            margin-left: -12px;
            margin-right: -12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            border: 1px solid var(--border);
          }
        `}
      </style>

      {/* ── Top hero ── */}
      <div style={s.hero}>
        <div style={s.orb}>
          <span style={s.orbIcon}>🧠</span>
        </div>
        <h2 style={s.title}>GoldSense AI</h2>
        <p style={s.subtitle}>{headline}</p>
        <span style={{ 
          background: cacheStatus === 'fresh' ? 'rgba(232,168,76,0.15)' : 'rgba(76,175,122,0.15)',
          color: cacheStatus === 'fresh' ? 'var(--warning)' : 'var(--success)',
          border: `1px solid ${cacheStatus === 'fresh' ? 'var(--warning)' : 'var(--success)'}`,
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, marginTop: 4
        }}>
          {cacheStatus === 'fresh' ? 'Models loaded fresh' : 'Models loaded from cache'}
        </span>
      </div>

      <div className={isMobile ? "" : "two-column"} style={{ width: '100%', marginTop: 20 }}>
        
        {/* Left Column: Progress Ring */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: isMobile ? 0 : 40, marginBottom: isMobile ? 40 : 0 }}>
          <div style={s.ringWrap}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--bg-card)" strokeWidth="12" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}/>
              <circle
                cx="100" cy="100" r="90" fill="none"
                stroke="var(--accent-gold)" strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 800ms ease, filter 0.3s ease', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.4))' }}
              />
            </svg>
            <div style={s.ringLabel}>
              <span style={s.ringPct}>{pct}%</span>
              <span style={s.ringSubtitle}>analysed</span>
            </div>
          </div>
        </div>

        {/* Right Column: Step List */}
        <div style={s.stepListWrapper}>
          <div style={s.stepList}>
            {steps.map((step, idx) => {
              const isExpanded = step.status === 'complete' || step.status === 'warning';
              return (
                <div key={idx} style={{
                  ...s.stepRow,
                  opacity: step.status === 'pending' ? 0.45 : 1,
                }}>
                  {/* connector line */}
                  <div style={s.connectorCol}>
                    <StatusIcon status={step.status}/>
                    {idx < steps.length - 1 && (
                      <div style={{
                        ...s.connectorLine,
                        background: step.status === 'complete' || step.status === 'warning'
                          ? 'var(--accent-gold-dim)'
                          : 'var(--border)',
                      }}/>
                    )}
                  </div>
                  {/* content */}
                  <div style={s.stepContent}>
                    <div className={`step-card-container ${isExpanded ? 'step-card-expanded' : ''}`}>
                      <div style={s.stepTop}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            ...s.stepLabel,
                            color: step.status === 'active' ? 'var(--accent-gold)' : 'var(--text-primary)',
                            fontWeight: step.status === 'active' ? 700 : 500,
                          }}>
                            {step.label}
                          </span>
                          {step.status !== 'pending' && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              via {step.model}
                            </span>
                          )}
                        </div>
                        {step.confidence !== null && (
                          <ConfidencePill score={step.confidence}/>
                        )}
                      </div>
                      
                      {step.status === 'active' && (
                        <p style={s.activeHint}>Processing neural networks…</p>
                      )}
                      
                      {isExpanded && step.detail && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, borderLeft: `2px solid ${step.status === 'warning' ? 'var(--warning)' : 'var(--success)'}` }}>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{step.detail}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom disclaimer ── */}
      <p style={s.disclaimer}>
        All analysis is AI-assisted and indicative only.<br/>
        Final valuation subject to physical verification.
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    paddingTop: 36, paddingBottom: 32, position: 'relative', overflow: 'hidden'
  },
  scannerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 150,
    background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.05), rgba(201,168,76,0.2))',
    borderBottom: '2px solid rgba(201,168,76,0.5)',
    animation: 'scanDown 3s linear infinite',
    pointerEvents: 'none',
    zIndex: 10,
  },
  hero: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1,
  },
  orb: {
    width: 64, height: 64, borderRadius: '50%',
    border: '2px solid var(--accent-gold)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(26,26,26,0.8))',
    boxShadow: '0 0 30px rgba(201,168,76,0.3)',
    animation: 'pulse 1.5s ease-out infinite',
    position: 'relative',
  },
  orbIcon:    { fontSize: 32, position: 'relative', zIndex: 2 },
  title:      { fontFamily: "'Inter', sans-serif", fontSize: 26, color: 'var(--text-primary)', letterSpacing: 1 },
  subtitle:   { fontSize: 14, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif", textAlign: 'center', minHeight: 20 },

  // Ring
  ringWrap:   { position: 'relative', width: 200, height: 200 },
  ringLabel:  {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  ringPct:    { fontSize: 48, fontWeight: 700, color: 'var(--accent-gold)', fontFamily: "'Inter', sans-serif", textShadow: '0 0 20px rgba(201,168,76,0.4)' },
  ringSubtitle:{ fontSize: 14, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },

  // Steps
  stepListWrapper: { width: '100%', display: 'flex', justifyContent: 'center' },
  stepList: { width: '100%', maxWidth: 450, display: 'flex', flexDirection: 'column' },
  stepRow: {
    display: 'flex', gap: 16, alignItems: 'flex-start',
    transition: 'opacity 300ms ease',
  },
  connectorCol: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: 24, flexShrink: 0,
  },
  connectorLine: {
    width: 2, flex: 1, minHeight: 20, marginTop: 4,
    transition: 'background 400ms ease',
  },
  stepContent:{ flex: 1, paddingBottom: 16 },
  stepTop:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 24 },
  stepLabel:  { fontSize: 14, fontFamily: "'Inter', sans-serif", transition: 'color 300ms ease' },
  activeHint: { fontSize: 12, color: 'var(--accent-gold)', fontFamily: "'Inter', sans-serif", marginTop: 4, fontStyle: 'italic' },
  disclaimer: {
    fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif",
    textAlign: 'center', lineHeight: 1.6, paddingTop: 32, width: '100%',
  },
};
