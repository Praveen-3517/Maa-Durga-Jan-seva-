import { useState, useEffect, useRef } from 'react';

/**
 * ServerWakeUp — Detects Render.com free-tier cold start and shows a friendly countdown banner.
 *
 * Logic:
 *  1. On mount, ping /api/settings with a 4-second timeout.
 *  2. If server responds in time → hide silently (user never sees anything).
 *  3. If server is slow (cold start) → show a wake-up banner with animated countdown.
 *  4. Keep pinging every 5s until server responds → banner auto-dismisses.
 */
export default function ServerWakeUp() {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [serverReady, setServerReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);
  const pingRef = useRef(null);
  const startedAt = useRef(null);

  const pingServer = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      // FUTURE-PROOF: Ping /api/health (lightweight, no DB) instead of /api/settings
      await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeout);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) return;

    const checkServer = async () => {
      const alive = await pingServer();
      if (alive) {
        setServerReady(true);
        return;
      }

      startedAt.current = Date.now();
      setVisible(true);
      setSeconds(45);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
        const remaining = Math.max(0, 45 - elapsed);
        setSeconds(remaining);
      }, 1000);

      pingRef.current = setInterval(async () => {
        const isAlive = await pingServer();
        if (isAlive) {
          clearInterval(pingRef.current);
          clearInterval(timerRef.current);
          setServerReady(true);
          setTimeout(() => setDismissed(true), 2500);
        }
      }, 5000);
    };

    checkServer();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pingRef.current);
    };
  }, []);

  if (!visible || dismissed) return null;

  const progress = serverReady ? 100 : Math.min(100, ((45 - seconds) / 45) * 100);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 99999,
      background: serverReady
        ? 'linear-gradient(135deg, #052e16, #14532d)'
        : 'linear-gradient(135deg, #1c1917, #292524)',
      borderBottom: `3px solid ${serverReady ? '#22c55e' : '#f59e0b'}`,
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'all 0.5s ease',
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: '50%',
        background: serverReady ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.12)',
        border: `2px solid ${serverReady ? '#22c55e' : '#f59e0b'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        animation: serverReady ? 'none' : 'pulse-wake 1.5s ease-in-out infinite',
      }}>
        <i className={`fa-solid ${serverReady ? 'fa-circle-check' : 'fa-satellite-dish'}`}
          style={{ color: serverReady ? '#22c55e' : '#f59e0b', fontSize: '1.1rem' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: serverReady ? '#4ade80' : '#fbbf24', marginBottom: '2px' }}>
          {serverReady
            ? '✅ Server Ready! Aap ab apna application submit kar sakte hain.'
            : `⏳ Server start ho raha hai... kripya ${seconds} second wait karein`}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {serverReady
            ? 'All systems are online. Please retry your submission.'
            : 'Server thodi der ke liye band tha. Automatic start ho raha hai — kuch karne ki zarurat nahi.'}
        </div>
        <div style={{ marginTop: '6px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: serverReady ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
            borderRadius: '2px',
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      <button onClick={() => setDismissed(true)} title="Dismiss"
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.4rem', padding: '0.2rem', flexShrink: 0, lineHeight: 1 }}>
        ×
      </button>

      <style>{`
        @keyframes pulse-wake {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.65; transform:scale(0.93); }
        }
      `}</style>
    </div>
  );
}
