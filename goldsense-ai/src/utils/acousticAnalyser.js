import { MATERIAL_LIBRARY } from '../data/materialLibrary.js';

/**
 * Request microphone permission and return the MediaStream.
 * Throws if the user denies or the API is unavailable.
 */
export async function requestMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API not available in this browser.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return stream;
}

/**
 * Record exactly 3 000 ms from the given stream.
 * Resolves with a Blob containing the recorded audio.
 */
export function startRecording(stream) {
  return new Promise((resolve, reject) => {
    // Pick a supported MIME type
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      '',
    ].find(t => t === '' || MediaRecorder.isTypeSupported(t));

    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      return reject(e);
    }

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onerror        = e => reject(e.error ?? e);
    recorder.onstop         = () => resolve(new Blob(chunks, { type: mimeType || 'audio/webm' }));

    recorder.start();
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 3000);
  });
}

export async function analyseAudio(audioBlob) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // NOISE FLOOR CHECK — detect silence
    const rms = Math.sqrt(channelData.reduce((sum, s) => sum + s*s, 0) / channelData.length);
    if (rms < 0.01) {
      return {
        material: 'No signal',
        matchProbability: 0,
        frequencyPeak: 0,
        decayMs: 0,
        noSignal: true,
        message: 'No tap detected — tap louder and closer to microphone'
      };
    }
    
    // FIND DOMINANT PEAK in time domain
    let peakAmplitude = 0;
    let peakSampleIndex = 0;
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > peakAmplitude) {
        peakAmplitude = Math.abs(channelData[i]);
        peakSampleIndex = i;
      }
    }
    
    // FREQUENCY ANALYSIS using FFT on peak region
    const fftSize = 2048;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    
    const freqData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqData);
    
    // Find peak frequency bin (ignore DC component, start from bin 5)
    let peakBin = 5;
    let peakDb = freqData[5];
    for (let i = 5; i < freqData.length; i++) {
      if (freqData[i] > peakDb) {
        peakDb = freqData[i];
        peakBin = i;
      }
    }
    const peakHz = (peakBin / fftSize) * sampleRate;
    
    // DECAY TIME — samples from peak to 10% of peak amplitude
    const threshold = peakAmplitude * 0.10;
    let decaySamples = 0;
    for (let i = peakSampleIndex; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) <= threshold) break;
      decaySamples++;
    }
    const decayMs = (decaySamples / sampleRate) * 1000;
    
    // CLAMP values to realistic ranges
    const clampedHz = Math.min(Math.max(peakHz, 500), 8000);
    const clampedDecay = Math.min(Math.max(decayMs, 10), 400);
    
    const matchResult = matchMaterial(clampedHz, clampedDecay);
    
    await audioContext.close();
    
    return {
      ...matchResult,
      frequencyPeak: Math.round(clampedHz),
      decayMs: Math.round(clampedDecay),
      peakAmplitude: Math.round(peakAmplitude * 100) / 100,
      rms: Math.round(rms * 1000) / 1000
    };
  } catch (err) {
    console.error('analyseAudio error', err);
    return {
      material: 'Error',
      matchProbability: 0,
      frequencyPeak: 0,
      decayMs: 0,
      noSignal: true,
      message: 'Failed to process audio'
    };
  }
}

export function matchMaterial(peakHz, decayMs) {
  // Guard: invalid readings
  if (peakHz < 100 || decayMs < 5) {
    return { material: 'No signal', matchProbability: 0, noSignal: true };
  }
  
  // Get min/max for normalisation
  const allPeaks = MATERIAL_LIBRARY.map(m => m.peak);
  const allDecays = MATERIAL_LIBRARY.map(m => m.decay);
  const minPeak = Math.min(...allPeaks);
  const maxPeak = Math.max(...allPeaks);
  const minDecay = Math.min(...allDecays);
  const maxDecay = Math.max(...allDecays);
  
  const normMeasuredPeak = (peakHz - minPeak) / (maxPeak - minPeak);
  const normMeasuredDecay = (decayMs - minDecay) / (maxDecay - minDecay);
  
  // Score each material using weighted Euclidean distance
  // Peak frequency is more reliable → weight 1.5x
  const scores = MATERIAL_LIBRARY.map(material => {
    const normLibPeak = (material.peak - minPeak) / (maxPeak - minPeak);
    const normLibDecay = (material.decay - minDecay) / (maxDecay - minDecay);
    
    const distance = Math.sqrt(
      Math.pow((normMeasuredPeak - normLibPeak) * 1.5, 2) +
      Math.pow((normMeasuredDecay - normLibDecay) * 1.0, 2)
    );
    
    // Convert distance to similarity score (0-1)
    const similarity = 1 / (1 + distance * 3);
    
    return { material: material.name, matchProbability: similarity, distance };
  });
  
  // Sort by similarity, pick best
  scores.sort((a, b) => b.matchProbability - a.matchProbability);
  const best = scores[0];
  
  // Normalize: best match gets boosted, others fall
  const normalized = Math.min(0.97, best.matchProbability * 1.4);
  
  return {
    material: best.material,
    matchProbability: Math.round(normalized * 100) / 100,
    allScores: scores.map(s => ({ material: s.material, score: Math.round(s.matchProbability * 100) })),
    noSignal: false
  };
}
