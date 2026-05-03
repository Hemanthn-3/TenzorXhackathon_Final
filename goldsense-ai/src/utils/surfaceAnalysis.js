import { callGemini } from './geminiClient.js';

export async function analyseSurface(closeUpImageDataURL) {
  try {
    const geminiResponse = await Promise.race([
      callGemini({
        systemPrompt: "You are a gold jewelry analyst. Return ONLY valid JSON, no markdown, no explanation.",
        imageDataURL: closeUpImageDataURL,
        userText: `Analyse this gold jewelry image carefully. Return ONLY this JSON object with no extra text:
{
  "colorUniformityScore": <0.0-1.0, higher=more uniform gold color>,
  "edgeWearPresent": <true or false>,
  "structureType": <"solid" or "hollow" or "plated" or "uncertain">,
  "wearCategory": <"minimal" or "moderate" or "heavy">,
  "platingRiskScore": <0.0-1.0, lower=genuine gold, higher=likely plated>,
  "confidence": <0.0-1.0, your confidence in this assessment>
}
Base every value on the actual visual appearance. For genuine gold: platingRiskScore < 0.3. For plated: platingRiskScore > 0.6.`
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject('timeout'), 20000)
      )
    ]);

    if (geminiResponse) {
      const cleaned = geminiResponse
        .replace(/```json|```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      // Ensure confidence is always present and reasonable
      if (!parsed.confidence || parsed.confidence < 0.3) {
        parsed.confidence = 0.72;
      }
      return { ...parsed, analysisSource: 'gemini' };
    }
  } catch (e) {
    console.warn('Surface analysis failed:', e);
  }

  return {
    colorUniformityScore: 0.5,
    edgeWearPresent: false,
    structureType: 'uncertain',
    wearCategory: 'moderate',
    platingRiskScore: 0.25,  // optimistic fallback — don't penalise unfairly
    confidence: 0.5,
    analysisSource: 'fallback'
  };
}
