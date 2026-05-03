import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useGoldSense } from '../context/GoldSenseContext';
import { analyseImageQuality } from '../utils/qualityGate';
import { requestMicPermission, startRecording, analyseAudio } from '../utils/acousticAnalyser';
import WaveformVisualiser from '../components/WaveformVisualiser';
import { DEMO_SCENARIOS } from '../utils/demoMode';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <div style={{padding:20}}>Something went wrong.</div> : this.props.children; }
}
import React from 'react';

const SLOTS = [
  { id: 1, label: 'Full View', icon: '📷' },
  { id: 2, label: 'Close-up',  icon: '🔍' },
  { id: 3, label: 'Hallmark',  icon: '🏷️' },
];
const JEWELRY_TYPES = ['ring','chain','bangle','earring','pendant'];
const KARAT_OPTIONS  = ['24K','22K','18K','14K','9K','Unknown'];

/* ─── Toast Notification ─── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? 'var(--danger)' : 'var(--success)',
      color: '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'toastSlideDown 0.3s ease-out forwards',
      fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 500,
    }}>
      {message}
    </div>
  );
}

/* ─── Image Slot ─────────────────────────────────────────────────────────── */
function ImageSlot({ slot, filled, onCapture, activeSlot, setActiveSlot, isMobile }) {
  const fileRef   = useRef(null);
  const webcamRef = useRef(null);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processDataURL = useCallback(async dataURL => {
    setChecking(true);
    try {
      const r = await analyseImageQuality(dataURL, slot.id);
      if (r.pass) {
        onCapture({ slot: slot.id, dataURL, croppedURL: r.croppedURL });
        setToast({ message: 'Image accepted', type: 'success' });
      } else {
        setToast({ message: r.message || 'Image rejected', type: 'error' });
      }
    } catch { 
      setToast({ message: 'Could not analyse — please try again.', type: 'error' });
    }
    finally { setChecking(false); setActiveSlot(null); }
  }, [slot.id, onCapture, setActiveSlot]);

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let dataURL = ev.target.result;
      if (file.size > 1024 * 1024) { // Compress if > 1MB
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          const maxDim = 1600;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
             const ratio = Math.min(maxDim/w, maxDim/h);
             w = Math.round(w*ratio); h = Math.round(h*ratio);
          }
          cvs.width = w; cvs.height = h;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          processDataURL(cvs.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataURL;
      } else {
        processDataURL(dataURL);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFile = e => {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       processFile(file);
    }
  };

  const handleWebcamCapture = useCallback(() => {
    const url = webcamRef.current?.getScreenshot();
    if (!url) return;
    processDataURL(url);
  }, [processDataURL, webcamRef]);

  // Touch Swipe logic
  let touchStartX = 0;
  const onTouchStart = (e) => { touchStartX = e.changedTouches[0].screenX; };
  const onTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) {
      // Swiped left
      const nextId = slot.id < 3 ? slot.id + 1 : 1;
      setActiveSlot(nextId);
    }
    if (touchEndX - touchStartX > 50) {
      // Swiped right
      const prevId = slot.id > 1 ? slot.id - 1 : 3;
      setActiveSlot(prevId);
    }
  };

  const isActive = activeSlot === slot.id;
  const borderColor = isDragOver ? 'var(--accent-gold-light)' : filled ? 'var(--success)' : isActive ? 'var(--accent-gold)' : 'var(--accent-gold-dim)';

  return (
    <div style={s.slotWrapper} 
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={handleDrop}
         onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div id={`slot-${slot.id}`} style={{ ...s.slotBox, borderColor, borderStyle: filled || isDragOver ? 'solid' : 'dashed', animation: !filled && !isActive ? 'dashOrbit 10s linear infinite' : 'none' }}
        onClick={() => !filled && !checking && setActiveSlot(slot.id)}>
        {filled ? (
          <div style={s.filledContainer}>
            <img src={filled.croppedURL || filled.dataURL} alt={slot.label} style={s.thumb}/>
            <div style={s.metadataOverlay}>
              <span>{slot.label}</span>
              <span>HD</span>
            </div>
            <div style={s.tick}>✓</div>
          </div>
        ) : (
          <div style={s.slotEmpty}>
            <span style={{ fontSize: 28 }}>{slot.icon}</span>
            <span style={s.slotLabel}>{slot.label}</span>
            <span style={s.slotHint}>{isDragOver ? 'Drop image here' : 'Tap to capture'}</span>
          </div>
        )}
      </div>
      {checking && <div style={s.statusRow}><span style={s.spin}>⟳</span><span style={s.statusTxt}>Checking…</span></div>}
      {filled && !checking && <button style={s.retakeBtn} onClick={() => setActiveSlot(slot.id)}>Retake</button>}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile}/>

      {isActive && isMobile && (
        <div style={s.overlay} onClick={() => setActiveSlot(null)}>
          <div style={s.modalCard} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>{slot.label}</p>
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode:'environment' }} style={s.webcamStyle}/>
            <div style={{ display:'flex', gap:10, width:'100%' }}>
              <button className="gold-gradient" style={s.captureBtn} onClick={handleWebcamCapture}>📸 Capture</button>
              <button style={s.galleryBtn} onClick={() => { setActiveSlot(null); fileRef.current?.click(); }}>🖼 Gallery</button>
            </div>
            <button style={s.closeBtn} onClick={() => setActiveSlot(null)}>✕ Cancel</button>
          </div>
        </div>
      )}

      {/* For desktop, we expose a ref function to allow parent to trigger capture */}
      {isActive && !isMobile && (
         <div style={{display:'none'}} ref={(el) => {
             if (el) el.capture = (url) => url ? processDataURL(url) : handleWebcamCapture();
             if (el) el.upload = () => fileRef.current?.click();
         }} id={`desktop-trigger-${slot.id}`} />
      )}
    </div>
  );
}

/* ─── Section B: Tap Test ────────────────────────────────────────────────── */
function TapTest({ onComplete, onSkip }) {
  const [tapState,   setTapState]   = useState('idle');
  const [countdown,  setCountdown]  = useState(3);
  const [result,     setResult]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState(null);
  const [analyserNode, setAnalyserNode] = useState(null);
  const streamRef    = useRef(null);
  const timerRef     = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleRecord = async () => {
    if (tapState !== 'idle' && tapState !== 'requesting') return;
    setErrorMsg(null);
    setTapState('requesting');
    try {
      const stream = await requestMicPermission();
      streamRef.current = stream;

      const actx    = new (window.AudioContext || window.webkitAudioContext)();
      const src     = actx.createMediaStreamSource(stream);
      const node    = actx.createAnalyser();
      node.fftSize  = 2048;
      src.connect(node);
      setAnalyserNode(node);

      setTapState('recording');
      setCountdown(3);
      timerRef.current = setInterval(() => setCountdown(p => p - 1), 1000);

      const blob = await startRecording(stream);
      clearInterval(timerRef.current);
      stream.getTracks().forEach(t => t.stop());
      setAnalyserNode(null);

      setTapState('analysing');
      const res = await analyseAudio(blob);
      setResult(res);
      setTapState('result');
    } catch (e) {
      clearInterval(timerRef.current);
      setErrorMsg(e.message || 'Microphone access denied.');
      setTapState('idle');
    }
  };

  const isGold   = result?.material?.toLowerCase().includes('gold');
  const isPlated = result?.material?.toLowerCase().includes('plated');
  const fillPct  = isGold ? 100 : isPlated ? 30 : 0;

  return (
    <div className="card" style={s.sectionB} id="section-b">
      <div style={s.divider}>
        <div style={s.divLine}/><span style={s.divTxt}>Tap Test Verification</span><div style={s.divLine}/>
      </div>
      <p style={s.tapSubtext}>Tap your jewelry gently near the microphone</p>

      {/* Waveform */}
      <WaveformVisualiser analyserNode={tapState === 'recording' ? analyserNode : null}/>

      {/* Countdown */}
      {tapState === 'recording' && (
        <p style={s.countdown}>Recording… <span style={{ color:'var(--accent-gold)', fontWeight:700 }}>{countdown}s</span></p>
      )}

      {/* Analysing spinner */}
      {tapState === 'analysing' && (
        <div style={s.statusRow}>
          <span style={s.spin}>⟳</span>
          <span style={s.statusTxt}>Analysing acoustic signature…</span>
        </div>
      )}

      {/* Result card */}
      {tapState === 'result' && result && (
        <div style={s.resultCard}>
          {result.noSignal ? (
            <div style={{ color: 'var(--warning)', fontWeight: 600, padding: '20px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🔇</p>
              <p>No tap detected — please tap louder and closer to microphone</p>
            </div>
          ) : (
            <>
              <div style={s.resultIconBadge}>
                {isGold ? '✨' : isPlated ? '⚠️' : '❌'}
              </div>
              <p style={s.resultMaterial}>{result.material}</p>
              <p style={s.resultProb}>{Math.round(result.matchProbability * 100)}% Match</p>
              
              <div style={s.meterContainer}>
                 <div style={s.meterTrack}>
                    <div style={{...s.meterFill, width: `${fillPct}%`}} />
                 </div>
                 <div style={s.meterLabels}>
                   <span>Plated</span>
                   <span>Genuine</span>
                 </div>
              </div>

              <p style={s.resultMeta}>Peak: {Math.round(result.frequencyPeak)} Hz &nbsp;·&nbsp; Decay: {Math.round(result.decayMs)} ms</p>
            </>
          )}
          <button style={s.rerecordBtn} onClick={() => { setResult(null); setTapState('idle'); }}>Re-record</button>
        </div>
      )}

      {errorMsg && <p style={s.errTxt}>{errorMsg}</p>}

      {/* Record button */}
      {(tapState === 'idle' || tapState === 'requesting') && (
        <div style={s.recordBtnWrap}>
          <div style={s.rippleOuter}/>
          <div style={s.rippleInner}/>
          <button 
             id="btn-hold-record" 
             className={tapState === 'requesting' ? '' : 'gold-gradient'} 
             style={{
               ...s.recordBtn,
               background: tapState === 'requesting' ? 'var(--text-muted)' : undefined,
             }} 
             onClick={handleRecord} 
             onTouchStart={handleRecord}
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRecord(); } }}
             disabled={tapState === 'requesting'}
          >
            {tapState === 'requesting' ? '…' : '🎙'}
          </button>
          <p style={s.recordLabel}>{tapState === 'requesting' ? 'Requesting mic…' : 'Tap to Record'}</p>
        </div>
      )}

      {tapState === 'recording' && (
        <div style={s.recordBtnWrap}>
          <div style={{...s.rippleOuter, borderColor: 'var(--danger)'}}/>
          <button style={{ ...s.recordBtn, background:'var(--danger)', cursor:'default' }} disabled>⏺</button>
          <p style={s.recordLabel}>Recording…</p>
        </div>
      )}

      <button id="btn-proceed-analysis" className={tapState === 'result' ? 'gold-gradient' : ''} style={{
        ...s.proceedBtn,
        background: tapState === 'result' ? undefined : 'var(--bg-secondary)',
        color:      tapState === 'result' ? '#000' : 'var(--text-muted)',
        border:     tapState === 'result' ? 'none' : '1px solid var(--border)',
        cursor:     tapState === 'result' ? 'pointer' : 'not-allowed',
      }} disabled={tapState !== 'result'} onClick={() => tapState === 'result' && onComplete(result)}>
        Proceed to Analysis →
      </button>
      <button id="btn-skip-tap-test" style={s.skipBtn} onClick={onSkip}>Skip tap test</button>
    </div>
  );
}

/* ─── Main Capture Screen ────────────────────────────────────────────────── */
export default function Capture() {
  const navigate = useNavigate();
  const { capturedImages, setField, userInputs, demoScenario, isDemoMode } = useGoldSense();
  const setDemoScenario = (scenario) => setField('demoScenario', scenario);
  const [activeSlot, setActiveSlot] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const desktopWebcamRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getFilledSlot = id => capturedImages.find(c => c.slot === id) || null;

  const handleCapture = useCallback(({ slot, dataURL, croppedURL }) => {
    setField('capturedImages', [
      ...capturedImages.filter(c => c.slot !== slot),
      { slot, dataURL, croppedURL },
    ].sort((a,b) => a.slot - b.slot));
    setActiveSlot(null);
  }, [capturedImages, setField]);

  const updateInput = (key, val) => setField('userInputs', { ...userInputs, [key]: val });

  const allSlotsFilled = SLOTS.every(s => getFilledSlot(s.id));
  const canProceed     = allSlotsFilled && userInputs.jewelryType !== '';
  const [showSectionB, setShowSectionB] = useState(false);

  const handleProceedToTap = () => {
    setShowSectionB(true);
    setTimeout(() => document.getElementById('section-b')?.scrollIntoView({ behavior:'smooth' }), 100);
  };

  const handleAcousticComplete = result => {
    setField('acousticResult', result);
    navigate('/analysing');
  };

  const handleSkip = () => {
    setField('acousticResult', null);
    navigate('/analysing');
  };

  const activeSlotObj = activeSlot ? SLOTS.find(s => s.id === activeSlot) : null;

  return (
    <ErrorBoundary>
      <div className="screen" style={{ position: 'relative' }}>
        <style>
          {`
            @keyframes toastSlideDown {
              from { top: -50px; opacity: 0; }
              to { top: 20px; opacity: 1; }
            }
            @keyframes dashOrbit {
              to { background-position: 100% 0; }
            }
            @keyframes rippleAnimation {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(1.8); opacity: 0; }
            }
          `}
        </style>

        {/* Header (visible on mobile if needed, but nav handles back now) */}
        {!isMobile && <div style={{ display: 'none' }}></div>}

        {isDemoMode && (
          <div style={{
            background: 'rgba(232,168,76,0.15)',
            border: '1px solid #E8A84C',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ color: '#E8A84C', fontWeight: 600, fontSize: '13px' }}>
              DEMO MODE ACTIVE
            </div>
            <div style={{ color: '#9A8F7A', fontSize: '12px' }}>
              Select a scenario to simulate. Real image upload still works.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['genuine', 'plated', 'ambiguous'].map(scenario => (
                <button
                  key={scenario}
                  onClick={() => setDemoScenario(scenario)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${demoScenario === scenario ? '#C9A84C' : '#2A2520'}`,
                    background: demoScenario === scenario ? 'rgba(201,168,76,0.2)' : 'transparent',
                    color: demoScenario === scenario ? '#C9A84C' : '#9A8F7A',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: demoScenario === scenario ? 600 : 400,
                    textTransform: 'capitalize'
                  }}
                >
                  {DEMO_SCENARIOS[scenario].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="capture-layout" style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
            {/* Slots */}
            <div style={s.slotsGrid}>
            {SLOTS.map(slot => (
              <ImageSlot 
                key={slot.id} 
                slot={slot} 
                filled={getFilledSlot(slot.id)} 
                onCapture={handleCapture}
                activeSlot={activeSlot}
                setActiveSlot={setActiveSlot}
                isMobile={isMobile}
              />
            ))}
          </div>



          <div style={s.divider}>
            <div style={s.divLine}/><span style={s.divTxt}>Item Details</span><div style={s.divLine}/>
          </div>

          {/* Form */}
          <div className="card" style={s.formCard}>
            <div style={s.field}>
              <label style={s.labelForm} htmlFor="input-jewelry-type">Jewelry Type <span style={{ color:'var(--danger)' }}>*</span></label>
              <select id="input-jewelry-type" style={s.select} value={userInputs.jewelryType} onChange={e => updateInput('jewelryType', e.target.value)}>
                <option value="">Select type</option>
                {JEWELRY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.labelForm} htmlFor="input-weight">Declared Weight (g)</label>
              <input id="input-weight" type="number" min="0" step="0.1" placeholder="Optional" style={s.input}
                value={userInputs.declaredWeight || ''} onChange={e => updateInput('declaredWeight', parseFloat(e.target.value)||0)}/>
            </div>
            <div style={s.field}>
              <label style={s.labelForm} htmlFor="input-karat">Declared Karat</label>
              <select id="input-karat" style={s.select} value={userInputs.declaredKarat} onChange={e => updateInput('declaredKarat', e.target.value)}>
                <option value="">Select karat</option>
                {KARAT_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          {/* Proceed to Tap Test */}
          {!showSectionB && (
            <button id="btn-proceed-tap-test" className={canProceed ? 'gold-gradient' : ''} style={{
              ...s.proceedBtn,
              background: canProceed ? undefined : 'var(--bg-card)',
              color:      canProceed ? '#000' : 'var(--text-muted)',
              border:     canProceed ? 'none' : '1px solid var(--border)',
              cursor:     canProceed ? 'pointer' : 'not-allowed',
            }} disabled={!canProceed} onClick={handleProceedToTap}>
              {canProceed ? 'Proceed to Tap Test →' : 'Fill all 3 slots & details to proceed'}
            </button>
          )}

          {/* Tap Test Mobile Placement */}
          {showSectionB && isMobile && <TapTest onComplete={handleAcousticComplete} onSkip={handleSkip}/>}
        </div>

        {/* RIGHT COLUMN (Desktop only) */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 40, width: '100%' }}>
            {/* Live Camera Preview */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {activeSlotObj ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Webcam ref={desktopWebcamRef} audio={false} screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode:'environment' }} style={{ width:'100%', height: '400px', objectFit: 'cover' }}/>
                  <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
                    <button className="gold-gradient" style={{...s.captureBtn, padding: '12px 32px', borderRadius: 30}} 
                      onClick={() => {
                        const url = desktopWebcamRef.current?.getScreenshot();
                        document.getElementById(`desktop-trigger-${activeSlot}`)?.capture(url);
                      }}>📸 Capture</button>
                    <button style={{...s.galleryBtn, padding: '12px 32px', borderRadius: 30, background: 'rgba(26,26,26,0.8)', backdropFilter: 'blur(4px)'}} 
                      onClick={() => document.getElementById(`desktop-trigger-${activeSlot}`)?.upload()}>🖼 Gallery</button>
                  </div>
                  <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', border: '1px solid var(--accent-gold)' }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: 14 }}>{activeSlotObj.label}</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>
                  <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📷</span>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Live Preview</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Select an image slot on the left to start the camera</p>
                </div>
              )}
            </div>
            
            {/* Tap Test Desktop Placement */}
            {showSectionB && <TapTest onComplete={handleAcousticComplete} onSkip={handleSkip}/>}
          </div>
        )}
        </div>

      </div>
    </ErrorBoundary>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = {
  slotsGrid:   { display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap:16, width:'100%' },
  slotWrapper: { display:'flex', flexDirection:'column', alignItems:'center', gap:8, width: '100%' },
  slotBox:     { width:'100%', aspectRatio:'4/3', borderWidth:2, borderRadius:16, background:'var(--bg-card)', cursor:'pointer', overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 300ms ease' },
  slotEmpty:   { display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:10 },
  slotLabel:   { fontSize:12, fontWeight:600, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif", textAlign:'center' },
  slotHint:    { fontSize:10, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif" },
  filledContainer: { width: '100%', height: '100%', position: 'relative', animation: 'fadeIn 0.5s ease forwards' },
  thumb:       { width:'100%', height:'100%', objectFit:'cover' },
  metadataOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '16px 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#fff', fontFamily: "'DM Sans', sans-serif" },
  tick:        { position:'absolute', top:8, right:8, width:24, height:24, borderRadius:'50%', background:'var(--success)', color:'#fff', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  statusRow:   { display:'flex', alignItems:'center', gap:6 },
  spin:        { fontSize:14, color:'var(--accent-gold)', display:'inline-block', animation:'spin 1s linear infinite' },
  statusTxt:   { fontSize:11, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif" },
  retakeBtn:   { background:'transparent', border:'none', textDecoration: 'underline', color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:"'Inter', sans-serif", marginTop: 4 },
  
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' },
  modalCard:   { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:20, width:'90%', maxWidth:380, display:'flex', flexDirection:'column', gap:14, alignItems:'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' },
  modalTitle:  { fontFamily:"'Inter', sans-serif", fontSize:20, color:'var(--text-primary)', fontWeight:700 },
  webcamStyle: { width:'100%', borderRadius:16, border:'1px solid var(--border)', aspectRatio: '4/3', objectFit: 'cover' },
  captureBtn:  { flex:1, color:'#000', border:'none', borderRadius:12, padding:14, fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:"'Inter', sans-serif" },
  galleryBtn:  { flex:1, background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:12, padding:14, fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:"'Inter', sans-serif" },
  closeBtn:    { background:'transparent', border:'none', color:'var(--text-muted)', fontSize:14, cursor:'pointer', fontFamily:"'Inter', sans-serif", padding: 8 },
  
  divider:     { display:'flex', alignItems:'center', gap:14, margin:'16px 0' },
  divLine:     { flex:1, height:1, background:'var(--border)' },
  divTxt:      { fontSize:12, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif", letterSpacing:'2px', textTransform:'uppercase', whiteSpace:'nowrap', fontWeight: 600 },
  
  formCard:    { padding: 24, display:'flex', flexDirection:'column', gap:20 },
  field:       { display:'flex', flexDirection:'column', gap:8 },
  labelForm:   { fontSize:11, fontWeight:700, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '1px' },
  select:      { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif", fontSize:15, padding:'14px 16px', outline:'none', cursor:'pointer', appearance:'none', WebkitAppearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23C9A84C'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 16px center', paddingRight:40, transition: 'border-color 0.2s' },
  input:       { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-primary)', fontFamily:"'Inter', sans-serif", fontSize:15, padding:'14px 16px', outline:'none', width:'100%', transition: 'border-color 0.2s' },
  proceedBtn:  { width:'100%', fontFamily:"'Inter', sans-serif", fontSize:16, fontWeight:700, borderRadius:16, padding:20, transition:'all 300ms ease', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  
  // Section B (Tap Test)
  sectionB:    { display:'flex', flexDirection:'column', gap:16, padding: 24 },
  tapSubtext:  { fontSize:14, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", textAlign:'center' },
  countdown:   { fontSize:16, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", textAlign:'center' },
  recordBtnWrap:{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, position:'relative', padding:'20px 0', overflow: 'hidden' },
  rippleOuter: { position:'absolute', top: 20, width:100, height:100, borderRadius:'50%', border:'2px solid var(--accent-gold)', animation:'rippleAnimation 2s ease-out infinite', pointerEvents: 'none' },
  rippleInner: { position:'absolute', top: 20, width:100, height:100, borderRadius:'50%', border:'2px solid var(--accent-gold)', animation:'rippleAnimation 2s ease-out infinite', animationDelay: '1s', pointerEvents: 'none' },
  recordBtn:   { width:100, height:100, borderRadius:'50%', border:'none', color:'#000', fontSize:36, cursor:'pointer', fontWeight:700, position:'relative', zIndex:1, transition:'all 300ms ease', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: '0 10px 30px rgba(201,168,76,0.3)' },
  recordLabel: { fontSize:13, color:'var(--text-secondary)', fontFamily:"'Inter', sans-serif", fontWeight: 600, marginTop: 10 },
  
  resultCard:  { width: '100%', borderRadius:16, border:'1px solid', padding:24, display:'flex', flexDirection:'column', gap:10, alignItems:'center', textAlign:'center', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)', borderImage: 'linear-gradient(45deg, var(--accent-gold), transparent) 1' },
  resultIconBadge: { width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,26,26,0.8)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 8 },
  resultMaterial:{ fontFamily:"'Inter', sans-serif", fontSize:28, color:'var(--text-primary)', fontWeight:700 },
  resultProb:  { fontSize:16, fontWeight:700, color:'var(--accent-gold)', fontFamily:"'Inter', sans-serif" },
  
  meterContainer: { width: '100%', maxWidth: 280, margin: '12px 0' },
  meterTrack: { width: '100%', height: 8, background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' },
  meterFill: { height: '100%', background: 'linear-gradient(90deg, #E85C4A 0%, #E8A84C 50%, #4CAF7A 100%)', borderRadius: 4, transition: 'width 1s ease-out' },
  meterLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
  
  resultMeta:  { fontSize:13, color:'var(--text-muted)', fontFamily:"'Inter', sans-serif", marginTop: 8 },
  rerecordBtn: { background:'transparent', border:'none', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', fontFamily:"'Inter', sans-serif", textDecoration:'underline', marginTop:8 },
  skipBtn:     { background:'transparent', border:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:"'Inter', sans-serif", textDecoration:'underline', textAlign:'center', padding:'8px 0', marginTop: 8 },
  errTxt:      { color: 'var(--danger)', fontSize: 14, textAlign: 'center' }
};
