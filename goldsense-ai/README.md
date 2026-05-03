# 🏅 GoldSense AI

> **AI-powered gold jewelry pre-underwriting platform** — built for the **Poonawalla Fincorp National AI Hackathon 2026 (TenzorX)**.

GoldSense AI lets anyone pre-qualify their gold jewelry for a loan in under 2 minutes — using nothing but a smartphone camera. No branch visit required for the initial assessment.

---

## 🔍 What Is GoldSense AI?

GoldSense AI is a **multi-modal remote gold assessment engine** that analyses photographs of gold jewelry and produces an AI-confidence score along with an estimated loan offer range — all in real time, directly in the browser.

Traditional gold loan pre-qualification requires a customer to physically visit a branch, wait in a queue, and have an expert manually inspect and weigh the item. GoldSense AI eliminates this friction by running a 7-step AI pipeline on photos uploaded by the customer.

---

## 🎯 What Does It Do?

### For Customers
- Upload **3 photos** of your gold jewelry (full view, close-up, hallmark stamp)
- Declare the jewelry type, weight, and karat
- Receive an **AI confidence score** and an **estimated loan amount range** within seconds
- Get pre-qualified or guided to a branch — all from your phone

### For Lenders (Poonawalla Fincorp)
- Automate the initial screening of gold loan applicants
- Reduce branch workload by pre-filtering low-confidence or fraudulent submissions
- Access a structured AI summary with signal breakdowns for every assessment

---

## ⚙️ How It Works — The 7-Step Pipeline

When a customer submits their photos, GoldSense AI runs a sequential analysis pipeline:

```
Upload Photos → AI Jewelry Validation → Hallmark OCR → Surface Analysis
             → Weight Estimation → Fraud Cross-Check → Loan Offer
```

| Step | What Happens |
|------|-------------|
| **1. Image Quality Validation** | Checks sharpness (Laplacian variance) and brightness; rejects blurry or dark images |
| **2. Jewelry Content Validation** | Gemini Vision AI confirms the images actually show gold jewelry — rejects selfies, documents, or non-jewelry objects |
| **3. Hallmark Detection (OCR)** | Gemini Vision reads the BIS hallmark stamp (e.g. `22K916`) to identify gold purity; falls back to Tesseract.js |
| **4. Surface & Plating Analysis** | Gemini Vision examines surface uniformity, edge wear, and structure to estimate plating risk |
| **5. Weight Estimation** | Estimates jewelry weight from declared data and jewelry type |
| **6. Fraud Cross-Check** | Cross-references all signals (hallmark vs acoustic, visual vs acoustic, weight sanity) to flag inconsistencies |
| **7. Loan Offer Computation** | Combines all signals into a weighted fusion score → calculates 75% LTV loan range using live gold rates |

---

## 📊 AI Confidence Score & Routing

The fusion engine combines all signals into a single **AI confidence score (0–100%)**:

| Score | Decision | Action |
|-------|----------|--------|
| ≥ 72% + no fraud flags | ✅ **PRE-QUALIFIED** | Instant loan estimate shown |
| 42–71% + no fraud flags | 🟡 **LIKELY ELIGIBLE** | Loan estimate shown, branch confirmation advised |
| < 42% OR high fraud risk | ❌ **NEEDS VERIFICATION** | Directed to nearest branch for physical inspection |

### Signal Weights

| Signal | Weight | Why |
|--------|--------|-----|
| Hallmark OCR | **40%** | Most reliable indicator of gold purity |
| Surface Analysis | **25%** | Detects plating, wear, and structural issues |
| Acoustic Test | **15%** | Optional tap-test resonance analysis |
| Weight Estimate | **10%** | Cross-validates declared weight |
| Declared Info | **10%** | Customer's own karat/weight declaration |

---

## 🛡️ Jewelry Validation Gate

A key safety feature: before any analysis runs, **Gemini Vision AI validates that the uploaded images actually contain gold jewelry**. If a selfie, landscape, document, or any non-jewelry image is detected, the assessment is immediately rejected with a clear message and photo-taking guidance.

This prevents false loan estimates from being generated on invalid uploads.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google Gemini API key (free tier works)

### Installation

```bash
git clone <repository-url>
cd goldsense-ai
npm install
cp .env.example .env
```

### Configure Environment

Edit `.env` and add your API keys:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOLDAPI_KEY=your_goldapi_key_here
```

> **Get a free Gemini API key:** https://aistudio.google.com/app/apikey  
> **Get a free Gold rate API key:** https://goldapi.io

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗺️ App Flow

```
Welcome Screen
    ↓
Capture Screen  ──  Upload 3 photos (Full View, Close-up, Hallmark)
    ↓               Fill in Jewelry Type, Declared Weight, Declared Karat
    ↓               Optional: Acoustic Tap Test
Analysing Screen ── 7-step AI pipeline runs
    ↓
Result Screen ────── PRE-QUALIFIED → Loan estimate + AI breakdown
    OR
Needs Verification ─ Branch visit required
```

---

## 📁 Project Structure

```
src/
  screens/
    Welcome.jsx           # Landing page with CTA and explainer
    Capture.jsx           # 3 image slots, quality gate, tap test, item details
    Analysing.jsx         # 7-step pipeline with animated progress ring
    Result.jsx            # Loan offer, signal breakdown, AI confidence chart
    NeedsVerification.jsx # Branch referral with AI summary
  utils/
    jewelryDetector.js    # Gemini Vision — confirms images contain jewelry
    hallmarkOCR.js        # Gemini Vision + Tesseract.js — reads hallmark stamps
    surfaceAnalysis.js    # Gemini Vision — plating risk and surface condition
    qualityGate.js        # Laplacian blur + brightness + auto-crop
    weightEstimator.js    # Type-based weight estimation
    fusionEngine.js       # Weighted multi-signal scoring + routing
    fraudDetector.js      # 4-point cross-signal fraud detection
    loanCalculator.js     # Live gold rate → 75% LTV loan computation
    acousticAnalyser.js   # Web Audio API — FFT + resonance decay analysis
    geminiClient.js       # Gemini API wrapper with model fallback chain
    demoMode.js           # Demo scenario engine (genuine / plated / ambiguous)
  components/
    ConfidencePill.jsx    # Colour-coded confidence score badge
    WaveformVisualiser.jsx # Real-time audio waveform (Canvas + Web Audio)
  context/
    GoldSenseContext.jsx  # Global state management + reset
  data/
    hallmarkPatterns.js   # BIS / fineness stamp patterns + karat mapping
    materialLibrary.js    # Acoustic reference library for material matching
```

---

## 🔑 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 |
| Routing | react-router-dom v6 |
| AI Vision | Google Gemini 2.0 Flash (OCR, surface analysis, jewelry validation) |
| OCR Fallback | Tesseract.js |
| Acoustic Analysis | Web Audio API (FFT, resonance decay) |
| Image QA | Laplacian variance blur detection |
| Live Gold Rate | GoldAPI.io (XAU/INR, fallback ₹12,883/g for 22K) |
| Camera | react-webcam |

---

## 🧪 Demo Mode

The app includes a **Demo Mode** for hackathon presentations. Toggle it from the capture screen to simulate three scenarios without a real Gemini API call:

| Scenario | Expected Result |
|----------|----------------|
| 🟢 Genuine Gold | PRE_QUALIFIED — high confidence, clean hallmark |
| 🔴 Plated Metal | NEEDS_VERIFICATION — HIGH fraud flag |
| 🟡 Ambiguous | LIKELY_ELIGIBLE — warning confidence, no hallmark |

> Demo Mode is **OFF by default** — real images get real Gemini analysis.

---

## ⚖️ Responsible AI & Compliance

- **Pre-qualification only** — All results are clearly labelled as estimates, subject to physical branch verification and KYC
- **RBI LTV compliance** — Loan amounts computed at 75% LTV per RBI Master Circular RBI/2022-23/02
- **No data retention** — Images are never uploaded to any server; all analysis runs client-side (except Gemini API calls for vision tasks)
- **Transparent AI** — Every signal's confidence score and contribution to the final score is shown to the user
- **Graceful fallbacks** — Every AI/network call has a fallback; the app never crashes on API failure
- **Fraud safeguards** — Any HIGH fraud flag unconditionally routes to branch verification, overriding the score

---

## 📝 License

Built for **hackathon demonstration purposes only**.  
Not for production financial use without regulatory approval.

> © 2026 TenzorX Hackathon — Poonawalla Fincorp AI Challenge
