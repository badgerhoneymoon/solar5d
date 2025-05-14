import React from 'react'

interface Planet {
  name: string
  temperature_k: number
}

interface OverlayProps {
  planets: Planet[]
}

const Overlay: React.FC<OverlayProps> = ({ planets }) => {
  const temps = planets.map(p => p.temperature_k)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)

  return (
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
      <div>Scale: <b>Logarithmic</b></div>
      <div>Planet color: <b>by temperature</b></div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Range: {minTemp} K – {maxTemp} K
      </div>
    </div>
  )
}

export default Overlay 