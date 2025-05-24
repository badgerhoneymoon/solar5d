import * as Cesium from 'cesium';

// Configure Cesium
if (typeof window !== 'undefined') {
  // Set base URL for Cesium assets
  (window as typeof window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium/';
  // Set Ion token if available
  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  }
}

// Camera and positioning constants
export const CAMERA_ALTITUDES = {
  SPACE_OVERVIEW: 20_000_000, // 20,000km - full Earth view for initial position
  BALI_VIEW: 150_000, // 150km - edge of space view with curvature visible
  SEARCH_RESULT: 150_000, // 150km - altitude when flying to search results
} as const;

export const CAMERA_ANGLES = {
  LOOK_DOWN: -75, // degrees - near top-down view for space overview
  HORIZON_VIEW: -25, // degrees - oblique view to see terrain and horizon
} as const;

export const CAMERA_OFFSET = {
  LANDING_DISTANCE: 200000, // meters - how far back to position camera from target
  LANDING_BEARING: 180, // degrees - bearing from target (180 = south, camera looks north at target)
} as const;

export const ANIMATION_TIMINGS = {
  RESIZE_DELAY: 100, // ms - delay before forcing resize
  DEFAULT_FLY_DURATION: 3, // seconds - default camera transition time
  SEARCH_FLY_DURATION: 4, // seconds - search flight duration (up-transfer-down)
} as const;

// Camera position coordinates (positioned south of Bali for northward view)
export const CAMERA_POSITION = {
  longitude: 115.2, // Same longitude as Bali
  latitude: -12.0,  // 3.5° south of Bali for oblique northward view
  height: CAMERA_ALTITUDES.BALI_VIEW,
} as const;

// Cesium viewer configuration for our integration
export const CESIUM_CONFIG = {
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,
  creditContainer: undefined, // Remove Cesium credits overlay
}; 