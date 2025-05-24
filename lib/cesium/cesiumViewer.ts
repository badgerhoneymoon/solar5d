import * as Cesium from 'cesium';
import { CESIUM_CONFIG, CAMERA_POSITION, CAMERA_ALTITUDES, CAMERA_ANGLES, ANIMATION_TIMINGS } from './cesiumConfig';

/**
 * Creates a CesiumJS viewer with basic terrain (no Ion required)
 */
export function createCesiumViewer(containerId: string): Cesium.Viewer {
  const viewer = new Cesium.Viewer(containerId, {
    ...CESIUM_CONFIG,
    // Use default imagery (OpenStreetMap) that comes with Cesium
    // Don't specify terrainProvider to use default
  });

  // Enable lighting for realistic terrain appearance
  viewer.scene.globe.enableLighting = true;
  
  // Set time for optimal lighting (June 1st, 2023 at noon)
  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2023-06-01T12:00:00");
  
  // Ensure the globe is visible
  viewer.scene.globe.show = true;
  
  // Enable depth testing against terrain for realistic occlusion
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // Start from a nice Earth overview position
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

  // Force initial resize to ensure proper canvas dimensions
  setTimeout(() => {
    if (!viewer.isDestroyed()) {
      viewer.resize();
    }
  }, ANIMATION_TIMINGS.RESIZE_DELAY);

  return viewer;
} 