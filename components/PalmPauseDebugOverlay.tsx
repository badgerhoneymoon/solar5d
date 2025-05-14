"use client";

import React, { useState, useRef } from 'react';
import usePalmPause from '../hooks/usePalmPause';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  zIndex: 9999,
  background: 'rgba(30,30,30,0.85)',
  color: '#fff',
  padding: '1rem',
  borderRadius: '0.5rem',
  fontFamily: 'monospace',
  fontSize: '0.95rem',
  minWidth: '220px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  pointerEvents: 'none',
};

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
    <div style={overlayStyle}>
      <div><b>PalmPause Debug</b></div>
      <div>Status: <span style={{color: status==='error'?'#f55':status==='running'?'#6f6':'#aaa'}}>{status}</span></div>
      <div>Paused: <span style={{color: paused?'#f55':'#6f6'}}>{paused ? 'YES' : 'NO'}</span></div>
      <div>avgDist: <span>{avgDist !== null ? avgDist.toFixed(4) : 'n/a'}</span></div>
      <div>Gesture: <span style={{color: paused ? '#f55' : '#6f6'}}>{paused ? 'Closed fist' : 'Open palm'}</span></div>
      <div style={{fontSize:'0.8em',color:'#aaa',marginTop:'0.5em'}}>Show hand to camera to test</div>
    </div>
  );
} 