import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Default camera distance from target when not tracking
const DEFAULT_OFFSET = 20
// Default smoothing factor for object tracking camera movement
const DEFAULT_OBJECT_LERP_ALPHA = 0.03
// Smoothing factor for general camera tracking updates
const DEFAULT_LERP_ALPHA = 0.02
// Smoothing factor for camera reset (slower movement)
const DEFAULT_RESET_LERP_ALPHA = 0.01
// Multiplier to determine camera offset based on object size
const FOCUS_OFFSET_SCALE = 3
// Threshold to determine when camera reset is "close enough" to finish
const RESET_FINISH_THRESHOLD = 0.01

let trackedObject: THREE.Object3D | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let initialCameraPos: THREE.Vector3 | null = null
let initialCameraTarget: THREE.Vector3 | null = null
let offset = DEFAULT_OFFSET
let lerpAlpha = DEFAULT_LERP_ALPHA
const resetLerpAlpha = DEFAULT_RESET_LERP_ALPHA
let resetTargetPos: THREE.Vector3 | null = null
let resetTargetFocus: THREE.Vector3 | null = null

// Initialize camera tracking system
export function initObjectTrackingCamera(
  cam: THREE.PerspectiveCamera,
  ctrls: OrbitControls,
  defaultOffset = DEFAULT_OFFSET,
  objectLerpAlpha = DEFAULT_OBJECT_LERP_ALPHA
) {
  camera = cam
  controls = ctrls
  // Save initial camera position and target for reset
  initialCameraPos = cam.position.clone()
  initialCameraTarget = ctrls.target.clone()
  // Cancel any reset in progress on user interaction
  controls.addEventListener('start', () => {
    resetTargetPos = null
    resetTargetFocus = null
  })
  offset = defaultOffset
  lerpAlpha = objectLerpAlpha
}

// Start tracking a specific object, adjusting offset based on size
export function focusOnObject(obj: THREE.Object3D, size = 1, customOffset?: number) {
  trackedObject = obj
  // Cancel any reset in progress
  resetTargetPos = null
  resetTargetFocus = null
  // Set offset proportional to object size
  offset = customOffset ?? size * FOCUS_OFFSET_SCALE
}

// Stop tracking any object
export function clearTracking() {
  trackedObject = null
}

// Smoothly reset camera to the initial position and target
export function resetCamera() {
  trackedObject = null
  if (initialCameraPos && initialCameraTarget) {
    resetTargetPos = initialCameraPos.clone()
    resetTargetFocus = initialCameraTarget.clone()
  }
}

// Update camera position and target each frame
export function updateTrackingCamera() {
  if (!camera || !controls) return false
  // If tracking an object, smoothly follow it
  if (trackedObject) {
    const worldTarget = new THREE.Vector3()
    trackedObject.getWorldPosition(worldTarget)
    controls.target.lerp(worldTarget, lerpAlpha)
    const dir = camera.position.clone().sub(controls.target).normalize()
    const desiredPos = controls.target.clone().add(dir.multiplyScalar(offset))
    camera.position.lerp(desiredPos, lerpAlpha)
    camera.lookAt(controls.target)
    return true
  }
  // If resetting, smoothly move to default position/target
  if (resetTargetPos && resetTargetFocus) {
    controls.target.lerp(resetTargetFocus, resetLerpAlpha)
    camera.position.lerp(resetTargetPos, resetLerpAlpha)
    camera.lookAt(controls.target)
    // Finish reset when close enough
    if (
      camera.position.distanceTo(resetTargetPos) < RESET_FINISH_THRESHOLD &&
      controls.target.distanceTo(resetTargetFocus) < RESET_FINISH_THRESHOLD
    ) {
      resetTargetPos = null
      resetTargetFocus = null
    }
    return false
  }
  // No tracking or reset in progress
  return false
} 