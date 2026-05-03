import { getCachedModel } from './modelCache.js';
import { loadMobileNet } from './modelLoader.js';

const baseRanges = {
  ring:    { low: 4,  high: 8  },
  chain:   { low: 8,  high: 20 },
  bangle:  { low: 15, high: 35 },
  earring: { low: 2,  high: 6  },
  pendant: { low: 3,  high: 10 },
  default: { low: 5,  high: 15 }
};

export async function estimateWeight(
  imageDataURL, jewelryType, declaredWeight, referenceObject
) {
  try {
    const img = new Image();
    img.src = imageDataURL;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load image element'));
    });

    // ── STEP 1: Jewelry Classification via MobileNet ──
    const mobilenet = await getCachedModel('mobilenet', loadMobileNet);
    const mobileNetPreds = await mobilenet.classify(img, 5);
    
    const jewelryKeywords = {
      ring:    ['ring',    'jewelry', 'band',      'loop',    'circle'],
      chain:   ['chain',   'necklace','rope',       'bead',    'necklet'],
      bangle:  ['bangle',  'bracelet','wristband',  'cuff'],
      earring: ['earring', 'ear',     'stud',       'hoop'],
      pendant: ['pendant', 'locket',  'charm',      'amulet']
    };

    let detectedType = jewelryType || 'default';
    let foundMatch   = false;

    for (const pred of mobileNetPreds) {
      if (foundMatch) break;
      if (pred.probability > 0.15) {
        const lower = pred.className.toLowerCase();
        for (const [type, keywords] of Object.entries(jewelryKeywords)) {
          if (keywords.some(kw => lower.includes(kw))) {
            detectedType = type;
            foundMatch   = true;
            break;
          }
        }
      }
    }

    // ── STEP 2: Type-based Weight Estimation (No COCO-SSD) ──
    const range = baseRanges[detectedType] || baseRanges.default;
    let weightLow = range.low;
    let weightHigh = range.high;

    if (declaredWeight > 0) {
      weightLow = declaredWeight * 0.85;
      weightHigh = declaredWeight * 1.15;
    }

    return {
      weightLow:  Math.round(weightLow  * 10) / 10,
      weightHigh: Math.round(weightHigh * 10) / 10,
      unit: 'g',
      confidence: declaredWeight > 0 ? 0.80 : 0.65,
      detectedType: detectedType,
      cocoDetected: 'none',
      calibrationSource: 'type-based',
      referenceObjectUsed: referenceObject?.label || 'none'
    };
  } catch (err) {
    console.error('Weight estimation failed:', err);
    return {
      weightLow: 4, weightHigh: 10,
      unit: 'g', confidence: 0.5,
      detectedType: jewelryType || 'unknown',
      cocoDetected: 'none',
      calibrationSource: 'fallback',
      referenceObjectUsed: 'none'
    };
  }
}
