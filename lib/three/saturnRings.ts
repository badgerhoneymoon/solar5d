import * as THREE from 'three';

/**
 * Creates the Saturn rings mesh: flat ring with concentric UV mapping.
 * @param planetRadius - scaled radius of the planet
 * @param texture - ring alpha/color texture
 * @param segments - number of radial segments (defaults to 64)
 */
export function createSaturnRings(
  planetRadius: number,
  texture: THREE.Texture,
  segments = 64
): THREE.Mesh {
  const inner = planetRadius * 1.11;
  const outer = planetRadius * 2.27;
  const geometry = new THREE.RingGeometry(inner, outer, segments);
  // Remap UVs: radial distance → U, angle → V
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0, l = pos.count; i < l; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const r = Math.hypot(x, y);
    const a = (Math.atan2(y, x) / (2 * Math.PI) + 0.5) % 1;
    uv.setXY(i, (r - inner) / (outer - inner), a);
  }
  uv.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
} 