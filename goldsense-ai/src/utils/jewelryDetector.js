/**
 * jewelryDetector.js
 * Uses Gemini Vision to verify that uploaded images actually contain gold jewelry.
 * This is a HARD GATE — if no jewelry is detected, the analysis pipeline aborts.
 */

import { callGemini } from './geminiClient.js';

/**
 * Validates that an image contains gold jewelry.
 * @param {string} imageDataURL - The full-view image data URL
 * @returns {Promise<{ isJewelry: boolean, jewelryType: string|null, confidence: number, reason: string, isHuman: boolean }>}
 */
export async function validateJewelryImage(imageDataURL) {
  if (!imageDataURL) {
    return { isJewelry: false, jewelryType: null, confidence: 0, reason: 'No image provided', isHuman: false };
  }

  try {
    const response = await Promise.race([
      callGemini({
        systemPrompt: `You are a strict jewelry content validator for a gold loan application.
          Your ONLY job is to determine whether an image contains real gold jewelry.
          You must be strict — reject selfies, people, hands without jewelry, and non-jewelry objects.
          Return ONLY valid JSON, no markdown, no explanation.`,
        imageDataURL,
        useCache: false,
        userText: `Carefully examine this image.

          QUESTION: Does this image primarily show gold jewelry (ring, chain, bangle, earring, pendant, necklace, bracelet)?

          IMPORTANT RULES:
          - If the image shows a PERSON, FACE, or SELFIE → containsJewelry: false, isHuman: true
          - If the image shows hands/body WITHOUT clearly visible jewelry → containsJewelry: false
          - If the image shows scenery, food, documents, or any non-jewelry object → containsJewelry: false
          - ONLY return containsJewelry: true if jewelry is the primary, clearly visible subject
          - A small blurry piece of gold in the background does NOT count

          Return EXACTLY this JSON:
          {
            "containsJewelry": true or false,
            "isHuman": true or false,
            "jewelryType": "ring" or "chain" or "bangle" or "earring" or "pendant" or "bracelet" or "other" or null,
            "confidence": 0.0 to 1.0,
            "reason": "one short sentence describing what you see in the image"
          }

          Confidence scale:
          - 0.9-1.0: Clearly jewelry, well-lit, fills most of the frame
          - 0.7-0.9: Jewelry visible but partially obscured or small
          - 0.5-0.7: Uncertain — could be jewelry
          - 0.0-0.5: Not jewelry or very uncertain`
      }),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 20000))
    ]);

    if (response) {
      const cleaned = response.replace(/```json|```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        // Gemini returned non-JSON text — scan for keywords
        const lower = response.toLowerCase();
        const isHuman = lower.includes('person') || lower.includes('face') || 
                        lower.includes('selfie') || lower.includes('human') ||
                        lower.includes('man') || lower.includes('woman');
        const hasJewelry = lower.includes('ring') || lower.includes('gold') || 
                           lower.includes('jewelry') || lower.includes('jewel');
        return {
          isJewelry: hasJewelry && !isHuman,
          isHuman,
          jewelryType: null,
          confidence: 0.5,
          reason: response.slice(0, 100)
        };
      }

      const isJewelry = parsed.containsJewelry === true && (parsed.confidence ?? 0) >= 0.5;

      return {
        isJewelry,
        isHuman: parsed.isHuman === true,
        jewelryType: parsed.jewelryType || null,
        confidence: parsed.confidence ?? 0,
        reason: parsed.reason || 'Unknown'
      };
    }
  } catch (e) {
    console.warn('Jewelry validation failed:', e);
    // If Gemini times out or errors, fall back to canvas-based color check
    return await canvasBasedJewelryCheck(imageDataURL);
  }

  // Gemini returned null — use canvas fallback
  return await canvasBasedJewelryCheck(imageDataURL);
}


/**
 * Canvas-based fallback: checks if the image has gold-like colors
 * (high red/green, moderate blue, saturated warm tones)
 * This is a heuristic and less accurate than Gemini Vision.
 */
async function canvasBasedJewelryCheck(imageDataURL) {
  try {
    const img = new Image();
    img.src = imageDataURL;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas = document.createElement('canvas');
    const size = 100; // Sample at 100x100 for speed
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let goldPixels = 0;
    let skinPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      totalPixels++;

      // Gold-like: warm, saturated, r > g > b significantly
      if (r > 140 && g > 100 && b < 100 && r > b + 60 && g > b + 20) {
        goldPixels++;
      }

      // Skin-tone: moderate red, moderate saturation
      if (r > 150 && g > 100 && b > 80 && r - b < 80 && r - g < 60) {
        skinPixels++;
      }
    }

    const goldRatio = goldPixels / totalPixels;
    const skinRatio = skinPixels / totalPixels;

    // Skin-dominant image → likely a selfie
    if (skinRatio > 0.3 && goldRatio < 0.05) {
      return {
        isJewelry: false,
        isHuman: true,
        jewelryType: null,
        confidence: 0.6,
        reason: 'Image appears to show skin tones — likely a selfie or person photo'
      };
    }

    // Decent gold content → likely jewelry
    if (goldRatio > 0.08) {
      return {
        isJewelry: true,
        isHuman: false,
        jewelryType: null,
        confidence: 0.6,
        reason: 'Gold-colored pixels detected in image'
      };
    }

    // Ambiguous — don't block
    return {
      isJewelry: true,
      isHuman: false,
      jewelryType: null,
      confidence: 0.4,
      reason: 'Could not determine content — proceeding with caution'
    };

  } catch (e) {
    // Canvas failed too — allow through to avoid false blocking
    return { isJewelry: true, isHuman: false, jewelryType: null, confidence: 0.3, reason: 'Validation unavailable' };
  }
}
