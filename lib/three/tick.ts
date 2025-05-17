// Tick function for solar system animation
import * as THREE from 'three'
import type { Body } from './solarSystem'

interface UpdateOptions {
  orbitPaused?: boolean
  spinPaused?: boolean
}

// Smoothing factor for gradual spin pause/resume
const SPIN_LERP_ALPHA = 0.01
// Current spin weight (1 = full speed, 0 = stopped)
let spinWeight = 1

/**
 * Updates rotation around axis and orbital revolution of planets.
 * @param bodies - Array of planet data with speeds and distances
 * @param meshes - Array of objects (meshes) created for the solar system
 * @param deltaSec - Time elapsed since last frame in seconds
 */
export function updateSolarSystem(
  bodies: Body[],
  meshes: THREE.Object3D[],
  deltaSec: number,
  options: UpdateOptions = {}
) {
  // Destructure pause flags
  const upAxis = new THREE.Vector3(0, 1, 0)
  const { orbitPaused = false, spinPaused = false } = options
  // Gradually adjust spin weight towards target (0 if paused, 1 if running)
  spinWeight = THREE.MathUtils.lerp(spinWeight, spinPaused ? 0 : 1, SPIN_LERP_ALPHA)

  bodies.forEach(body => {
    // Find the corresponding mesh by name
    const obj = meshes.find(m => m.name === body.name)
    if (!obj) return

    // Rotate around its own axis with gradual pause/resume
    // Angular speed (rad/s) = rotation_speed_kmh (km/h) / (radius_km * 3600)
    const rawRad = (body.rotation_speed_kmh / (body.radius_km * 3600)) * deltaSec
    const axisRad = rawRad * spinWeight
    const bodyMesh = obj.getObjectByName(`${body.name}_body`)
    if (bodyMesh instanceof THREE.Mesh) {
      bodyMesh.rotation.y += axisRad
    } else if (obj instanceof THREE.Mesh) {
      obj.rotation.y += axisRad
    }

    // Orbit around the sun
    if (!orbitPaused && body.distance_from_sun_million_km > 0) {
      const distanceKm = body.distance_from_sun_million_km * 1e6
      const orbitalRad = (body.orbital_speed_kms / distanceKm) * deltaSec
      obj.position.applyAxisAngle(upAxis, orbitalRad)
    }
  })
} 