import { GUI } from 'lil-gui'
import * as THREE from 'three'

export function setupSolarSystemGUI(
  planetSpread: number,
  setPlanetSpread: (v: number) => void,
  guiOptionsRef: React.MutableRefObject<{ orbitPaused: boolean; spinPaused: boolean }>,
  focusTargets: { name: string; mesh: THREE.Object3D }[],
  onFocus: (name: string, mesh: THREE.Object3D) => void,
  onResetCamera: () => void,
  handGesturesEnabled: boolean,
  setHandGesturesEnabled: (v: boolean) => void
) {
  const gui = new GUI()
  gui.title('Solar System Controls')
  gui.add({ planetSpread }, 'planetSpread', 10, 200, 1).onChange(setPlanetSpread)
  gui.add(guiOptionsRef.current, 'orbitPaused').name('Pause Orbit').onChange((v: boolean) => { guiOptionsRef.current.orbitPaused = v })
  gui.add(guiOptionsRef.current, 'spinPaused').name('Pause Spin').onChange((v: boolean) => { guiOptionsRef.current.spinPaused = v })

  // Add hand gesture toggle in its own folder
  const handFolder = gui.addFolder('Hand Gestures')
  handFolder.add({ handGesturesEnabled }, 'handGesturesEnabled').name('Enable').onChange(setHandGesturesEnabled)

  // Add folder for camera controls
  const cameraFolder = gui.addFolder('Camera')
  cameraFolder.add({ 'Reset Camera': onResetCamera }, 'Reset Camera')

  // Add folder for focus controls
  const focusFolder = gui.addFolder('Focus On')
  focusTargets.forEach(({ name, mesh }) => {
    focusFolder.add({ [name]: () => onFocus(name, mesh) }, name)
  })

  return () => gui.destroy()
} 