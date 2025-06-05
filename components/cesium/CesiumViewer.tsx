'use client';

import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import * as THREE from 'three';
import { createCesiumViewer, smoothFlyTo, flyToUserLocation } from '../../lib/cesium';
import { FuzzySearchDropdown } from './FuzzySearchDropdown';
import { CAMERA_ALTITUDES, CAMERA_BALI_POSITION, ANIMATION_TIMINGS } from '../../lib/cesium/cesiumConfig';

// Add THREE to the global scope for Cesium integration if not already present
if (typeof window !== 'undefined' && !(window as Window & { THREE?: typeof THREE }).THREE) {
  (window as Window & { THREE?: typeof THREE }).THREE = THREE;
}

interface ThreeJsViewContext {
  cameraPosition: THREE.Vector3;
  cameraUp: THREE.Vector3;
  earthCenterTjs: THREE.Vector3;
  earthRadiusTjs: number;
}

interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  importance?: number;
}

interface CesiumViewerProps {
  visible: boolean;
  threeJsViewContext?: ThreeJsViewContext | null;
  onTransitionComplete?: () => void;
  className?: string;
}

export const CesiumViewer: React.FC<CesiumViewerProps> = ({
  visible,
  threeJsViewContext,
  onTransitionComplete,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isInitialized = useRef(false);

  const handleSearch = async (place: NominatimResult | string) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Handle NominatimResult object
    if (typeof place === 'object' && place.lat && place.lon) {
      await smoothFlyTo(viewer, parseFloat(place.lon), parseFloat(place.lat), CAMERA_ALTITUDES.SEARCH_RESULT);
      console.log(`Flying to: ${place.display_name}`);
      return;
    }

    // Handle string query (fallback to original logic)
    const query = typeof place === 'string' ? place : '';
    
    // Try to parse as coordinates (lat, lon)
    const coordMatch = query.match(/(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        await smoothFlyTo(viewer, lon, lat, CAMERA_ALTITUDES.SEARCH_RESULT);
        return;
      }
    }

    // Use our geocoding API
    try {
      const url = `/api/geocode?q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Search failed');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        await smoothFlyTo(viewer, parseFloat(result.lon), parseFloat(result.lat), CAMERA_ALTITUDES.SEARCH_RESULT);
        console.log(`Found: ${result.display_name}`);
      } else {
        console.log(`Location "${query}" not found.`);
      }
    } catch (error) {
      console.log('Search failed:', error);
    }
  };

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    // Set container ID
    const containerId = 'cesium-container';
    containerRef.current.id = containerId;

    try {
      // Initialize Cesium viewer
      const viewer = createCesiumViewer(containerId);
      viewerRef.current = viewer;
      isInitialized.current = true;

      // Handle resize
      const handleResize = () => {
        if (viewer && !viewer.isDestroyed()) {
          viewer.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('Failed to initialize Cesium viewer:', error);
    }
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (visible) {
      if (threeJsViewContext) {
        console.log('Attempting to match Three.js view in Cesium:', threeJsViewContext);
        try {
          const { cameraPosition, cameraUp, earthCenterTjs, earthRadiusTjs } = threeJsViewContext;

          // 1. Vector from Earth's center to TJS camera in TJS world space
          const tjsOffsetFromEarthCenter = new THREE.Vector3().subVectors(cameraPosition, earthCenterTjs);

          // 2. Determine scaling factor (Cesium Earth radius / TJS Earth radius)
          // Cesium Earth is a perfect WGS84 ellipsoid, radius approx 6378137.0 meters
          const cesiumEarthRadius = Cesium.Ellipsoid.WGS84.maximumRadius; // Approx 6,378,137 meters
          const scale = cesiumEarthRadius / earthRadiusTjs;

          // 3. Transform TJS offset vector and up vector to Cesium ECF coordinates
          const cesiumCameraPositionECF = new Cesium.Cartesian3(
            tjsOffsetFromEarthCenter.x * scale,
            tjsOffsetFromEarthCenter.z * scale, 
            tjsOffsetFromEarthCenter.y * scale  
          );
          
          // Increase distance by an adjustable multiplier
          // Experiment with this value to match the perceived size.
          // Values > 1 move the camera further, making Earth appear smaller.
          // Values < 1 move it closer, making Earth appear larger.
          const distanceMultiplier = 1.8; // Example: 80% further away
          Cesium.Cartesian3.multiplyByScalar(cesiumCameraPositionECF, distanceMultiplier, cesiumCameraPositionECF);
          console.log(`Applied distanceMultiplier: ${distanceMultiplier} to cesiumCameraPositionECF`);

          const cesiumCameraUpECF = new Cesium.Cartesian3(
            cameraUp.x,
            cameraUp.z, 
            cameraUp.y
          );
          Cesium.Cartesian3.normalize(cesiumCameraUpECF, cesiumCameraUpECF);

          console.log('Cesium Cam Pos (ECF World):', cesiumCameraPositionECF);
          console.log('Cesium Cam Up (Normalized ECF):', cesiumCameraUpECF);

          // Set camera properties directly
          viewer.camera.position = cesiumCameraPositionECF;
          viewer.camera.up = cesiumCameraUpECF;

          const directionToEarthCenter = Cesium.Cartesian3.subtract(
            Cesium.Cartesian3.ZERO, 
            cesiumCameraPositionECF, 
            new Cesium.Cartesian3()
          );
          Cesium.Cartesian3.normalize(directionToEarthCenter, directionToEarthCenter);
          viewer.camera.direction = directionToEarthCenter;

          // FOV and Aspect Ratio are no longer explicitly set here, relying on Cesium defaults
          // and the distanceMultiplier to achieve the desired visual size.

          console.log('Cesium camera set via direct position, up, direction. Distance adjusted by multiplier.');

        } catch (e) {
          console.error('Error applying Three.js view context to Cesium:', e);
          smoothFlyTo(
            viewer,
            CAMERA_BALI_POSITION.longitude,
            CAMERA_BALI_POSITION.latitude,
            CAMERA_ALTITUDES.SPACE_OVERVIEW
          ); // Fallback
        }
      } else {
        // No Three.js context, try to fly to user's location
        smoothFlyTo(
          viewer,
          CAMERA_BALI_POSITION.longitude,
          CAMERA_BALI_POSITION.latitude,
          CAMERA_ALTITUDES.SPACE_OVERVIEW
        );
      }
      
      // Force resize to ensure proper dimensions
      setTimeout(() => {
        if (viewer && !viewer.isDestroyed()) {
          viewer.resize();
          
          // Always attempt to fly to user's location after initial setup
          console.log('Attempting to fly to user location...');
          flyToUserLocation(viewer)
            .then(() => {
              console.log('Successfully flew to user location.');
              onTransitionComplete?.();
            })
            .catch((error) => {
              console.warn('Failed to fly to user location, falling back to Bali:', error);
              // Fallback to Bali if user location fails
              smoothFlyTo(
                viewer, 
                CAMERA_BALI_POSITION.longitude, 
                CAMERA_BALI_POSITION.latitude, 
                CAMERA_BALI_POSITION.height,
                ANIMATION_TIMINGS.DEFAULT_FLY_DURATION
              ).then(() => {
                onTransitionComplete?.();
              });
            });
        }
      }, 100); // Delay to allow initial view to render before starting flight
    }
  }, [visible, threeJsViewContext, onTransitionComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-screen h-screen transition-opacity duration-500 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: visible ? 50 : -1,
      }}
    >
      <div 
        className="absolute top-4 left-4 right-4 z-[1000] flex justify-center"
        style={{ 
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none'
        }}
      >
        <FuzzySearchDropdown onPlaceSelect={handleSearch} />
      </div>
    </div>
  );
}; 