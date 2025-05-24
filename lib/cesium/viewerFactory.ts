import * as Cesium from 'cesium';
import { CESIUM_CONFIG, CAMERA_POSITION, CAMERA_ALTITUDES, CAMERA_ANGLES, ANIMATION_TIMINGS } from './cesiumConfig';

/**
 * Creates a CesiumJS viewer with premium Ion assets when token is available:
 * - Cesium World Terrain (high-resolution global terrain)
 * - Bing Maps Aerial imagery (satellite/aerial photography without labels)
 * Falls back to basic OpenStreetMap imagery and ellipsoid terrain without token
 */
export function createCesiumViewer(containerId: string): Cesium.Viewer {
  const viewer = new Cesium.Viewer(containerId, {
    ...CESIUM_CONFIG,
    // Use default imagery (OpenStreetMap) that comes with Cesium
    // Don't specify terrainProvider to use default
  });

  // Add Cesium World Terrain if Ion token is available
  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN;
  if (ionToken) {
    // Add high-resolution terrain
    viewer.scene.setTerrain(
      Cesium.Terrain.fromWorldTerrain({
        requestWaterMask: true, // Show water bodies with realistic rendering
        requestVertexNormals: true, // Enable proper lighting on terrain
      })
    );

    // Replace default imagery with Bing Maps Aerial (NO LABELS)
    viewer.imageryLayers.removeAll();
    Cesium.IonImageryProvider.fromAssetId(2) // Bing Maps Aerial (clean, no labels)
      .then((ionImageryProvider) => {
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.addImageryProvider(ionImageryProvider);
        }
      });

    // Note: Removed OSM Buildings (they were ugly)
  }

  // Disable lighting for uniform globe appearance
  viewer.scene.globe.enableLighting = false;
  
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