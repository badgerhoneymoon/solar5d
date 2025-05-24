import * as Cesium from 'cesium';
import { CAMERA_ALTITUDES, CAMERA_ANGLES, CAMERA_POSITION, ANIMATION_TIMINGS, CAMERA_OFFSET } from './cesiumConfig';

/**
 * Smooth easing function for camera transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smooth flyTo with 3-phase trajectory: UP -> TRANSFER -> DOWN
 */
export function smoothFlyTo(
  viewer: Cesium.Viewer, 
  longitude: number, 
  latitude: number, 
  height: number = CAMERA_ALTITUDES.SEARCH_RESULT,
  duration: number = ANIMATION_TIMINGS.SEARCH_FLY_DURATION
): Promise<void> {
  return new Promise((resolve) => {
    const startPosition = viewer.camera.position.clone();
    const startPitch = viewer.camera.pitch;
    
    // Get current location properly
    const currentCartographic = viewer.camera.positionCartographic;
    const currentLon = Cesium.Math.toDegrees(currentCartographic.longitude);
    const currentLat = Cesium.Math.toDegrees(currentCartographic.latitude);
    
    // Phase positions - clean vertical up, horizontal transfer, vertical down
    const highAltitudeStart = Cesium.Cartesian3.fromDegrees(currentLon, currentLat, CAMERA_ALTITUDES.SPACE_OVERVIEW);
    const highAltitudeEnd = Cesium.Cartesian3.fromDegrees(longitude, latitude, CAMERA_ALTITUDES.SPACE_OVERVIEW);
    
    // Calculate offset camera position for landing
    const offsetBearing = Cesium.Math.toRadians(CAMERA_OFFSET.LANDING_BEARING);
    
    // Calculate offset position using bearing and distance
    const offsetLongitude = longitude + (CAMERA_OFFSET.LANDING_DISTANCE / 111320) * Math.sin(offsetBearing) / Math.cos(Cesium.Math.toRadians(latitude));
    const offsetLatitude = latitude + (CAMERA_OFFSET.LANDING_DISTANCE / 111320) * Math.cos(offsetBearing);
    const finalCameraPosition = Cesium.Cartesian3.fromDegrees(offsetLongitude, offsetLatitude, height);

    const startTime = performance.now();
    const durationMs = duration * 1000;

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1.0);
      
      if (viewer.isDestroyed()) {
        resolve();
        return;
      }

      let currentPosition: Cesium.Cartesian3;
      let currentPitch: number;

      if (t < 0.33) {
        // Phase 1: GO UP (reverse descent pattern)
        const phase1T = easeInOutCubic(t / 0.33);
        currentPosition = Cesium.Cartesian3.lerp(startPosition, highAltitudeStart, phase1T, new Cesium.Cartesian3());
        currentPitch = Cesium.Math.lerp(startPitch, Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN), phase1T);
      } else if (t < 0.67) {
        // Phase 2: TRANSFER horizontally at high altitude
        const phase2T = easeInOutCubic((t - 0.33) / 0.34);
        
        // Interpolate lon/lat at constant SPACE_OVERVIEW altitude
        const transferStartLon = currentLon; // Lon where camera ascended from (original start lon)
        const transferStartLat = currentLat; // Lat where camera ascended from (original start lat)

        const interpLon = Cesium.Math.lerp(transferStartLon, longitude, phase2T); // longitude is target
        const interpLat = Cesium.Math.lerp(transferStartLat, latitude, phase2T);   // latitude is target
        
        currentPosition = Cesium.Cartesian3.fromDegrees(interpLon, interpLat, CAMERA_ALTITUDES.SPACE_OVERVIEW);
        currentPitch = Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN); // Stay at look-down
      } else {
        // Phase 3: DESCEND to target with smooth pitch transition
        const phase3T = (t - 0.67) / 0.33;
        const easedPhase3T = easeInOutCubic(phase3T);
        currentPosition = Cesium.Cartesian3.lerp(highAltitudeEnd, finalCameraPosition, easedPhase3T, new Cesium.Cartesian3());
        
        // Pitch transition: start changing at 40% of descent phase
        const pitchProgress = phase3T < 0.4 ? 0 : easeInOutCubic((phase3T - 0.4) / 0.6);
        currentPitch = Cesium.Math.lerp(
          Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN),
          Cesium.Math.toRadians(CAMERA_ANGLES.HORIZON_VIEW),
          pitchProgress
        );
      }

      // Update camera
      viewer.camera.position = currentPosition;
      viewer.camera.setView({
        orientation: {
          heading: 0,
          pitch: currentPitch,
          roll: 0,
        }
      });

      if (t < 1.0) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    animate();
  });
}

/**
 * Attempts to get the user's current browser location and fly to it.
 * @param viewer - The Cesium Viewer instance.
 * @param height - The target height for the camera after flying (default: 10000).
 * @param duration - The duration of the flight animation in seconds.
 */
export function flyToUserLocation(
  viewer: Cesium.Viewer,
  height: number = CAMERA_ALTITUDES.SEARCH_RESULT,
  duration: number = ANIMATION_TIMINGS.SEARCH_FLY_DURATION
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      reject(new Error("Geolocation not supported."));
      return;
    }

    console.log("🛰️ Requesting user location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`🌍 User location acquired: Lat: ${latitude}, Lon: ${longitude}`);
        
        // Use smoothFlyTo - exactly like search does
        smoothFlyTo(viewer, longitude, latitude, height, duration)
          .then(() => {
            console.log(`✅ Successfully flew to user location: Lat: ${latitude}, Lon: ${longitude}`);
            resolve();
          })
          .catch((error) => {
            console.error("Error flying to user location:", error);
            reject(error);
          });
      },
      (error) => {
        console.error("Error getting user location:", error.message);
        let errorMessage = "Error getting user location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "User denied the request for Geolocation.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get user location timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred while getting location.";
            break;
        }
        reject(new Error(errorMessage));
      }
    );
  });
}

/**
 * Resets the camera to the initial overview position
 */
export function resetCameraToInitialPosition(viewer: Cesium.Viewer): void {
  console.log('🔄 Resetting camera to initial position');
  
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      CAMERA_POSITION.longitude, 
      CAMERA_POSITION.latitude, 
      CAMERA_ALTITUDES.SPACE_OVERVIEW
    ),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN),
      roll: 0,
    }
  });
} 