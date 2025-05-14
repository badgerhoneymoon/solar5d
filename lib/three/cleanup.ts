/* eslint-disable @typescript-eslint/no-explicit-any */
// Utility to clean up three.js scene, renderer, controls, meshes, and label renderer
import { Object3D, Camera } from 'three'

export function cleanupThreeScene({
  frameId,
  meshes,
  scene,
  renderer,
  controls,
  onResize,
}: {
  frameId: number
  meshes: Object3D[]
  scene: any
  renderer: any
  controls: any
  camera: Camera
  onResize: () => void
}) {
  // Stop the animation loop
  cancelAnimationFrame(frameId)
  window.removeEventListener('resize', onResize)
  // Remove old meshes from scene
  meshes.forEach(mesh => scene.remove(mesh))
  // Dispose renderers and controls
  renderer.dispose()
  controls.dispose()
  // Dispose geometries
  meshes.forEach(mesh => {
    if (mesh && typeof (mesh as any).geometry?.dispose === 'function') {
      (mesh as any).geometry.dispose()
    }
  })
} 