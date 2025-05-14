// Three.js scene setup helpers
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// --- CONSTANTS ---
export const CAMERA_FOV = 75
export const DEFAULT_CAMERA_Z = 50

// Create and return a new THREE.Scene
export function createScene() {
  return new THREE.Scene()
}

// Create and return a WebGLRenderer
export function createRenderer(canvas: HTMLCanvasElement, width: number, height: number) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  return renderer
}

// Create and return OrbitControls
export function createControls(camera: THREE.Camera, domElement: HTMLElement) {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  return controls
}

// Set an equirectangular panoramic skybox background
export function setEquirectangularSkybox(
  scene: THREE.Scene,
  texturePath: string,
  onProgress?: (progress: number) => void,
  onLoad?: () => void
) {
  const loader = new THREE.TextureLoader();
  loader.load(
    texturePath,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
      if (onLoad) onLoad();
    },
    (xhr) => {
      if (onProgress && xhr.lengthComputable) {
        const percent = (xhr.loaded / xhr.total) * 100;
        onProgress(percent);
      }
    }
  );
}

export function createSolarCamera(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 1000)
  camera.position.set(0, DEFAULT_CAMERA_Z, DEFAULT_CAMERA_Z)
  camera.lookAt(0, 0, 0)
  return camera
}
