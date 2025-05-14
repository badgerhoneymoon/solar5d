// =========================
// Imports
// =========================
import * as THREE from 'three'
import { temperatureToColor } from './temperatureToColor'

// =========================
// Configuration constants
// =========================
const SUN_SEGMENTS = 32;
const PLANET_SEGMENTS = 24;

// =========================
// Type Definitions
// =========================

// Represents a celestial body (Sun or planet)
export interface Body {
  name: string
  radius_km: number
  distance_from_sun_million_km: number
  rotation_speed_kmh: number
  orbital_speed_kms: number
  temperature_k: number
  axis_angle_deg?: number
}

// Parameters for the solar system
export interface SolarParams {
  sun: Body
  planets: Body[]
}

// Scaling functions and constants
interface Scales {
  radius: (value: number, span?: number, offset?: number) => number
  distance: (value: number, span?: number, offset?: number) => number
  RADIUS_MIN: number
  RADIUS_MAX: number
}

// =========================
// Solar System Mesh Creation
// =========================

/**
 * Creates THREE.Mesh objects for the Sun and all planets.
 * @param params - Solar system parameters (sun and planets)
 * @param scales - Scaling functions and constants
 * @param planetSpread - Spread factor for planet distances
 * @param startOffset - Offset for planet distances
 * @returns Array of THREE.Mesh objects (Sun + planets)
 */
export function createSolarSystemObjects(
  params: SolarParams,
  scales: Scales,
  planetSpread: number,
  startOffset: number
): THREE.Object3D[] {
  const meshes: THREE.Object3D[] = []

  // Find min/max temperature for planets only
  const planetTemps = params.planets.map(p => p.temperature_k)
  const minPlanetTemp = Math.min(...planetTemps)
  const maxPlanetTemp = Math.max(...planetTemps)

  // --- Sun ---
  const sunRadius = scales.RADIUS_MIN + scales.radius(params.sun.radius_km, scales.RADIUS_MAX - scales.RADIUS_MIN)
  const sunGeometry = new THREE.SphereGeometry(sunRadius, SUN_SEGMENTS, SUN_SEGMENTS)
  // Sun: always yellow (or use its own temp, but it's always hottest)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
  sunMesh.position.set(0, 0, 0)
  sunMesh.name = params.sun.name
  // Tilt the sun around its local X-axis
  const sunTiltRad = THREE.MathUtils.degToRad(params.sun.axis_angle_deg ?? 0)
  sunMesh.rotateX(sunTiltRad)
  // Axis line for Sun's rotation axis
  const sunAxisLength = sunRadius * 2
  const sunAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
  const sunAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -sunAxisLength, 0),
    new THREE.Vector3(0, sunAxisLength, 0)
  ])
  const sunAxisLine = new THREE.Line(sunAxisGeometry, sunAxisMaterial)
  sunAxisLine.name = `${params.sun.name}_axis`
  sunMesh.add(sunAxisLine)
  meshes.push(sunMesh)

  // --- Planets & Orbits ---
  const planetCount = params.planets.length
  params.planets.forEach((planet, i) => {
    const radius = scales.RADIUS_MIN + scales.radius(planet.radius_km, scales.RADIUS_MAX - scales.RADIUS_MIN)
    const distance = scales.distance(planet.distance_from_sun_million_km, planetSpread, startOffset)

    // Orbit (XZ plane)
    const orbitSegments = 128
    const orbitGeometry = new THREE.BufferGeometry()
    const orbitVertices = []
    for (let j = 0; j <= orbitSegments; j++) {
      const theta = (j / orbitSegments) * Math.PI * 2
      orbitVertices.push(
        Math.cos(theta) * distance,
        0,
        Math.sin(theta) * distance
      )
    }
    
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitVertices, 3))
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial)
    orbit.name = `${planet.name}_orbit`
    meshes.push(orbit)

    // Planet position: evenly spaced angle
    const angle = (i / planetCount) * Math.PI * 2
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    const geometry = new THREE.SphereGeometry(radius, PLANET_SEGMENTS, PLANET_SEGMENTS)
    
    // Color by planet temperature (planet range only)
    const color = temperatureToColor(planet.temperature_k, minPlanetTemp, maxPlanetTemp)
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, 0, z)
    mesh.name = planet.name
    // Tilt the planet around its local X-axis
    const tiltRad = THREE.MathUtils.degToRad(planet.axis_angle_deg ?? 0)
    mesh.rotateX(tiltRad)
    // Axis line for planet's rotation axis
    const axisLength = radius * 2
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ])
    const axisLine = new THREE.Line(axisGeometry, axisMaterial)
    axisLine.name = `${planet.name}_axis`
    mesh.add(axisLine)
    // marker for self-rotation visibility
    const markerGeo = new THREE.SphereGeometry(radius * 0.1, 8, 8)
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const markerMesh = new THREE.Mesh(markerGeo, markerMat)
    markerMesh.position.set(radius, 0, 0)
    mesh.add(markerMesh)
    // Tag for CSS2D label (handled externally)
    mesh.userData.labelOffset = radius * 1.2
    mesh.userData.labelText = planet.name
    meshes.push(mesh)
  })

  return meshes
}
