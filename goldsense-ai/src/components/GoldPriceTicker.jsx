import React, { useState, useEffect } from 'react';
import { fetchLiveGoldRate } from '../utils/loanCalculator';

/**
 * GoldPriceTicker
 * Displays live gold rates with a 60-second polling interval.
 *
 * Props:
 *   compact {boolean} — true = single-line for Result screen hero card
 *                       false (default) = full 3-karat grid for Welcome screen
 */
export default function GoldPriceTicker({ compact = false }) {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRates = async () => {
    const data = await fetchLiveGoldRate();
    setRates({
      '24K': data.rate24k,
      '22K': data.rate22k,
      '18K': data.rate18k,
      source: data.rateSource === 'live' ? `Live · ${data.rateProvider}` : data.rateProvider,
      change: data.change || 0,
      changePct: data.changePct || 0
    });
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        background: 'rgba(201,168,76,0.08)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: compact ? '8px' : '12px',
        padding: compact ? '8px 12px' : '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#C9A84C',
          animation: 'pulse 1s ease-in-out infinite'
        }} />
        <span style={{ color: '#9A8F7A', fontSize: '12px' }}>
          Fetching live gold rate…
        </span>
      </div>
    );
  }

  const isLive = rates.source.includes('Live');

  // ── Compact (single-line) ─────────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{
        background: 'rgba(201,168,76,0.08)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isLive ? '#4CAF7A' : '#E8A84C',
          display: 'inline-block', flexShrink: 0
        }} />
        <span style={{ color: '#9A8F7A', fontSize: '11px' }}>
          GOLD RATE
        </span>
        <span style={{ color: '#C9A84C', fontSize: '13px', fontWeight: 600 }}>
          ₹{rates['22K'].toLocaleString('en-IN')}/g
        </span>
        <span style={{ color: '#5A5040', fontSize: '11px' }}>
          22K · {rates.source}
        </span>
        {rates.changePct !== 0 && (
          <span style={{
            color: rates.changePct > 0 ? '#4CAF7A' : '#E85C4A',
            fontSize: '11px'
          }}>
            {rates.changePct > 0 ? '+' : ''}{rates.changePct.toFixed(2)}%
          </span>
        )}
      </div>
    );
  }

  // ── Full version for Welcome screen ──────────────────────────────────────
  return (
    <div style={{
      background: 'rgba(201,168,76,0.08)',
      border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: '8px', marginBottom: '16px'
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isLive ? '#4CAF7A' : '#E8A84C',
          display: 'inline-block', flexShrink: 0
        }} />
        <span style={{ color: '#9A8F7A', fontSize: '12px', letterSpacing: '1px' }}>
          LIVE GOLD RATES · {rates.source.toUpperCase()}
        </span>
      </div>

      {/* 3-karat grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {[
          { karat: '24K', rate: rates['24K'], purity: '99.9%' },
          { karat: '22K', rate: rates['22K'], purity: '91.6%' },
          { karat: '18K', rate: rates['18K'], purity: '75.0%' }
        ].map(({ karat, rate, purity }) => (
          <div key={karat} style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#C9A84C', fontSize: '13px',
              fontWeight: 600, marginBottom: '4px'
            }}>
              {karat}
            </div>
            <div style={{
              color: '#F5F0E8',
              fontFamily: "'Playfair Display', serif",
              fontSize: '16px', fontWeight: 700
            }}>
              ₹{rate.toLocaleString('en-IN')}
            </div>
            <div style={{ color: '#5A5040', fontSize: '11px', marginTop: '2px' }}>
              per gram · {purity}
            </div>
          </div>
        ))}
      </div>

      {/* Daily change indicator */}
      {rates.changePct !== 0 && (
        <div style={{
          textAlign: 'center', fontSize: '12px',
          color: rates.changePct > 0 ? '#4CAF7A' : '#E85C4A'
        }}>
          {rates.changePct > 0 ? '▲' : '▼'} {Math.abs(rates.changePct).toFixed(2)}% today
        </div>
      )}

      {/* Last-updated timestamp */}
      {lastUpdated && (
        <div style={{
          textAlign: 'center', fontSize: '11px',
          color: '#5A5040', marginTop: '8px'
        }}>
          Updated {lastUpdated.toLocaleTimeString('en-IN')} · refreshes every 60s
        </div>
      )}
    </div>
  );
}
