import ConfidencePill from './ConfidencePill';

export default function SignalBreakdown({ signals = [] }) {
  if (!signals.length) return null;
  const maxContribution = Math.max(...signals.map(s => s.contribution));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {signals.map((sig, i) => {
        const pct   = sig.subScore ?? 0;
        const color = pct > 0.7 ? 'var(--success)' : pct >= 0.4 ? 'var(--warning)' : 'var(--danger)';
        const barW  = maxContribution > 0 ? (sig.contribution / maxContribution) * 100 : 0;

        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                  {sig.signal}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
                  {sig.label} · weight {Math.round(sig.weight * 100)}%
                </span>
              </div>
              <ConfidencePill score={sig.subScore} />
            </div>
            {/* Bar */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${barW}%`, borderRadius: 3,
                background: color, transition: 'width 600ms ease',
              }}/>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", marginTop: 3, textAlign: 'right' }}>
              contribution: {(sig.contribution * 100).toFixed(1)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
