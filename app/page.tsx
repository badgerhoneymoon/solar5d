'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react'
import { GUI } from 'lil-gui'
import solarParams from '../info/solar-params.json'
import { createScene, createCamera, createRenderer, createControls } from '../lib/three/setupScene'
import { updateSolarSystem } from '../lib/three/tick'
import { createSolarSystemObjects } from '../lib/three/solarSystem'
import { getSolarSystemScales } from '../lib/three/scaling'
import { handleResize } from '../lib/three/resize'
import { PLANET_SPREAD as INIT_PLANET_SPREAD, START_OFFSET as INIT_START_OFFSET } from '../lib/three/constants'
import Overlay from '../components/Overlay'
import { Clock } from 'three'
import * as THREE from 'three'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [planetSpread, setPlanetSpread] = useState(INIT_PLANET_SPREAD)
  const [startOffset] = useState(INIT_START_OFFSET)
  // Scale up time for visible spin and orbit
  const timeMultiplier = 1000000
  // Pause controls
  const guiOptions = useRef({ orbitPaused: false, spinPaused: false })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const gui = new GUI()
    gui.title('Solar System Controls')
    gui.add({ planetSpread }, 'planetSpread', 10, 200, 1).onChange(setPlanetSpread)
    gui.add(guiOptions.current, 'orbitPaused').name('Pause Orbit').onChange((v: boolean) => { guiOptions.current.orbitPaused = v })
    gui.add(guiOptions.current, 'spinPaused').name('Pause Spin').onChange((v: boolean) => { guiOptions.current.spinPaused = v })
    return () => gui.destroy()
  }, [])

  useEffect(() => {
    // Sizes
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    // Scene setup
    const scene = createScene()
    // Skybox: set equirectangular panoramic background
    const loader = new THREE.TextureLoader();
    loader.load('/textures/material_emissive.png', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
    });
    const camera = createCamera(sizes.width, sizes.height, 50)
    // Set camera to angled view (not top-down)
    camera.position.set(0, 70, 70)
    camera.lookAt(0, 0, 0)
    scene.add(camera)
    const renderer = createRenderer(canvasRef.current as HTMLCanvasElement, sizes.width, sizes.height)
    const controls = createControls(camera, renderer.domElement)
    const clock = new Clock()

    // Scaling and constants
    const scales = getSolarSystemScales(solarParams)

    // Create solar system objects
    const meshes = createSolarSystemObjects(
      { sun: solarParams.sun, planets: solarParams.planets },
      scales,
      planetSpread,
      startOffset
    )
    meshes.forEach(mesh => scene.add(mesh))

    // Handle resize
    const onResize = () => handleResize(camera, renderer, sizes)
    window.addEventListener('resize', onResize)

    // Animation loop
    const tick = () => {
      const deltaSec = clock.getDelta() * timeMultiplier
      updateSolarSystem(solarParams.planets, meshes, deltaSec, { orbitPaused: guiOptions.current.orbitPaused, spinPaused: guiOptions.current.spinPaused })
      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(tick)
    }
    tick()

    // Cleanup
    return () => {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      controls.dispose()
      meshes.forEach(mesh => {
        if (mesh && typeof (mesh as any).geometry?.dispose === 'function') {
          (mesh as any).geometry.dispose()
        }
      })
    }
  }, [planetSpread, startOffset])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="webgl fixed top-0 left-0 w-full h-full block"
        style={{ display: 'block', width: '100vw', height: '100vh' }}
      />
      <Overlay planets={solarParams.planets} />
    </>
  )
}
