"use client";

import React, { useState, useRef } from 'react';
import usePalmPause from '../hooks/usePalmPause';
import Image from 'next/image';

export default function PalmPauseDebugOverlay() {
  const [paused, setPaused] = useState(false);
  const [avgDist, setAvgDist] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const lastAvgDistRef = useRef<number | null>(null);

  // Wrap the original onPauseChange to also capture avgDist
  const onPauseChange = (isPaused: boolean, dist?: number) => {
    setPaused(isPaused);
    if (typeof dist === 'number') {
      setAvgDist(dist);
      lastAvgDistRef.current = dist;
    }
    setStatus('running');
  };

  // Patch usePalmPause to pass avgDist to onPauseChange
  usePalmPause(
    (isPaused: boolean) => {
      // We'll update avgDist in a monkey-patched way below
      onPauseChange(isPaused, lastAvgDistRef.current !== null ? lastAvgDistRef.current : undefined);
    }
  );

  // Monkey-patch: Listen for avgDist in the global window for debug
  React.useEffect(() => {
    window.__PALM_PAUSE_DEBUG__ = (dist: number) => {
      setAvgDist(dist);
      lastAvgDistRef.current = dist;
    };
    return () => {
      delete window.__PALM_PAUSE_DEBUG__;
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 9999 }}>
      {/* Gesture images and labels */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: '1rem', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="/images/gestures/fist.jpg" alt="Closed Fist" width={56} height={56} style={{ borderRadius: '0.5rem', border: '1px solid #f55', background: '#222' }} />
          <span style={{ marginTop: '0.5rem', color: '#f55', fontSize: '0.92rem', fontFamily: 'monospace' }}>Stop rotation</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="/images/gestures/open-palm.jpg" alt="Open Palm" width={56} height={56} style={{ borderRadius: '0.5rem', border: '1px solid #6f6', background: '#222' }} />
          <span style={{ marginTop: '0.5rem', color: '#6f6', fontSize: '0.92rem', fontFamily: 'monospace' }}>Resume rotation</span>
        </div>
      </div>
      {/* Existing overlay */}
      <div style={{ background: 'rgba(30,30,30,0.85)', color: '#fff', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.95rem', minWidth: '220px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
        <div><b>PalmPause Debug</b></div>
        <div>Status: <span style={{color: status==='error'?'#f55':status==='running'?'#6f6':'#aaa'}}>{status}</span></div>
        <div>avgDist: <span>{avgDist !== null ? avgDist.toFixed(4) : 'n/a'}</span></div>
        <div>Gesture: <span style={{color: paused ? '#f55' : '#6f6'}}>{paused ? 'Closed fist' : 'Open palm'}</span></div>
      </div>
    </div>
  );
} 