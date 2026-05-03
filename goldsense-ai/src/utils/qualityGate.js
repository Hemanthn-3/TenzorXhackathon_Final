/**
 * qualityGate.js
 * Analyses an image dataURL for blur, brightness, and auto-crops it.
 */

// 3×3 Laplacian kernel
const LAPLACIAN = [
  0,  1,  0,
  1, -4,  1,
  0,  1,  0,
];

/**
 * Load a dataURL into an HTMLImageElement (works in browser).
 */
function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Convert RGBA pixel array to grayscale array (same length as pixel count).
 */
function toGrayscale(data, width, height) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

/**
 * Apply 3×3 Laplacian kernel and return the variance of the response.
 * Higher variance = sharper image.
 */
function laplacianVariance(gray, width, height, bounds = null) {
  let sum = 0;
  let count = 0;
  
  const startX = bounds ? Math.max(1, bounds.minX) : 1;
  const endX   = bounds ? Math.min(width - 1, bounds.maxX) : width - 1;
  const startY = bounds ? Math.max(1, bounds.minY) : 1;
  const endY   = bounds ? Math.min(height - 1, bounds.maxY) : height - 1;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const k = [
        gray[(y - 1) * width + (x - 1)], gray[(y - 1) * width + x], gray[(y - 1) * width + (x + 1)],
        gray[y       * width + (x - 1)], gray[y       * width + x], gray[y       * width + (x + 1)],
        gray[(y + 1) * width + (x - 1)], gray[(y + 1) * width + x], gray[(y + 1) * width + (x + 1)],
      ];
      let lap = 0;
      for (let i = 0; i < 9; i++) lap += LAPLACIAN[i] * k[i];
      sum += lap * lap;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Compute mean brightness from grayscale values.
 */
function meanBrightness(gray) {
  let total = 0;
  for (let i = 0; i < gray.length; i++) total += gray[i];
  return gray.length > 0 ? total / gray.length : 0;
}

/**
 * Find the bounding box of "foreground" pixels using a simple edge threshold.
 * Returns { minX, minY, maxX, maxY }.
 */
function findBoundingBox(gray, width, height, threshold = 20) {
  let minX = width, maxX = 0, minY = height, maxY = 0;
  // Background is estimated as the average of corner pixels
  const corners = [
    gray[0],
    gray[width - 1],
    gray[(height - 1) * width],
    gray[(height - 1) * width + width - 1],
  ];
  const bg = corners.reduce((a, b) => a + b, 0) / 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs(gray[y * width + x] - bg) > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fall back to full image if nothing meaningful found
  if (minX >= maxX || minY >= maxY) {
    return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  }

  // Add 5% padding
  const padX = Math.round((maxX - minX) * 0.05);
  const padY = Math.round((maxY - minY) * 0.05);
  return {
    minX: Math.max(0, minX - padX),
    minY: Math.max(0, minY - padY),
    maxX: Math.min(width - 1, maxX + padX),
    maxY: Math.min(height - 1, maxY + padY),
  };
}

/**
 * Main export.
 * @param {string} dataURL  - image as data URL
 * @param {number|string} slot - slot identifier (for future logging)
 * @returns {Promise<{ pass: boolean, reason?: string, message?: string, croppedURL?: string }>}
 */
export async function analyseImageQuality(dataURL, slot) {
  const img = await loadImage(dataURL);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = toGrayscale(imageData.data, width, height);

  // ── 1. Auto-crop & Object Bounds ────────────────────────────────────────────
  const bounds = findBoundingBox(gray, width, height);
  const { minX, minY, maxX, maxY } = bounds;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // ── 2. Blur check (Targeted on object) ──────────────────────────────────────
  // Calculate variance ONLY inside the bounding box so plain backgrounds 
  // don't drag down the average.
  const variance = laplacianVariance(gray, width, height, bounds);
  
  // Lowered threshold to 15 (from 40) for macro shots & low-res cameras
  if (variance < 15) {
    return {
      pass: false,
      reason: 'blur',
      message: 'Image is blurry — please ensure the jewelry is in focus',
    };
  }

  // ── 3. Brightness check ─────────────────────────────────────────────────────
  const brightness = meanBrightness(gray);
  if (brightness < 30) {
    return {
      pass: false,
      reason: 'dark',
      message: 'Too dark — enable flash or move to better light',
    };
  }
  if (brightness > 240) {
    return {
      pass: false,
      reason: 'bright',
      message: 'Too bright — avoid direct flash',
    };
  }

  // ── 4. Apply crop ───────────────────────────────────────────────────────────

  if (cropW < 100 || cropH < 100 || (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1)) {
    return { pass: true, croppedURL: canvas.toDataURL('image/jpeg', 0.92) };
  }

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  const croppedURL = cropCanvas.toDataURL('image/jpeg', 0.92);

  return { pass: true, croppedURL };
}
