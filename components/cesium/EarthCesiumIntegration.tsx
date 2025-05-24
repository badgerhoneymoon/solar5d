'use client';

import React from 'react';
import * as THREE from 'three';
import { CesiumViewer } from './CesiumViewer';
import { EarthTransitionButton } from './EarthTransitionButton';

interface ThreeJsViewContext {
  cameraPosition: THREE.Vector3;
  cameraUp: THREE.Vector3;
  earthCenterTjs: THREE.Vector3;
  earthRadiusTjs: number;
}

interface FocusedEarthDetails {
  mesh: THREE.Object3D;
  radiusTjs: number;
}

interface EarthCesiumIntegrationProps {
  focusedPlanet: string | null;
  threeCamera: THREE.PerspectiveCamera | null;
  focusedEarthDetails: FocusedEarthDetails | null;
  onTransitionStart?: () => void;
  onTransitionComplete?: () => void;
  onCesiumVisibilityChange?: (visible: boolean) => void;
}

export const EarthCesiumIntegration: React.FC<EarthCesiumIntegrationProps> = ({
  focusedPlanet,
  threeCamera,
  focusedEarthDetails,
  onTransitionStart,
  onTransitionComplete,
  onCesiumVisibilityChange,
}) => {
  const [cesiumVisible, setCesiumVisible] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [threeJsViewContextForCesium, setThreeJsViewContextForCesium] = React.useState<ThreeJsViewContext | null>(null);

  // Check if we should show the transition button
  const shouldShowButton = focusedPlanet?.toLowerCase() === 'earth' && !cesiumVisible && !isTransitioning;

  // Start the transition from Three.js to Cesium
  const startTransition = React.useCallback(async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    onTransitionStart?.();

    if (threeCamera && focusedEarthDetails?.mesh) {
      const earthWorldPosition = new THREE.Vector3();
      focusedEarthDetails.mesh.getWorldPosition(earthWorldPosition);
      
      setThreeJsViewContextForCesium({
        cameraPosition: threeCamera.position.clone(),
        cameraUp: threeCamera.up.clone(),
        earthCenterTjs: earthWorldPosition,
        earthRadiusTjs: focusedEarthDetails.radiusTjs,
      });
    } else {
      setThreeJsViewContextForCesium(null);
    }

    // Simple: just show Cesium and let it handle the transition
    setCesiumVisible(true);
    
    // Brief delay for transition effect
    setTimeout(() => {
      setIsTransitioning(false);
      onTransitionComplete?.();
    }, 500);
  }, [isTransitioning, onTransitionStart, onTransitionComplete, threeCamera, focusedEarthDetails]);

  // Reset to Three.js view
  const resetToThreeJS = React.useCallback(() => {
    setCesiumVisible(false);
    setIsTransitioning(false);
  }, []);

  // Handle ESC key to go back to Three.js
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cesiumVisible) {
        resetToThreeJS();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cesiumVisible, resetToThreeJS]);

  // Notify parent when cesiumVisible changes
  React.useEffect(() => {
    onCesiumVisibilityChange?.(cesiumVisible);
  }, [cesiumVisible, onCesiumVisibilityChange]);

  return (
    <>
      {/* Transition Button */}
      <EarthTransitionButton
        visible={shouldShowButton}
        onClick={startTransition}
        disabled={isTransitioning}
      />

      {/* Cesium Viewer */}
      <CesiumViewer
        visible={cesiumVisible}
        threeJsViewContext={threeJsViewContextForCesium}
        onTransitionComplete={onTransitionComplete}
      />

      {/* Back to Solar System Button */}
      {cesiumVisible && (
        <div className="fixed top-8 left-8 z-[9999]">
          <button
            onClick={resetToThreeJS}
            className="bg-gray-800/80 hover:bg-gray-700/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600/20 transition-all duration-300 hover:scale-105"
          >
            ← Back to Solar System
          </button>
        </div>
      )}

      {/* Loading indicator during transition */}
      {isTransitioning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/90 text-white px-6 py-4 rounded-lg border border-gray-600/20">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span>Transitioning to Earth surface...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 