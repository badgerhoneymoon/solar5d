// =========================
// Imports
// =========================
import * as THREE from 'three'
import { temperatureToColor } from './temperatureToColor'
import { RADIUS_MIN, RADIUS_MAX } from './visualConstants'
import { createSaturnRings } from './saturnRings'
import { getPlanetTextures } from './textureLoader'

// =========================
// Visual scaling/layout constants
// =========================
export const PLANET_SPREAD = 160; // Distance factor between planet orbits (affects spacing)
export const START_OFFSET = 10;   // Offset for Mercury's distance (shifts all orbits outward)

// =========================
// Solar system mesh/visual constants
// =========================
const SUN_SEGMENTS = 64; // Number of segments for the sun's sphere geometry (smoothness)
const PLANET_SEGMENTS = 64; // Number of segments for planet sphere geometry (smoothness)
const ORBIT_SEGMENTS = 128; // Number of segments for orbit line geometry (smoothness of orbit circle)
const ORBIT_COLOR = 'white'; // Color of the orbit lines (white)
const ORBIT_OPACITY = 0.1; // Opacity of the orbit lines (semi-transparent)
const ORBIT_TRANSPARENT = true; // Whether orbit lines are rendered as transparent
const AXIS_COLOR = 'white'; // Color for rotation axis lines (green)
const AXIS_OPACITY = 0.3; // Opacity for axis lines (more transparent)
const AXIS_TRANSPARENT = true; // Axis lines rendered as transparent

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

  // Get textures (client-only)
  const { sunTexture, mercuryTexture, venusTexture, earthTexture, marsTexture, jupiterTexture, saturnTexture, uranusTexture, neptuneTexture, saturnRingTexture } = getPlanetTextures();

  // Find min/max temperature for planets only
  const planetTemps = params.planets.map(p => p.temperature_k)
  const minPlanetTemp = Math.min(...planetTemps)
  const maxPlanetTemp = Math.max(...planetTemps)

  // --- Sun ---
  const sunRadius = RADIUS_MIN + scales.radius(params.sun.radius_km, RADIUS_MAX - RADIUS_MIN)
  const sunGeometry = new THREE.SphereGeometry(sunRadius, SUN_SEGMENTS, SUN_SEGMENTS)
  // Sun: always yellow (or use its own temp, but it's always hottest)
  const sunMaterial = sunTexture ? new THREE.MeshBasicMaterial({ map: sunTexture }) : new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
  sunMesh.position.set(0, 0, 0)
  sunMesh.name = params.sun.name
  // Tilt the sun around its local X-axis
  const sunTiltRad = THREE.MathUtils.degToRad(params.sun.axis_angle_deg ?? 0)
  sunMesh.rotateX(sunTiltRad)
  // Axis line for Sun's rotation axis
  const sunAxisLength = sunRadius * 2
  const sunAxisMaterial = new THREE.LineBasicMaterial({ color: AXIS_COLOR, opacity: AXIS_OPACITY, transparent: AXIS_TRANSPARENT })
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
    const radius = RADIUS_MIN + scales.radius(planet.radius_km, RADIUS_MAX - RADIUS_MIN)
    const distance = scales.distance(planet.distance_from_sun_million_km, planetSpread, startOffset)

    // Orbit (XZ plane)
    const orbitGeometry = new THREE.BufferGeometry()
    const orbitVertices = []
    for (let j = 0; j <= ORBIT_SEGMENTS; j++) {
      const theta = (j / ORBIT_SEGMENTS) * Math.PI * 2
      orbitVertices.push(
        Math.cos(theta) * distance,
        0,
        Math.sin(theta) * distance
      )
    }
    
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitVertices, 3))
    const orbitMaterial = new THREE.LineBasicMaterial({ color: ORBIT_COLOR, opacity: ORBIT_OPACITY, transparent: ORBIT_TRANSPARENT })
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial)
    orbit.name = `${planet.name}_orbit`
    meshes.push(orbit)

    // Planet position: evenly spaced angle
    const angle = (i / planetCount) * Math.PI * 2
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    const geometry = new THREE.SphereGeometry(radius, PLANET_SEGMENTS, PLANET_SEGMENTS)
    
    let material: THREE.Material
    let planetSpecificMesh: THREE.Object3D | undefined // Used for planets with special structures like Saturn

    if (planet.name.toLowerCase() === 'mercury' && mercuryTexture) {
      material = new THREE.MeshBasicMaterial({ map: mercuryTexture })
    } else if (planet.name.toLowerCase() === 'venus' && venusTexture) {
      material = new THREE.MeshBasicMaterial({ map: venusTexture })
    } else if (planet.name.toLowerCase() === 'earth' && earthTexture) {
      material = new THREE.MeshBasicMaterial({ map: earthTexture })
    } else if (planet.name.toLowerCase() === 'mars' && marsTexture) {
      material = new THREE.MeshBasicMaterial({ map: marsTexture })
    } else if (planet.name.toLowerCase() === 'jupiter' && jupiterTexture) {
      material = new THREE.MeshBasicMaterial({ map: jupiterTexture })
    } else if (planet.name.toLowerCase() === 'saturn' && saturnTexture) {
      // Build Saturn as a Group: body + rings
      const group = new THREE.Group()
      group.name = planet.name
      material = new THREE.MeshBasicMaterial({ map: saturnTexture })
      // Body mesh
      const bodyMesh = new THREE.Mesh(geometry, material)
      bodyMesh.name = `${planet.name}_body`
      group.add(bodyMesh)
      // Rings
      if (saturnRingTexture) {
        const ring = createSaturnRings(radius, saturnRingTexture)
        ring.name = `${planet.name}_rings`
        group.add(ring)
      }
      planetSpecificMesh = group
    } else if (planet.name.toLowerCase() === 'uranus' && uranusTexture) {
      material = new THREE.MeshBasicMaterial({ map: uranusTexture })
    } else if (planet.name.toLowerCase() === 'neptune' && neptuneTexture) {
      material = new THREE.MeshBasicMaterial({ map: neptuneTexture })
    } else {
      // Color by planet temperature (planet range only)
      const color = temperatureToColor(planet.temperature_k, minPlanetTemp, maxPlanetTemp)
      material = new THREE.MeshBasicMaterial({ color, wireframe: true })
    }

    const mesh = planetSpecificMesh || new THREE.Mesh(geometry, material!);
    mesh.position.set(x, 0, z)
    mesh.name = planet.name
    // Tilt the planet around its local X-axis
    const tiltRad = THREE.MathUtils.degToRad(planet.axis_angle_deg ?? 0)
    mesh.rotateX(tiltRad)
    // Axis line for planet's rotation axis
    const axisLength = radius * 2
    const axisMaterial = new THREE.LineBasicMaterial({ color: AXIS_COLOR, opacity: AXIS_OPACITY, transparent: AXIS_TRANSPARENT })
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ])
    const axisLine = new THREE.Line(axisGeometry, axisMaterial)
    axisLine.name = `${planet.name}_axis`
    mesh.add(axisLine)
    // Tag for CSS2D label (handled externally)
    mesh.userData.labelOffset = radius * 1.2
    mesh.userData.labelText = planet.name
    meshes.push(mesh)
  })

  return meshes
}
