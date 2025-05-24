'use client';

import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { createCesiumViewer, flyToBali, resetCameraToInitialPosition, smoothFlyTo } from '../../lib/cesium';
import { FuzzySearchDropdown } from './FuzzySearchDropdown';
import { CAMERA_ALTITUDES } from '../../lib/cesium/cesiumConfig';

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
  onTransitionComplete?: () => void;
  className?: string;
}

export const CesiumViewer: React.FC<CesiumViewerProps> = ({
  visible,
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
      // Reset camera to initial position before flying to Bali
      resetCameraToInitialPosition(viewer);
      
      // Force resize to ensure proper dimensions
      setTimeout(() => {
        if (viewer && !viewer.isDestroyed()) {
          viewer.resize();
          // Fly to Bali after resize
          flyToBali(viewer).then(() => {
            onTransitionComplete?.();
          });
        }
      }, 100);
    }
  }, [visible, onTransitionComplete]);

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