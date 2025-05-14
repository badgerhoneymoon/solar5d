'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react'
import { GUI } from 'lil-gui'
import solarParams from '../info/solar-params.json'
import { createScene, createCamera, createRenderer, createControls, setEquirectangularSkybox } from '../lib/three/setupScene'
import { updateSolarSystem } from '../lib/three/tick'
import { createSolarSystemObjects } from '../lib/three/solarSystem'
import { getSolarSystemScales } from '../lib/three/scaling'
import { handleResize } from '../lib/three/resize'
import { PLANET_SPREAD as INIT_PLANET_SPREAD, START_OFFSET as INIT_START_OFFSET } from '../lib/three/constants'
import Overlay from '../components/Overlay'
import { Clock } from 'three'
import ProgressIndicator from '../components/ui/ProgressIndicator'
import { LabelManager } from '../lib/three/labels'
import { cleanupThreeScene } from '../lib/three/cleanup'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [planetSpread, setPlanetSpread] = useState(INIT_PLANET_SPREAD)
  const [startOffset] = useState(INIT_START_OFFSET)
  // Scale up time for visible spin and orbit
  const timeMultiplier = 1000000
  // Pause controls
  const guiOptions = useRef({ orbitPaused: false, spinPaused: false })
  const [skyboxProgress, setSkyboxProgress] = useState(0)
  const [skyboxLoading, setSkyboxLoading] = useState(true)

  // (no ref needed; using LabelManager)

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
    setEquirectangularSkybox(
      scene,
      '/textures/material_emissive.jpg',
      (progress) => setSkyboxProgress(progress),
      () => setSkyboxLoading(false)
    )
    const camera = createCamera(sizes.width, sizes.height, 50)
    // Set camera to angled view (not top-down)
    camera.position.set(0, 70, 70)
    camera.lookAt(0, 0, 0)
    scene.add(camera)
    const renderer = createRenderer(canvasRef.current as HTMLCanvasElement, sizes.width, sizes.height)
    // Initialize 3D text label manager
    const labelMgr = new LabelManager(containerRef.current!)
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

    // Add CSS2D labels for each mesh
    meshes.forEach(mesh => {
      const offsetY = (mesh as any).userData.labelOffset
      const text = (mesh as any).userData.labelText
      if (offsetY != null && text) {
        labelMgr.add(
          scene,
          mesh,
          text,
          offsetY * 3.7, // raise label higher above mesh
          { fontSize: '10px', padding: '1px 3px' } // smaller label
        )
      }
    })

    // Handle resize
    const onResize = () => handleResize(camera, renderer, sizes)
    window.addEventListener('resize', onResize)

    // Animation loop
    let frameId: number
    const tick = () => {
      const deltaSec = clock.getDelta() * timeMultiplier
      updateSolarSystem([solarParams.sun, ...solarParams.planets], meshes, deltaSec, { orbitPaused: guiOptions.current.orbitPaused, spinPaused: guiOptions.current.spinPaused })
      controls.update()
      renderer.render(scene, camera)
      // Render 3D text labels
      labelMgr.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    // Start loop
    frameId = requestAnimationFrame(tick)

    // Cleanup
    return () => {
      cleanupThreeScene({
        frameId,
        meshes,
        scene,
        renderer,
        controls,
        camera,
        onResize,
      })
      // Cleanup label manager DOM
      labelMgr.dispose()
    }
  }, [planetSpread, startOffset])

  return (
    <>
      <ProgressIndicator progress={skyboxProgress} visible={skyboxLoading} />
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100vw', height: '100vh' }}
      >
        <canvas
          ref={canvasRef}
          className="webgl"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </div>
      <Overlay planets={solarParams.planets} />
    </>
  )
}
