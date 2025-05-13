// Three.js scene setup helpers
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Create and return a new THREE.Scene
export function createScene() {
  return new THREE.Scene()
}

// Create and return a PerspectiveCamera
export function createCamera(width: number, height: number, z = 50) {
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(0, 0, z)
  return camera
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
