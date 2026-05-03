import { callGemini } from './geminiClient.js';
import { HALLMARK_PATTERNS, STAMP_TO_KARAT } from '../data/hallmarkPatterns.js';

export async function runHallmarkOCR(hallmarkImageDataURL) {

  // PRIMARY METHOD: Gemini Vision
  // Gemini can read gold-on-gold engravings like a human
  try {
    const geminiResponse = await Promise.race([
      callGemini({
        systemPrompt: `You are an expert gold hallmark reader specialising in Indian BIS gold jewelry.
          Your ONLY task is to read engraved or stamped markings on gold jewelry.
          You MUST look very carefully at all engraved, stamped, or embossed text.
          Return ONLY valid JSON, no markdown, no explanation.`,
        imageDataURL: hallmarkImageDataURL,
        useCache: false,  // Always fresh — hallmark images differ each time
        userText: `Examine this gold jewelry image VERY carefully for any hallmark stamps or engravings.
          
          CRITICAL: Look for these EXACT Indian BIS hallmark patterns:
          - "22K916" or "22K" or "916" (most common for 22 karat Indian gold)
          - "24K999" or "999" (24 karat pure gold)
          - "18K750" or "750" (18 karat)
          - "14K585" or "585" (14 karat)
          - "BIS", "KDM", "HUID", "NICG" (hallmarking authority marks)
          - Any combination like "\u25b3 22K916", "916 BIS", etc.
          
          The stamp may be very small, gold-colored on gold metal (hard to see).
          Look at ALL surfaces, edges, and inner surfaces of the ring/jewelry.
          
          Return EXACTLY this JSON (no other text):
          {
            "foundText": "ALL text you can read verbatim, e.g. 22K916 NICG1E AK D5",
            "hallmarkCode": "the purity code you found e.g. 916 or 750 or 999, or null",
            "karat": "the karat e.g. 22K or 18K or 24K, or null if not determinable",
            "confidence": 0.0,
            "notes": "what you see and where"
          }
          
          Set confidence 0.9 if you clearly read a hallmark, 0.7 if partially visible, 0.3 if unsure, 0.1 if nothing found.`
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject('gemini_timeout'), 20000)
      )
    ]);

    if (geminiResponse) {
      const cleaned = geminiResponse
        .replace(/```json|```/g, '')
        .trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        // Gemini returned text instead of JSON — try to extract karat from raw text
        const upper = geminiResponse.toUpperCase();
        for (const pattern of HALLMARK_PATTERNS) {
          if (upper.includes(pattern)) {
            return {
              detectedStamp: pattern,
              karat: STAMP_TO_KARAT[pattern] || null,
              confidence: 0.75,
              hallmarkNotInFrame: false,
              rawOCRText: geminiResponse,
              ocrSource: 'gemini-vision'
            };
          }
        }
      }

      if (parsed) {
        // Map hallmarkCode to karat
        let karat = parsed.karat;
        let detectedStamp = parsed.hallmarkCode;

        // Scan the foundText for any known patterns
        if (parsed.foundText) {
          const upper = parsed.foundText.toUpperCase().replace(/[\s\-_.]/g, '');
          // Check for combined stamps like "22K916"
          if (!detectedStamp || !karat) {
            if (upper.includes('22K916') || upper.includes('916')) {
              karat = karat || '22K';
              detectedStamp = detectedStamp || '916';
            } else if (upper.includes('24K999') || upper.includes('999')) {
              karat = karat || '24K';
              detectedStamp = detectedStamp || '999';
            } else if (upper.includes('18K750') || upper.includes('750')) {
              karat = karat || '18K';
              detectedStamp = detectedStamp || '750';
            } else if (upper.includes('14K585') || upper.includes('585')) {
              karat = karat || '14K';
              detectedStamp = detectedStamp || '585';
            } else if (upper.includes('22K')) {
              karat = karat || '22K';
              detectedStamp = detectedStamp || '916';
            } else if (upper.includes('18K')) {
              karat = karat || '18K';
              detectedStamp = detectedStamp || '750';
            }
          }
        }

        // Map stamp code to karat if karat still missing
        if (detectedStamp && !karat) {
          karat = STAMP_TO_KARAT[detectedStamp] || null;
        }

        const confidence = detectedStamp 
          ? Math.max(parsed.confidence || 0.80, 0.75)
          : (parsed.confidence < 0.3 ? 0.1 : parsed.confidence * 0.5);

        console.log('Gemini Vision OCR result:', parsed);

        return {
          detectedStamp: detectedStamp || null,
          karat: karat || null,
          confidence,
          hallmarkNotInFrame: !detectedStamp,
          rawOCRText: parsed.foundText || '',
          ocrSource: 'gemini-vision',
          geminiNotes: parsed.notes || ''
        };
      }
    }
  } catch (e) {
    console.warn('Gemini Vision OCR failed:', e);
  }

  // FALLBACK METHOD: Tesseract on preprocessed image
  try {
    const processedDataURL = await quickPreprocess(hallmarkImageDataURL);
    const Tesseract = await import('tesseract.js');

    const [r1, r2] = await Promise.all([
      Tesseract.recognize(processedDataURL.normal, 'eng'),
      Tesseract.recognize(processedDataURL.inverted, 'eng')
    ]);

    const combined = (
      (r1.data?.text || '') + ' ' + (r2.data?.text || '')
    ).toUpperCase().replace(/[\s\-_.]/g, '');

    console.log('Tesseract combined text:', combined);

    let detectedStamp = null;
    let karat = null;

    for (const pattern of HALLMARK_PATTERNS) {
      if (combined.includes(pattern)) {
        detectedStamp = pattern;
        karat = STAMP_TO_KARAT[pattern];
        break;
      }
    }

    // Fuzzy
    if (!detectedStamp) {
      const fuzzyMap = {
        '22K': ['22K','22k','22K916','22KG16'],
        '916': ['916','91G','9I6'],
        '750': ['750','75O'],
        '18K': ['18K','18k'],
        '585': ['585'],
        'BIS': ['BIS','B1S']
      };
      for (const [actual, variants] of Object.entries(fuzzyMap)) {
        if (variants.some(v => combined.includes(v))) {
          detectedStamp = STAMP_TO_KARAT[actual] ? actual : '916';
          karat = STAMP_TO_KARAT[actual] || '22K';
          break;
        }
      }
    }

    return {
      detectedStamp,
      karat,
      confidence: detectedStamp ? 0.65 : 0.1,
      hallmarkNotInFrame: !detectedStamp,
      rawOCRText: combined,
      ocrSource: 'tesseract'
    };

  } catch (tessErr) {
    console.error('Tesseract fallback failed:', tessErr);
  }

  return {
    detectedStamp: null,
    karat: null,
    confidence: 0.1,
    hallmarkNotInFrame: true,
    rawOCRText: '',
    ocrSource: 'error'
  };
}

// Fast preprocessing (no slow adaptive threshold)
async function quickPreprocess(dataURL) {
  const img = new Image();
  img.src = dataURL;
  await new Promise(r => img.onload = r);

  const canvas = document.createElement('canvas');
  canvas.width  = img.width  * 3;
  canvas.height = img.height * 3;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;

  // Grayscale + high contrast
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 77 + d[i+1] * 150 + d[i+2] * 29) >> 8;
    const c = Math.min(255, Math.max(0, (g - 128) * 2.5 + 128));
    d[i] = d[i+1] = d[i+2] = c;
  }
  ctx.putImageData(id, 0, 0);
  const normal = canvas.toDataURL('image/png');

  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i+1] = d[i+2] = 255 - d[i];
  }
  ctx.putImageData(id, 0, 0);
  const inverted = canvas.toDataURL('image/png');

  return { normal, inverted };
}
