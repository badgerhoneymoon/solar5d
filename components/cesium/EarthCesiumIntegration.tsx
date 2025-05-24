'use client';

import React from 'react';
import * as THREE from 'three';
import { CesiumViewer } from './CesiumViewer';
import { EarthTransitionButton } from './EarthTransitionButton';
import { setRadialBlurStrength, setRadialBlurCenter } from '../../lib/three/postprocessingEffects';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
  // Blur effects are now controlled internally during transitions
  earthMesh?: THREE.Object3D | null;
  renderer?: THREE.WebGLRenderer | null;
  radialBlurPass?: ShaderPass | null;
}

export const EarthCesiumIntegration: React.FC<EarthCesiumIntegrationProps> = ({
  focusedPlanet,
  threeCamera,
  focusedEarthDetails,
  onTransitionStart,
  onTransitionComplete,
  onCesiumVisibilityChange,
  earthMesh,
  renderer,
  radialBlurPass,
}) => {
  const [cesiumVisible, setCesiumVisible] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [threeJsViewContextForCesium, setThreeJsViewContextForCesium] = React.useState<ThreeJsViewContext | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  // Check if we should show the transition button
  const shouldShowButton = focusedPlanet?.toLowerCase() === 'earth' && !cesiumVisible && !isTransitioning;

  const projectToScreen = React.useCallback((object: THREE.Object3D, camera: THREE.Camera, canvas: HTMLCanvasElement) => {
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector);
    vector.project(camera);

    const widthHalf = canvas.width / 2;
    const heightHalf = canvas.height / 2;

    return new THREE.Vector2(
      (vector.x * widthHalf) + widthHalf,
      -(vector.y * heightHalf) + heightHalf
    );
  }, []);

  // Start the transition from Three.js to Cesium
  const startTransition = React.useCallback(async () => {
    if (isTransitioning || !threeCamera || !earthMesh || !focusedEarthDetails || !renderer || !radialBlurPass) return;

    setIsTransitioning(true);
    onTransitionStart?.();

    // Start with no blur - will ramp up gradually
    setRadialBlurStrength(radialBlurPass, 0);

    const duration = 3000; // 1.5 seconds
    const maxBlurStrength = 0.25; // Maximum blur strength
    let startTime: number | null = null;

    const startPosition = threeCamera.position.clone();
    const earthSurfaceOffset = 2.0;
    const targetPosition = new THREE.Vector3();
    earthMesh.getWorldPosition(targetPosition);
    const directionToEarth = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
    const distanceToSurface = startPosition.distanceTo(targetPosition) - (focusedEarthDetails.radiusTjs * earthSurfaceOffset);
    const finalTargetPosition = new THREE.Vector3().copy(startPosition).addScaledVector(directionToEarth, Math.max(0, distanceToSurface));
    const canvas = renderer.domElement;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Animate camera position
      threeCamera.position.lerpVectors(startPosition, finalTargetPosition, progress);
      threeCamera.lookAt(targetPosition);

      // Gradually increase blur strength throughout entire animation
      const currentBlurStrength = maxBlurStrength * progress; // 0 to maxBlurStrength over full duration
      setRadialBlurStrength(radialBlurPass, currentBlurStrength);

      // Optionally update blur center if you want it to follow Earth
      if (canvas && radialBlurPass) {
        const screenPos = projectToScreen(earthMesh, threeCamera, canvas);
        setRadialBlurCenter(radialBlurPass, new THREE.Vector2(screenPos.x / canvas.width, 1.0 - (screenPos.y / canvas.height)));
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure blur is completely off at the end
        setRadialBlurStrength(radialBlurPass, 0);
        // Prepare context for Cesium
        const earthWorldPosition = new THREE.Vector3();
        focusedEarthDetails.mesh.getWorldPosition(earthWorldPosition);
        setThreeJsViewContextForCesium({
          cameraPosition: threeCamera.position.clone(),
          cameraUp: threeCamera.up.clone(),
          earthCenterTjs: earthWorldPosition,
          earthRadiusTjs: focusedEarthDetails.radiusTjs,
        });
        setCesiumVisible(true);
        onCesiumVisibilityChange?.(true);
        if (canvas) {
          canvas.style.display = 'none';
        }
        setTimeout(() => {
            setIsTransitioning(false);
            onTransitionComplete?.();
        }, 100);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

  }, [
    isTransitioning, 
    threeCamera, 
    earthMesh, 
    focusedEarthDetails, 
    onTransitionStart, 
    onTransitionComplete, 
    onCesiumVisibilityChange, 
    projectToScreen,
    renderer,
    radialBlurPass
  ]);

  // Reset to Three.js view
  const resetToThreeJS = React.useCallback(() => {
    setCesiumVisible(false);
    onCesiumVisibilityChange?.(false);
    setIsTransitioning(false);

    if (renderer?.domElement) {
      renderer.domElement.style.display = 'block'; // Show Three.js canvas
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [renderer, onCesiumVisibilityChange]);

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
    </>
  );
}; 