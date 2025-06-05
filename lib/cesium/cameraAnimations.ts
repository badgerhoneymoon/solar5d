import * as Cesium from 'cesium';
import { CAMERA_ALTITUDES, CAMERA_ANGLES, ANIMATION_TIMINGS, CAMERA_OFFSET } from './cesiumConfig';

/**
 * Smooth easing function for camera transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smooth flyTo with 3-phase trajectory: UP -> TRANSFER -> DOWN
 * Used after search and after the first landing
 */
export function smoothFlyTo(
  viewer: Cesium.Viewer, 
  longitude: number, 
  latitude: number, 
  height: number = CAMERA_ALTITUDES.SEARCH_RESULT,
  duration: number = ANIMATION_TIMINGS.DEFAULT_FLY_DURATION
): Promise<void> {
  // --- Animation phase ratios and pitch transition constants ---
  const PHASE_1_DURATION_RATIO = 0.33; // Go Up
  const PHASE_2_DURATION_RATIO = 0.34; // Transfer
  const PHASE_3_DURATION_RATIO = 0.33; // Descend

  const PITCH_TRANSITION_START_PROGRESS = 0.4; // Start pitching down after 40% of phase 3 is complete
  const PITCH_TRANSITION_DURATION_PROGRESS = 1.0 - PITCH_TRANSITION_START_PROGRESS; // Remaining 60% of phase 3 for pitch

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
    const offsetLongitude = longitude;
    
    const offsetLatitude = latitude + (CAMERA_OFFSET.LANDING_DISTANCE / 111320) * Math.cos(offsetBearing); // 1 degree lat = 111km
    
    const finalCameraPosition = Cesium.Cartesian3.fromDegrees(offsetLongitude, offsetLatitude, height);

    const startTime = performance.now();
    const durationMs = duration * 1000;

    // Cumulative end times for each phase (as a ratio of total duration)
    const PHASE_1_END_TIME_RATIO = PHASE_1_DURATION_RATIO;
    const PHASE_2_END_TIME_RATIO = PHASE_1_END_TIME_RATIO + PHASE_2_DURATION_RATIO;
    // Phase 3 ends at 1.0 (total duration)

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1.0);
      
      if (viewer.isDestroyed()) {
        resolve();
        return;
      }

      let currentPosition: Cesium.Cartesian3;
      let currentPitch: number;

      if (t < PHASE_1_END_TIME_RATIO) {
        // Phase 1: GO UP
        const phase1Progress = t / PHASE_1_DURATION_RATIO;
        const easedPhase1Progress = easeInOutCubic(phase1Progress);
        currentPosition = Cesium.Cartesian3.lerp(startPosition, highAltitudeStart, easedPhase1Progress, new Cesium.Cartesian3());
        currentPitch = Cesium.Math.lerp(startPitch, Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN), easedPhase1Progress);
      } else if (t < PHASE_2_END_TIME_RATIO) {
        // Phase 2: TRANSFER horizontally at high altitude
        const phase2Progress = (t - PHASE_1_END_TIME_RATIO) / PHASE_2_DURATION_RATIO;
        const easedPhase2Progress = easeInOutCubic(phase2Progress);
        
        const interpLon = Cesium.Math.lerp(currentLon, longitude, easedPhase2Progress);
        const interpLat = Cesium.Math.lerp(currentLat, latitude, easedPhase2Progress);
        
        currentPosition = Cesium.Cartesian3.fromDegrees(interpLon, interpLat, CAMERA_ALTITUDES.SPACE_OVERVIEW);
        currentPitch = Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN); // Maintain look-down pitch
      } else {
        // Phase 3: DESCEND to target with smooth pitch transition
        const phase3Progress = (t - PHASE_2_END_TIME_RATIO) / PHASE_3_DURATION_RATIO;
        const easedPhase3Progress = easeInOutCubic(phase3Progress);
        currentPosition = Cesium.Cartesian3.lerp(highAltitudeEnd, finalCameraPosition, easedPhase3Progress, new Cesium.Cartesian3());
        
        let pitchTransitionProgress = 0;
        if (phase3Progress >= PITCH_TRANSITION_START_PROGRESS) {
          pitchTransitionProgress = easeInOutCubic(
            (phase3Progress - PITCH_TRANSITION_START_PROGRESS) / PITCH_TRANSITION_DURATION_PROGRESS
          );
        }
        
        currentPitch = Cesium.Math.lerp(
          Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN),
          Cesium.Math.toRadians(CAMERA_ANGLES.HORIZON_VIEW),
          pitchTransitionProgress
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
  duration: number = ANIMATION_TIMINGS.DEFAULT_FLY_DURATION
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