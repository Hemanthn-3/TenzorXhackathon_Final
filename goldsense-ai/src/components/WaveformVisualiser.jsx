import { useEffect, useRef } from 'react';

const HEIGHT = 80;

/**
 * WaveformVisualiser
 * Props:
 *   analyserNode — Web Audio AnalyserNode | null
 *
 * Draws a live waveform when analyserNode is provided,
 * or a flat midline when null.
 */
export default function WaveformVisualiser({ analyserNode }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx    = canvas.getContext('2d');
    const width  = canvas.offsetWidth || canvas.width;
    canvas.width = width;

    // Resolved CSS variable colours (safe fallbacks)
    const goldColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-gold').trim() || '#C9A84C';
    const bgColor   = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-card').trim()     || '#1A1A1A';

    const dataArray = analyserNode
      ? new Uint8Array(analyserNode.fftSize)
      : null;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, HEIGHT);

      // Waveform
      ctx.lineWidth   = 2;
      ctx.strokeStyle = goldColor;
      ctx.shadowColor = goldColor;
      ctx.shadowBlur  = 6;
      ctx.beginPath();

      if (analyserNode && dataArray) {
        analyserNode.getByteTimeDomainData(dataArray);
        const sliceWidth = width / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * HEIGHT) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, HEIGHT / 2);
      } else {
        // Flat midline with subtle shimmer
        const mid = HEIGHT / 2;
        ctx.moveTo(0, mid);
        ctx.lineTo(width, mid);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      height={HEIGHT}
      style={{
        width: '100%',
        height: `${HEIGHT}px`,
        borderRadius: '10px',
        display: 'block',
        background: 'var(--bg-card)',
      }}
    />
  );
}
