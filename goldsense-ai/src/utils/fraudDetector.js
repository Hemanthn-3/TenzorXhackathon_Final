/**
 * fraudDetector.js
 * Cross-checks all signals for inconsistencies that suggest fraud or mislabelling.
 */

/**
 * @param {{ ocrResult, acousticResult, surfaceResult, weightEstimate, userInputs }} params
 * @returns {{ flags: array, highRiskCount: number, mediumRiskCount: number, overallRisk: string }}
 */
export function detectFraud({ ocrResult, acousticResult, surfaceResult, weightEstimate, userInputs }) {
  const flags = [];
  const goldKarats = ['22K', '24K', '18K'];

  // CHECK 1 — Hallmark vs Acoustic mismatch
  if (
    ocrResult?.karat && goldKarats.includes(ocrResult.karat) &&
    acousticResult !== null &&
    !acousticResult?.noSignal &&
    acousticResult?.material?.includes('Plated')
  ) {
    const acousticConf = acousticResult?.matchProbability ?? 0;
    // Only flag HIGH if acoustic reading is highly confident (>= 0.80)
    // Otherwise flag as MEDIUM — low-confidence acoustic readings are unreliable
    flags.push({
      severity: acousticConf >= 0.80 ? 'HIGH' : 'MEDIUM',
      check:    'ocr_acoustic',
      reason:   acousticConf >= 0.80
        ? 'Hallmark indicates gold but acoustic signature matches plated metal'
        : 'Acoustic reading suggests possible plating — low confidence signal, branch verification advised',
    });
  }

  // CHECK 2 — Visual-Acoustic conflict
  if (
    (surfaceResult?.platingRiskScore ?? 0) > 0.7 &&
    acousticResult !== null &&
    (acousticResult?.matchProbability ?? 0) > 0.8 &&
    !acousticResult?.material?.includes('Plated')
  ) {
    flags.push({
      severity: 'MEDIUM',
      check:    'visual_acoustic',
      reason:   'Surface analysis suggests plating but acoustic matches genuine gold',
    });
  }

  // CHECK 3 — Declared weight sanity
  if (userInputs?.declaredWeight > 0 && weightEstimate) {
    const geometricMid = (weightEstimate.weightLow + weightEstimate.weightHigh) / 2;
    const deviation    = Math.abs(userInputs.declaredWeight - geometricMid) / geometricMid;
    if (deviation > 0.6) {
      flags.push({
        severity: 'MEDIUM',
        check:    'weight_sanity',
        reason:   'Declared weight differs significantly from visual estimate',
      });
    }
  }

  // CHECK 4 — Multi-image consistency (only flag if acoustic clearly disagrees AND plating risk high)
  // NOTE: only fire this if we have concrete conflicting signals, NOT just acoustic noise
  if (
    acousticResult !== null &&
    !acousticResult?.noSignal &&
    acousticResult?.material?.includes('Plated') &&
    (surfaceResult?.platingRiskScore ?? 0) > 0.6 &&
    ocrResult?.karat && goldKarats.includes(ocrResult.karat)
  ) {
    // Only add if Check 1 didn't already fire (avoid duplicate HIGH flags)
    const alreadyFlagged = flags.some(f => f.check === 'ocr_acoustic');
    if (!alreadyFlagged) {
      flags.push({
        severity: 'MEDIUM',
        check:    'image_consistency',
        reason:   'Multiple signals suggest potential plating — recommend physical verification',
      });
    }
  }

  const highRiskCount   = flags.filter(f => f.severity === 'HIGH').length;
  const mediumRiskCount = flags.filter(f => f.severity === 'MEDIUM').length;
  const overallRisk     = highRiskCount > 0 ? 'HIGH'
                        : mediumRiskCount > 0 ? 'MEDIUM'
                        : 'CLEAR';

  return { flags, highRiskCount, mediumRiskCount, overallRisk };
}
