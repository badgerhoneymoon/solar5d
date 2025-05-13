import * as THREE from 'three'

// Map temperature to color (blue=cold, yellow=hot)
export function temperatureToColor(temp: number, min: number, max: number): THREE.Color {
  const t = (temp - min) / (max - min)
  // Interpolate: 0 = blue (0.66), 1 = yellow (0.16)
  return new THREE.Color().setHSL(0.66 - 0.5 * t, 1, 0.5)
} 