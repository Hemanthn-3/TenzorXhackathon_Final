const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model fallback chain — try in order if one is overloaded
const MODEL_CHAIN = [
  'gemini-2.0-flash',       // Most stable free-tier model
  'gemini-2.5-flash',       // Newer but sometimes overloaded
  'gemini-flash-latest',    // Alias that routes to least-loaded flash
  'gemini-2.0-flash-lite',  // Lite fallback — fast, lower quality
];

// ── Session-level response cache ───────────────────────────────────────────────
// Key: hash of (promptType + first 200 chars of image data)
// Value: Gemini text response
// Stored in sessionStorage so it clears on tab close / new assessment
const CACHE_PREFIX = 'gs_gemini_cache_';

function makeCacheKey(systemPrompt, userText, imageDataURL) {
  // Use first 16 chars of system prompt (enough to distinguish analysis types)
  // + first 80 chars of image data (unique per image)
  const promptSig = systemPrompt.slice(0, 16).replace(/\s/g, '');
  const imageSig  = imageDataURL ? imageDataURL.slice(23, 103) : 'noimg'; // skip 'data:image/jpeg;base64,'
  const textSig   = userText.slice(0, 20).replace(/\s/g, '');
  return CACHE_PREFIX + btoa(`${promptSig}|${imageSig}|${textSig}`).slice(0, 40);
}

function getCached(key) {
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      console.info('Gemini cache hit — skipping API call');
      return JSON.parse(cached);
    }
  } catch { /* sessionStorage unavailable */ }
  return null;
}

function setCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

// ── API caller ────────────────────────────────────────────────────────────────
async function callModel(modelName, requestBody) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  return response;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function callGemini({ 
  systemPrompt, 
  userText, 
  imageDataURL, 
  maxTokens = 1000,
  useCache = true   // set false to force fresh call
}) {
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY not set in .env');
    alert('VITE_GEMINI_API_KEY is missing! Did you add it and restart your dev server?');
    return null;
  }

  // ── Check cache first ──────────────────────────────────────────────────────
  const cacheKey = makeCacheKey(systemPrompt, userText, imageDataURL ?? '');
  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
  }

  try {
    const parts = [{ text: userText }];

    if (imageDataURL) {
      const match = imageDataURL.match(/^data:(image\/[a-zA-Z]*);base64,(.*)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2]
          }
        });
      }
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: "user",
        parts: parts
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1,
      }
    };

    // ── Try each model in the fallback chain ────────────────────────────────
    for (let modelIdx = 0; modelIdx < MODEL_CHAIN.length; modelIdx++) {
      const modelName = MODEL_CHAIN[modelIdx];
      let retries = 2;

      while (retries > 0) {
        let response;
        try {
          response = await callModel(modelName, requestBody);
        } catch (networkErr) {
          console.warn(`Network error with ${modelName}:`, networkErr);
          break; // Try next model
        }

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            if (modelIdx > 0) {
              console.info(`Gemini: succeeded with fallback model ${modelName}`);
            }
            // Cache the successful response
            if (useCache) setCache(cacheKey, text);
            return text;
          }
          console.warn(`${modelName} returned empty response`, data);
          break; // Try next model
        }

        // Parse error
        let errBody;
        try { errBody = await response.json(); } catch { errBody = {}; }
        const errMsg = errBody?.error?.message || `HTTP ${response.status}`;
        const errCode = errBody?.error?.code;

        // 503 = overloaded → try next model immediately
        if (response.status === 503 || errCode === 503) {
          console.warn(`${modelName} overloaded. Trying next model…`);
          break;
        }

        // 429 = rate limited → short wait, then try next model
        if (response.status === 429) {
          console.warn(`${modelName} rate limited (${retries - 1} retries left)…`);
          if (retries === 1) {
            console.warn(`${modelName} exhausted retries, trying next model…`);
            break;
          }
          await new Promise(r => setTimeout(r, 3000));
          retries--;
          continue;
        }

        // Hard errors (400/401/403) — no point trying other models
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          console.error(`Gemini API hard error (${modelName}):`, errMsg);
          alert('Gemini API Error: ' + errMsg);
          return null;
        }

        break; // Unknown error — try next model
      }
    }

    // All models exhausted — return null, caller will use graceful fallback
    console.warn('All Gemini models exhausted — using graceful fallback');
    return null;

  } catch (error) {
    console.error('Gemini API call failed:', error);
    return null;
  }
}

// ── Utility: clear the Gemini cache (call on resetState) ──────────────────────
export function clearGeminiCache() {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => sessionStorage.removeItem(k));
    console.info(`Cleared ${keys.length} Gemini cache entries`);
  } catch { /* ignore */ }
}
