// Helper for handling Three.js camera and renderer resize
import * as THREE from 'three'

/**
 * Updates camera aspect and renderer size on window resize.
 * @param camera - The THREE.PerspectiveCamera
 * @param renderer - The THREE.WebGLRenderer
 * @param sizes - Object with width and height properties (mutated)
 */
export function handleResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, sizes: { width: number, height: number }) {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}
