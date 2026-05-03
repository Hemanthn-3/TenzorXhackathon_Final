export default function DisclaimerBanner() {
  return (
    <div style={{
      background: 'rgba(232,168,76,0.12)',
      border: '1px solid var(--warning)',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
      <p style={{ fontSize: 13, color: 'var(--warning)', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
        Pre-qualification estimate only — subject to branch verification
      </p>
    </div>
  );
}
