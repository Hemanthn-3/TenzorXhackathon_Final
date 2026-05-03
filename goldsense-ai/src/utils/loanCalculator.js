/**
 * loanCalculator.js
 * Computes a gold-backed loan offer range using live or fallback gold rates.
 *
 * Rate waterfall:
 *   SOURCE 1 — gold-api.com  (no key, CORS-enabled, completely free)
 *   SOURCE 2 — GoldAPI.io    (VITE_GOLDAPI_KEY env var, free tier 100 calls/month)
 *   SOURCE 3 — MCX reference hardcode (Apr 2026 actuals)
 */

/**
 * @returns {Promise<{
 *   ratePerGram: number,
 *   rateSource: string,
 *   rateProvider: string,
 *   timestamp: string,
 *   rate24k: number,
 *   rate22k: number,
 *   rate18k: number
 * }>}
 */
export async function fetchLiveGoldRate() {

  // SOURCE 1: gold-api.com — completely free, no key, CORS enabled
  try {
    const [goldRes, forexRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU'),
      fetch('https://api.gold-api.com/price/USDINR').catch(() => null)
    ]);

    if (goldRes.ok) {
      const goldData = await goldRes.json();

      // Get USD→INR rate (fallback to recent approximation)
      let usdToInr = 94.78;
      if (forexRes && forexRes.ok) {
        const forexData = await forexRes.json();
        usdToInr = forexData.price || 94.78;
      }

      const pricePerOunceUSD = goldData.price;
      const rate24k = Math.round((pricePerOunceUSD / 31.1035) * usdToInr);
      const rate22k = Math.round(rate24k * 0.916);
      const rate18k = Math.round(rate24k * 0.75);

      return {
        rate24k,
        rate22k,
        rate18k,
        ratePerGram: rate22k,
        rateSource:  'live',
        rateProvider: 'gold-api.com',
        timestamp:   new Date().toISOString()
      };
    }
  } catch (e) { console.warn('gold-api.com failed:', e); }

  // SOURCE 2: GoldAPI.io — needs VITE_GOLDAPI_KEY (free at goldapi.io/dashboard)
  try {
    const GOLDAPI_KEY = import.meta.env.VITE_GOLDAPI_KEY || '';
    if (GOLDAPI_KEY) {
      const res = await fetch('https://www.goldapi.io/api/XAU/INR', {
        headers: { 'x-access-token': GOLDAPI_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.price_gram_22k) {
          return {
            rate24k:     Math.round(data.price_gram_24k),
            rate22k:     Math.round(data.price_gram_22k),
            rate18k:     Math.round(data.price_gram_18k),
            ratePerGram: Math.round(data.price_gram_22k),
            rateSource:  'live',
            rateProvider: 'GoldAPI.io',
            change:      data.ch  || 0,
            changePct:   data.chp || 0,
            timestamp:   new Date().toISOString()
          };
        }
      }
    }
  } catch (e) { console.warn('GoldAPI.io failed:', e); }

  // SOURCE 3: MCX reference hardcode (updated Apr 2026 actual rates)
  console.warn('All live APIs failed — using MCX reference rates');
  return {
    rate24k:     15043,
    rate22k:     13789,
    rate18k:     11283,
    ratePerGram: 13789,
    rateSource:  'fallback',
    rateProvider: 'MCX reference rate (Apr 2026)',
    timestamp:   new Date().toISOString()
  };
}


/**
 * @param {{ weightEstimate, ocrResult, userInputs }} params
 * @returns {Promise<{
 *   loanLow: number, loanHigh: number,
 *   collateralLow: number, collateralHigh: number,
 *   ratePerGram: number, rate24k: number, rate22k: number, rate18k: number,
 *   rateSource: string, rateProvider: string, timestamp: string,
 *   karat: string, weightMid: number,
 *   ltvRatio: number, ltvReference: string
 * }>}
 */
export async function calculateLoan({ weightEstimate, ocrResult, userInputs }) {
  const goldRate = await fetchLiveGoldRate();

  const karat = ocrResult?.karat ?? userInputs?.declaredKarat ?? '22K';
  const purityFactor = {
    '24K': 1.0, '22K': 0.916, '21K': 0.875,
    '18K': 0.75, '14K': 0.585, '9K': 0.375
  }[karat] ?? 0.916;

  // Use karat-specific rate directly if available
  const ratePerGram = karat === '24K' ? goldRate.rate24k
    : karat === '22K' ? goldRate.rate22k
    : karat === '18K' ? goldRate.rate18k
    : Math.round(goldRate.rate22k * purityFactor / 0.916);

  const weightMid = (weightEstimate.weightLow + weightEstimate.weightHigh) / 2;

  // Collateral = weight × purity-adjusted rate (per RBI gold loan guidelines)
  const collateralLow  = Math.round(weightEstimate.weightLow  * ratePerGram);
  const collateralHigh = Math.round(weightEstimate.weightHigh * ratePerGram);

  // Loan = collateral × 75% LTV (per RBI Circular RBI/2022-23/92)
  const loanLow  = Math.round(collateralLow  * 0.75);
  const loanHigh = Math.round(collateralHigh * 0.75);

  return {
    loanLow,
    loanHigh,
    collateralLow,
    collateralHigh,
    ratePerGram,
    rate24k: goldRate.rate24k,
    rate22k: goldRate.rate22k,
    rate18k: goldRate.rate18k,
    rateSource: goldRate.rateSource,
    rateProvider: goldRate.rateProvider,
    timestamp: goldRate.timestamp,
    karat,
    weightMid: Math.round(weightMid * 10) / 10,
    ltvRatio: 0.75,
    ltvReference: 'RBI Circular RBI/2022-23/92'
  };
}
