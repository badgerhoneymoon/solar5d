// Scaling setup for solar system visualization
import { makeLogScale } from '../utils/math'
import { RADIUS_MIN, RADIUS_MAX } from './constants'

interface Body {
  radius_km: number
  distance_from_sun_million_km: number
}

interface SolarParams {
  sun: Body
  planets: Body[]
}

export function getSolarSystemScales(params: SolarParams) {
  const sun = params.sun
  const planets = params.planets
  
  // Calculate the minimum and maximum radius and distance
  const minRadius = Math.min(sun.radius_km, ...planets.map(p => p.radius_km))
  const maxRadius = Math.max(sun.radius_km, ...planets.map(p => p.radius_km))
  
  // Calculate the minimum and maximum distance
  const minDist = Math.min(...planets.map(p => p.distance_from_sun_million_km))
  const maxDist = Math.max(...planets.map(p => p.distance_from_sun_million_km))

  // Create scaling functions
  const radius = makeLogScale(minRadius, maxRadius)
  const distance = makeLogScale(minDist, maxDist)

  return {
    radius,
    distance,
    RADIUS_MIN,
    RADIUS_MAX,
  }
}
