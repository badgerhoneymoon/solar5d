import * as Cesium from 'cesium';
import { CAMERA_ALTITUDES, CAMERA_ANGLES, CAMERA_POSITION, ANIMATION_TIMINGS } from './cesiumConfig';

/**
 * Smooth easing function for camera transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Positions camera for a smooth flyTo to Bali with custom interpolated pitch
 */
export function flyToBali(viewer: Cesium.Viewer, duration: number = ANIMATION_TIMINGS.DEFAULT_FLY_DURATION): Promise<void> {
  console.log('🚀 Flying to Bali with duration:', duration, 'seconds'); // Debug log
  
  return new Promise((resolve) => {
    const startPosition = viewer.camera.position.clone();
    
    const endPosition = Cesium.Cartesian3.fromDegrees(
      CAMERA_POSITION.longitude,
      CAMERA_POSITION.latitude,
      CAMERA_POSITION.height
    );
    const endPitch = Cesium.Math.toRadians(CAMERA_ANGLES.HORIZON_VIEW);

    const startTime = performance.now();
    const durationMs = duration * 1000;
    
    console.log('📏 Animation will take', durationMs, 'ms'); // Debug log

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1.0);
      
      if (viewer.isDestroyed()) {
        resolve();
        return;
      }

      // Position interpolation (smooth throughout)
      const easedT = easeInOutCubic(t);
      const currentPosition = Cesium.Cartesian3.lerp(startPosition, endPosition, easedT, new Cesium.Cartesian3());
      
      // Smooth pitch interpolation with gentle, slower transition
      // Start transition at 40% and use gentle ease-in-out curve
      const pitchProgress = t < 0.4 ? 0 : easeInOutCubic((t - 0.4) / 0.6);
      const currentPitch = Cesium.Math.lerp(
        Cesium.Math.toRadians(CAMERA_ANGLES.LOOK_DOWN),
        endPitch,
        pitchProgress
      );

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
        const actualDuration = performance.now() - startTime;
        console.log('✅ Animation completed after', Math.round(actualDuration), 'ms'); // Debug log
        resolve();
      }
    }

    animate();
  });
}

/**
 * Smooth flyTo with 3-phase trajectory: UP -> TRANSFER -> DOWN
 */
export function smoothFlyTo(
  viewer: Cesium.Viewer, 
  longitude: number, 
  latitude: number, 
  height: number = 100000,
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
    const finalPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

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
        // Phase 1: GO UP (reverse Bali descent)
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
        // Phase 3: DESCEND to target (same as flyToBali descent)
        const phase3T = (t - 0.67) / 0.33;
        const easedPhase3T = easeInOutCubic(phase3T);
        currentPosition = Cesium.Cartesian3.lerp(highAltitudeEnd, finalPosition, easedPhase3T, new Cesium.Cartesian3());
        
        // Pitch transition like flyToBali (start changing at 40% of descent phase)
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