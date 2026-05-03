export const DEMO_SCENARIOS = {
  genuine: {
    label: 'Genuine 22K Gold Ring',
    ocrResult: {
      detectedStamp: '916',
      karat: '22K',
      confidence: 0.91,
      hallmarkNotInFrame: false,
      rawOCRText: '916 BIS HALLMARK',
      ocrSource: 'trocr'
    },
    acousticResult: {
      material: '22K Gold',
      matchProbability: 0.87,
      frequencyPeak: 3920,
      decayMs: 158,
      noSignal: false,
      allScores: [
        { material: '24K Gold', score: 72 },
        { material: '22K Gold', score: 87 },
        { material: '18K Gold', score: 61 },
        { material: 'Plated Copper', score: 18 },
        { material: 'Plated Zinc', score: 9 }
      ]
    },
    surfaceResult: {
      colorUniformityScore: 0.42,
      edgeWearPresent: true,
      structureType: 'solid',
      wearCategory: 'moderate',
      platingRiskScore: 0.12,
      confidence: 0.84,
      analysisSource: 'clip+claude'
    },
    weightEstimate: {
      weightLow: 8.5,
      weightHigh: 11.5,
      unit: 'g',
      confidence: 0.75,
      detectedType: 'ring',
      cocoDetected: 'ring'
    },
    fraudResult: {
      flags: [],
      highRiskCount: 0,
      mediumRiskCount: 0,
      overallRisk: 'CLEAR'
    },
    fusionResult: {
      overallScore: 0.81,
      routing: 'PRE_QUALIFIED',
      signalBreakdown: [
        { signal: 'Hallmark OCR', weight: 0.35, subScore: 0.91, contribution: 0.318, label: '22K (trocr)' },
        { signal: 'Surface Analysis', weight: 0.20, subScore: 0.88, contribution: 0.176, label: 'moderate · clip+claude' },
        { signal: 'Acoustic Test', weight: 0.25, subScore: 0.87, contribution: 0.218, label: '22K Gold' },
        { signal: 'Weight Estimate', weight: 0.10, subScore: 0.75, contribution: 0.075, label: '8.5–11.5g' },
        { signal: 'Declared Info', weight: 0.10, subScore: 0.80, contribution: 0.080, label: '10g declared' }
      ]
    },
    loanOffer: {
      loanLow:       82688,
      loanHigh:      111788,
      collateralLow:  110250,
      collateralHigh: 149050,
      ratePerGram:    13789,
      rate24k:        15043,
      rate22k:        13789,
      rate18k:        11283,
      rateSource:     'fallback',
      rateProvider:   'MCX reference rate (Apr 2026)',
      karat:          '22K',
      weightMid:      10.0,
      ltvRatio:       0.75,
      ltvReference:   'RBI Circular RBI/2022-23/92'
    }
  },

  plated: {
    label: 'Suspected Plated Metal',
    ocrResult: {
      detectedStamp: null,
      karat: null,
      confidence: 0.10,
      hallmarkNotInFrame: true,
      rawOCRText: '',
      ocrSource: 'trocr'
    },
    acousticResult: {
      material: 'Plated Copper',
      matchProbability: 0.79,
      frequencyPeak: 3080,
      decayMs: 108,
      noSignal: false,
      allScores: [
        { material: '24K Gold', score: 12 },
        { material: '22K Gold', score: 18 },
        { material: '18K Gold', score: 24 },
        { material: 'Plated Copper', score: 79 },
        { material: 'Plated Zinc', score: 61 }
      ]
    },
    surfaceResult: {
      colorUniformityScore: 0.88,
      edgeWearPresent: true,
      structureType: 'hollow',
      wearCategory: 'heavy',
      platingRiskScore: 0.82,
      confidence: 0.76,
      analysisSource: 'clip+claude'
    },
    weightEstimate: {
      weightLow: 4.2,
      weightHigh: 6.8,
      unit: 'g',
      confidence: 0.65,
      detectedType: 'ring',
      cocoDetected: 'ring'
    },
    fraudResult: {
      flags: [
        {
          severity: 'HIGH',
          check: 'ocr_acoustic',
          reason: 'Hallmark indicates gold but acoustic signature matches plated metal'
        },
        {
          severity: 'MEDIUM',
          check: 'visual_acoustic',
          reason: 'Surface analysis suggests plating — high color uniformity detected'
        },
        {
          severity: 'MEDIUM',
          check: 'image_consistency',
          reason: 'Bounding box geometry shows variation across images'
        }
      ],
      highRiskCount: 1,
      mediumRiskCount: 2,
      overallRisk: 'HIGH'
    },
    fusionResult: {
      overallScore: 0.28,
      routing: 'NEEDS_VERIFICATION',
      signalBreakdown: [
        { signal: 'Hallmark OCR', weight: 0.35, subScore: 0.10, contribution: 0.035, label: 'Not detected' },
        { signal: 'Surface Analysis', weight: 0.20, subScore: 0.18, contribution: 0.036, label: 'heavy · clip+claude' },
        { signal: 'Acoustic Test', weight: 0.25, subScore: 0.05, contribution: 0.013, label: 'Plated Copper' },
        { signal: 'Weight Estimate', weight: 0.10, subScore: 0.65, contribution: 0.065, label: '4.2–6.8g' },
        { signal: 'Declared Info', weight: 0.10, subScore: 0.50, contribution: 0.050, label: 'Not provided' }
      ]
    },
    loanOffer: null
  },

  ambiguous: {
    label: 'Ambiguous — Needs Verification',
    ocrResult: {
      detectedStamp: '750',
      karat: '18K',
      confidence: 0.61,
      hallmarkNotInFrame: false,
      rawOCRText: '750',
      ocrSource: 'tesseract'
    },
    acousticResult: null,
    surfaceResult: {
      colorUniformityScore: 0.55,
      edgeWearPresent: false,
      structureType: 'uncertain',
      wearCategory: 'new',
      platingRiskScore: 0.44,
      confidence: 0.58,
      analysisSource: 'clip'
    },
    weightEstimate: {
      weightLow: 6.0,
      weightHigh: 9.0,
      unit: 'g',
      confidence: 0.70,
      detectedType: 'ring',
      cocoDetected: 'ring'
    },
    fraudResult: {
      flags: [
        {
          severity: 'MEDIUM',
          check: 'weight_sanity',
          reason: 'Declared weight differs significantly from visual estimate'
        }
      ],
      highRiskCount: 0,
      mediumRiskCount: 1,
      overallRisk: 'MEDIUM'
    },
    fusionResult: {
      overallScore: 0.58,
      routing: 'LIKELY_ELIGIBLE',
      signalBreakdown: [
        { signal: 'Hallmark OCR', weight: 0.35, subScore: 0.61, contribution: 0.214, label: '18K (tesseract)' },
        { signal: 'Surface Analysis', weight: 0.20, subScore: 0.56, contribution: 0.112, label: 'new · clip' },
        { signal: 'Acoustic Test', weight: 0.25, subScore: 0.50, contribution: 0.125, label: 'Skipped' },
        { signal: 'Weight Estimate', weight: 0.10, subScore: 0.70, contribution: 0.070, label: '6.0–9.0g' },
        { signal: 'Declared Info', weight: 0.10, subScore: 0.50, contribution: 0.050, label: 'Not provided' }
      ]
    },
    loanOffer: {
      loanLow:       38069,
      loanHigh:      57104,
      collateralLow:  50760,
      collateralHigh: 76138,
      ratePerGram:    11283,
      rate24k:        15043,
      rate22k:        13789,
      rate18k:        11283,
      rateSource:     'fallback',
      rateProvider:   'MCX reference rate (Apr 2026)',
      karat:          '18K',
      weightMid:      7.5,
      ltvRatio:       0.75,
      ltvReference:   'RBI Circular RBI/2022-23/92'
    }
  }
};

export const getDemoResult = (scenario = 'genuine') => DEMO_SCENARIOS[scenario];
