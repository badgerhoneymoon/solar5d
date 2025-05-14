import { GUI } from 'lil-gui'

export function setupSolarSystemGUI(
  planetSpread: number,
  setPlanetSpread: (v: number) => void,
  guiOptionsRef: React.MutableRefObject<{ orbitPaused: boolean; spinPaused: boolean }>
) {
  const gui = new GUI()
  gui.title('Solar System Controls')
  gui.add({ planetSpread }, 'planetSpread', 10, 200, 1).onChange(setPlanetSpread)
  gui.add(guiOptionsRef.current, 'orbitPaused').name('Pause Orbit').onChange((v: boolean) => { guiOptionsRef.current.orbitPaused = v })
  gui.add(guiOptionsRef.current, 'spinPaused').name('Pause Spin').onChange((v: boolean) => { guiOptionsRef.current.spinPaused = v })
  return () => gui.destroy()
} 