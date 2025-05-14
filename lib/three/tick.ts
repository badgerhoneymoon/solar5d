// Tick function for solar system animation
import * as THREE from 'three'
import type { Body } from './solarSystem'

interface UpdateOptions {
  orbitPaused?: boolean
  spinPaused?: boolean
}

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
  const upAxis = new THREE.Vector3(0, 1, 0)
  const { orbitPaused = false, spinPaused = false } = options

  bodies.forEach(body => {
    // Find the corresponding mesh by name
    const obj = meshes.find(m => m.name === body.name)
    if (!obj || !(obj instanceof THREE.Mesh)) return

    // Rotate around its own axis
    if (!spinPaused) {
      // Angular speed (rad/s) = rotation_speed_kmh (km/h) / (radius_km * 3600)
      const axisRad = (body.rotation_speed_kmh / (body.radius_km * 3600)) * deltaSec
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