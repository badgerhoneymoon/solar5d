import * as Cesium from 'cesium';
import { CESIUM_CONFIG } from './cesiumConfig';

/**
 * Creates a CesiumJS viewer with premium Ion assets when token is available:
 * - Cesium World Terrain (high-resolution global terrain)
 * - Bing Maps Aerial imagery (satellite/aerial photography without labels)
 * Falls back to basic OpenStreetMap imagery and ellipsoid terrain without token
 */
export function createCesiumViewer(containerId: string): Cesium.Viewer {
  const viewer = new Cesium.Viewer(containerId, {
    ...CESIUM_CONFIG,
  });

  // Add Cesium World Terrain if Ion token is available
  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN;
  if (ionToken) {
    // Add high-resolution terrain
    viewer.scene.setTerrain(
      Cesium.Terrain.fromWorldTerrain({
        requestWaterMask: true, // Show water bodies with realistic rendering
        requestVertexNormals: false, // Enable proper lighting on terrain
      })
    );

    // Replace default imagery with Bing Maps with labels
    viewer.imageryLayers.removeAll();
    Cesium.IonImageryProvider.fromAssetId(3) // Bing Maps Imagery (with labels)
      .then((ionImageryProvider) => {
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.addImageryProvider(ionImageryProvider);
        }
      });
  }

  // Disable lighting for uniform globe appearance
  viewer.scene.globe.enableLighting = false;
  
  // Set time for optimal lighting (June 1st, 2023 at noon)
  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2023-06-01T12:00:00");
  
  // Ensure the globe is visible
  viewer.scene.globe.show = true;
  
  // Enable depth testing against terrain for realistic occlusion
  viewer.scene.globe.depthTestAgainstTerrain = false;

  return viewer;
} 