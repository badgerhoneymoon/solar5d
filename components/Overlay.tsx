import React, { useEffect, useState } from 'react'
import solarParams from '../info/solar-params.json'
import { isMobile } from '../lib/utils/mobile'

interface Planet {
  name: string
  temperature_k: number
  unusual_facts?: string[]
}

interface OverlayProps {
  planets: Planet[]
  focusedPlanet?: string | null
  cesiumVisible?: boolean
}

const Overlay: React.FC<OverlayProps> = ({ planets, focusedPlanet, cesiumVisible = false }) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const temps = planets.map(p => p.temperature_k)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)

  // map each planet to a life-possibility emoji
  const lifeEmoji: Record<string, string> = {
    Sun: '☀️',
    Mercury: '💧',
    Venus: '☣️',
    Earth: '🌍',
    Mars: '🧫',
    Jupiter: '🌬️',
    Saturn: '💫',
    Uranus: '🛸',
    Neptune: '🌊',
  }

  return (
    <>
      {!cesiumVisible && focusedPlanet && (() => {
        // Try to find in planets, then fall back to sun
        let p = planets.find(p => p.name === focusedPlanet)
        let fact = p?.unusual_facts?.[0]
        const emoji = lifeEmoji[focusedPlanet] || '❓'
        if (!p && focusedPlanet === 'Sun') {
          const sun = solarParams.sun
          fact = sun.unusual_facts?.[0]
          p = sun
        }
        if (!fact) return null
        return (
          <div
            style={{
              position: 'fixed',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(20,20,30,0.9)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              fontSize: 15,
              padding: '12px 20px',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              zIndex: 1000,
              pointerEvents: 'none',
              fontFamily: 'system-ui, sans-serif',
              lineHeight: 1.4,
              maxWidth: 400,
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 18, marginRight: 8 }}>{emoji}</span>
            <span style={{ fontWeight: 'bold' }}>{focusedPlanet}:</span>
            <div style={{ marginTop: 6 }}>{fact}</div>
          </div>
        )
      })()}
      {/* Hide scale/range overlay on mobile devices and in cesium view */}
      {mounted && !isMobile() && !cesiumVisible && (
        <div
          style={{
            position: 'fixed',
            left: 16,
            bottom: 16,
            background: 'rgba(20,20,30,0.7)',
            color: '#fff',
            fontSize: 13,
            padding: '10px 16px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
            minWidth: 180,
          }}
        >
          <div>Scale: <b>Linear</b></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Range: {minTemp} K – {maxTemp} K
          </div>
        </div>
      )}
    </>
  )
}

export default Overlay 