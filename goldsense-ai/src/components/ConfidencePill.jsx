export default function ConfidencePill({ score, size = 'sm' }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct > 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  const bg    = pct > 70 ? 'rgba(76,175,122,0.15)' : pct >= 40 ? 'rgba(232,168,76,0.15)' : 'rgba(232,92,74,0.15)';
  const pad   = size === 'md' ? '4px 12px' : '2px 8px';
  const fs    = size === 'md' ? 13 : 11;
  return (
    <span title={`${pct}% confidence score`} style={{ background: bg, color, border: `1px solid ${color}`, borderRadius: 999,
      padding: pad, fontSize: fs, fontFamily: "'Inter', sans-serif", fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 7 }}>●</span>{pct}%
    </span>
  );
}
