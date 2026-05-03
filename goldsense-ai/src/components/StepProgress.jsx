import ConfidencePill from './ConfidencePill';

function StepIcon({ status }) {
  if (status === 'complete') return <span style={{ color: 'var(--success)', fontSize: 16, lineHeight: 1 }}>✓</span>;
  if (status === 'warning')  return <span style={{ color: 'var(--warning)', fontSize: 14, lineHeight: 1 }}>⚠</span>;
  if (status === 'active')   return <span style={{ color: 'var(--accent-gold)', fontSize: 14, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>;
  return <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }}/>;
}

export default function StepProgress({ steps = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, opacity: step.status === 'pending' ? 0.45 : 1, transition: 'opacity 300ms' }}>
          {/* Icon + connector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
            <StepIcon status={step.status}/>
            {i < steps.length - 1 && (
              <div style={{
                width: 2, flex: 1, minHeight: 14, marginTop: 3,
                background: (step.status === 'complete' || step.status === 'warning') ? 'var(--accent-gold-dim)' : 'var(--border)',
                transition: 'background 400ms ease',
              }}/>
            )}
          </div>
          {/* Content */}
          <div style={{ flex: 1, paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
              fontSize: 13, fontFamily: "'Inter', sans-serif",
              color: step.status === 'active' ? 'var(--accent-gold)' : 'var(--text-primary)',
            }}>{step.label}</span>
            {(step.status === 'complete' || step.status === 'warning') && step.confidence !== null && (
              <ConfidencePill score={step.confidence}/>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
