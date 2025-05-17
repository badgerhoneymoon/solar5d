import { GUI } from 'lil-gui'
import * as THREE from 'three'

export function setupSolarSystemGUI(
  planetSpread: number,
  setPlanetSpread: (v: number) => void,
  guiOptionsRef: React.MutableRefObject<{ orbitPaused: boolean; spinPaused: boolean }>,
  focusTargets: { name: string; mesh: THREE.Object3D }[],
  onFocus: (name: string, mesh: THREE.Object3D) => void,
  onResetCamera: () => void,
) {
  const gui = new GUI()
  gui.title('Solar System Controls')
  gui.add({ planetSpread }, 'planetSpread', 300, 1000, 1).onChange(setPlanetSpread)
  gui.add(guiOptionsRef.current, 'orbitPaused').name('Pause Orbit').onChange((v: boolean) => { guiOptionsRef.current.orbitPaused = v })
  const spinController = gui.add(guiOptionsRef.current, 'spinPaused').name('Pause Spin').onChange((v: boolean) => { guiOptionsRef.current.spinPaused = v })

  // Add folder for camera controls
  const cameraFolder = gui.addFolder('Camera')
  cameraFolder.add({ 'Reset Camera': onResetCamera }, 'Reset Camera')

  // Add folder for focus controls
  const focusFolder = gui.addFolder('Focus On')
  focusTargets.forEach(({ name, mesh }) => {
    focusFolder.add({ [name]: () => onFocus(name, mesh) }, name)
  })

  return { cleanup: () => gui.destroy(), spinController }
} 