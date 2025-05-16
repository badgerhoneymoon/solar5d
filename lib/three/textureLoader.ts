import * as THREE from 'three'

let sunTexture: THREE.Texture | undefined;
let mercuryTexture: THREE.Texture | undefined;
let venusTexture: THREE.Texture | undefined;
let earthTexture: THREE.Texture | undefined;
let marsTexture: THREE.Texture | undefined;
let jupiterTexture: THREE.Texture | undefined;
let saturnTexture: THREE.Texture | undefined;
let uranusTexture: THREE.Texture | undefined;
let neptuneTexture: THREE.Texture | undefined;
let saturnRingTexture: THREE.Texture | undefined; // Added for Saturn's rings

export function getPlanetTextures() {
  if (typeof window === 'undefined') return {};
  if (!sunTexture) {
    sunTexture = new THREE.TextureLoader().load('/textures/planets/2k_sun.jpg');
    mercuryTexture = new THREE.TextureLoader().load('/textures/planets/2k_mercury.jpg');
    venusTexture = new THREE.TextureLoader().load('/textures/planets/2k_venus.jpg');
    earthTexture = new THREE.TextureLoader().load('/textures/planets/2k_earth.jpg');
    marsTexture = new THREE.TextureLoader().load('/textures/planets/2k_mars.jpg');
    jupiterTexture = new THREE.TextureLoader().load('/textures/planets/2k_jupiter.jpg');
    saturnTexture = new THREE.TextureLoader().load('/textures/planets/2k_saturn.jpg');
    uranusTexture = new THREE.TextureLoader().load('/textures/planets/2k_uranus.jpg');
    neptuneTexture = new THREE.TextureLoader().load('/textures/planets/2k_neptune.jpg');
    // IMPORTANT: Update this path to your actual Saturn ring texture
    saturnRingTexture = new THREE.TextureLoader().load('/textures/planets/2k_saturn_ring_alpha.png');

    mercuryTexture.colorSpace = THREE.SRGBColorSpace;
    venusTexture.colorSpace = THREE.SRGBColorSpace;
    marsTexture.colorSpace = THREE.SRGBColorSpace;
    jupiterTexture.colorSpace = THREE.SRGBColorSpace;
    saturnTexture.colorSpace = THREE.SRGBColorSpace;
    uranusTexture.colorSpace = THREE.SRGBColorSpace;
    neptuneTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    sunTexture.colorSpace = THREE.SRGBColorSpace;
    if (saturnRingTexture) {
      saturnRingTexture.colorSpace = THREE.SRGBColorSpace;
    }
  }
  return { sunTexture, mercuryTexture, venusTexture, earthTexture, marsTexture, jupiterTexture, saturnTexture, uranusTexture, neptuneTexture, saturnRingTexture };
} 