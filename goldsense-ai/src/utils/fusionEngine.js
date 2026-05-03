/**
 * fusionEngine.js
 * Combines all signal sub-scores into a single weighted confidence score
 * and determines routing (PRE_QUALIFIED / LIKELY_ELIGIBLE / NEEDS_VERIFICATION).
 */

/**
 * @param {{ ocrResult, acousticResult, surfaceResult, weightEstimate, userInputs, fraudResult }} params
 * @returns {{ overallScore: number, routing: string, signalBreakdown: array }}
 */
export function computeFusionScore({
  ocrResult,
  acousticResult,
  surfaceResult,
  weightEstimate,
  userInputs,
  fraudResult,
}) {
  // ── Sub-scores ────────────────────────────────────────────────────────────
  let hallmarkSubScore = 0.1;
  const ocrSrc = ocrResult?.ocrSource ?? '';
  const hasKarat = !!ocrResult?.karat;
  const rawConf = ocrResult?.confidence ?? 0;

  if (ocrSrc === 'gemini-vision' || ocrSrc === 'openai-vision' || ocrSrc === 'trocr') {
    // AI vision sources are high confidence
    hallmarkSubScore = hasKarat
      ? Math.min(rawConf * 1.05, 0.95)
      : Math.max(rawConf * 0.6, 0.35); // partial score even without karat
  } else if (ocrSrc === 'tesseract') {
    hallmarkSubScore = rawConf;
  } else if (ocrSrc === 'error') {
    hallmarkSubScore = 0.05;
  } else if (hasKarat) {
    // No AI source, but karat is known (declared by user with boosted confidence)
    // User-declared karat is a meaningful signal — treat it fairly
    hallmarkSubScore = rawConf >= 0.6 ? rawConf * 0.90 : rawConf;
  } else {
    hallmarkSubScore = 0.25; // No source, no karat
  }

  let baseScore = 1 - (surfaceResult?.platingRiskScore ?? 0.25);
  let surfaceSubScore = baseScore;
  const surfSrc = surfaceResult?.analysisSource ?? '';
  if (surfSrc === 'gemini' || surfSrc === 'openai' || surfSrc === 'clip+claude') {
    surfaceSubScore = baseScore; // full weight for AI-analyzed sources
  } else if (surfSrc === 'clip') {
    surfaceSubScore = baseScore * 0.9;
  } else if (surfSrc === 'fallback') {
    surfaceSubScore = baseScore * 0.85; // slightly penalise but not crush
  }

  let acousticSubScore;
  if (acousticResult === null || acousticResult === undefined) {
    acousticSubScore = 0.55;                                     // skipped → slightly optimistic neutral
  } else if (acousticResult?.noSignal === true || acousticResult?.material === 'No signal') {
    acousticSubScore = 0.45;
  } else if (acousticResult?.material?.includes('Plated')) {
    acousticSubScore = 0.05;                                     // strong negative signal
  } else {
    acousticSubScore = acousticResult?.matchProbability ?? 0.5;
  }

  const geometricSubScore = weightEstimate?.confidence ?? 0.65;
  const declaredSubScore  = (userInputs?.declaredWeight ?? 0) > 0 ? 0.85 : 0.5;

  // ── Weighted sum ────────────────────────────────────────────────────────────
  // Acoustic is de-weighted since it's almost always skipped (null)
  // Hallmark gets higher weight as it's the most reliable signal
  const WEIGHTS = { hallmark: 0.40, surface: 0.25, acoustic: 0.15, geometric: 0.10, declared: 0.10 };

  const overallScore =
    hallmarkSubScore  * WEIGHTS.hallmark  +
    surfaceSubScore   * WEIGHTS.surface   +
    acousticSubScore  * WEIGHTS.acoustic  +
    geometricSubScore * WEIGHTS.geometric +
    declaredSubScore  * WEIGHTS.declared;

  // ── Signal breakdown ────────────────────────────────────────────────────────
  const signalBreakdown = [
    {
      signal:       'Hallmark OCR',
      weight:       WEIGHTS.hallmark,
      subScore:     hallmarkSubScore,
      contribution: hallmarkSubScore * WEIGHTS.hallmark,
      label:        ocrResult?.karat ? `${ocrResult.karat} (${ocrResult.ocrSource || 'unknown'})` : 'Not detected',
    },
    {
      signal:       'Surface Analysis',
      weight:       WEIGHTS.surface,
      subScore:     surfaceSubScore,
      contribution: surfaceSubScore * WEIGHTS.surface,
      label:        `${surfaceResult?.wearCategory ?? 'Analysed'} · ${surfaceResult?.analysisSource ?? 'unknown'}`,
    },
    {
      signal:       'Acoustic Test',
      weight:       WEIGHTS.acoustic,
      subScore:     acousticSubScore,
      contribution: acousticSubScore * WEIGHTS.acoustic,
      label:        acousticResult?.noSignal ? 'No signal detected' : (acousticResult?.material ?? 'Skipped'),
    },
    {
      signal:       'Weight Estimate',
      weight:       WEIGHTS.geometric,
      subScore:     geometricSubScore,
      contribution: geometricSubScore * WEIGHTS.geometric,
      label:        `${weightEstimate?.weightLow ?? '?'}–${weightEstimate?.weightHigh ?? '?'}g`,
    },
    {
      signal:       'Declared Info',
      weight:       WEIGHTS.declared,
      subScore:     declaredSubScore,
      contribution: declaredSubScore * WEIGHTS.declared,
      label:        (userInputs?.declaredWeight ?? 0) > 0
                      ? `${userInputs.declaredWeight}g`
                      : 'Not provided',
    },
  ];

  // ── Routing ─────────────────────────────────────────────────────────────────
  let routing;
  if (overallScore >= 0.72 && fraudResult?.overallRisk !== 'HIGH') {
    routing = 'PRE_QUALIFIED';
  } else if (overallScore >= 0.42 && fraudResult?.overallRisk !== 'HIGH') {
    routing = 'LIKELY_ELIGIBLE';  // Lowered from 0.45 — catches genuine items with declared karat
  } else {
    routing = 'NEEDS_VERIFICATION';
  }

  // Only force NEEDS_VERIFICATION if ALL signals are simultaneously absent/failed
  const ocrConf = ocrResult?.confidence ?? 0;
  const surfaceConf = surfaceResult?.confidence ?? 0;
  const hasAISource = ocrSrc === 'gemini-vision' || ocrSrc === 'openai-vision' || ocrSrc === 'trocr';
  // Use 0.12 threshold — declared karat gives 0.65 confidence, so this shouldn't trigger
  if (ocrConf < 0.12 && surfaceConf < 0.12 && !acousticResult && !hasAISource) {
    routing = 'NEEDS_VERIFICATION';
  }

  return {
    overallScore: parseFloat(overallScore.toFixed(4)),
    routing,
    signalBreakdown,
  };
}
