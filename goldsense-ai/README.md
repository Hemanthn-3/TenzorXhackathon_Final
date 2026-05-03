# GoldSense AI 🏅

> Multi-Modal Remote Gold Pre-Underwriting Engine
> Poonawalla Fincorp TenzorX National AI Hackathon 2026

---

## 🚀 Live Demo

**[https://tenzor-xhackathon-final.vercel.app](https://tenzor-xhackathon-final.vercel.app)**

> No installation needed — open the link and start a gold assessment instantly.

---

## 📸 Screenshots

| Welcome Screen | Analysis Pipeline | Result — Pre-Qualified |
|----------------|-------------------|------------------------|
| ![Welcome](./goldsense-ai/src/assets/hero.png) | Analysis in progress | Loan offer with AI breakdown |

---

## ⚙️ Setup

```bash
npm install
cp .env.example .env
# Add VITE_GEMINI_API_KEY to .env
npm run dev
```

---

## 🔑 Environment Variables

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOLDAPI_KEY=your_goldapi_key_here
```

Get a free Gemini key at: https://aistudio.google.com/app/apikey

---

## 🧠 How It Works

7-step AI pipeline:

1. **Image Quality Gate** — Laplacian blur detection + brightness check
2. **Jewelry Validation** — Gemini Vision confirms image contains gold jewelry (rejects selfies)
3. **Hallmark OCR** — Gemini Vision + Tesseract.js reads BIS stamp (e.g. `22K916`)
4. **Surface Analysis** — Gemini Vision assesses plating risk and surface condition
5. **Weight Estimation** — Type-based geometric estimation
6. **Fraud Cross-Check** — 4-point rule engine (OCR vs acoustic, visual vs acoustic, weight sanity, image consistency)
7. **Loan Offer** — Live gold rate × 75% LTV per RBI Master Circular

### Routing

| AI Score | Result |
|----------|--------|
| ≥ 72% | ✅ PRE-QUALIFIED |
| 42–71% | 🟡 LIKELY ELIGIBLE |
| < 42% or fraud flag | ❌ NEEDS BRANCH VERIFICATION |

---

## 🛠️ Tech Stack

- **Vite + React 18** — Frontend framework
- **Gemini 2.0 Flash** — Vision AI (hallmark OCR, surface analysis, jewelry validation)
- **Tesseract.js** — OCR fallback for hallmark detection
- **Web Audio API** — Acoustic FFT tap test (optional)
- **gold-api.com** — Live gold rate (XAU/INR)
- **react-webcam** — In-browser camera capture

---

## ⚖️ Responsible AI

- Images discarded post-assessment (never stored on any server)
- All outputs labelled as pre-qualification estimates only
- RBI 75% LTV rule applied per Master Circular RBI/2022-23/02
- Confidence scores shown for every signal
- Any HIGH fraud flag unconditionally routes to branch verification

---

## 📁 Project Structure

```
goldsense-ai/
  src/
    screens/        # Welcome, Capture, Analysing, Result, NeedsVerification
    utils/          # hallmarkOCR, surfaceAnalysis, fusionEngine, fraudDetector...
    components/     # ConfidencePill, WaveformVisualiser, SignalBreakdown...
    context/        # GoldSenseContext (global state)
    data/           # hallmarkPatterns, materialLibrary
```

---

## 📝 License

Built for **hackathon demonstration purposes only**.
Not for production financial use without regulatory approval.

> © 2026 TenzorX Hackathon — Poonawalla Fincorp AI Challenge
