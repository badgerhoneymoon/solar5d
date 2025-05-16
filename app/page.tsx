// This is the main entry point for the solar system visualization page
'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, CSSProperties } from 'react'
import solarParams from '../info/solar-params.json'
import { createScene, createSolarCamera, createRenderer, createControls, setEquirectangularSkybox } from '../lib/three/setupScene'
import { updateSolarSystem } from '../lib/three/tick'
import { createSolarSystemObjects, PLANET_SPREAD as INIT_PLANET_SPREAD, START_OFFSET as INIT_START_OFFSET } from '../lib/three/solarSystem'
import { getSolarSystemScales } from '../lib/three/scaling'
import { handleResize } from '../lib/three/resize'
import Overlay from '../components/Overlay'
import { Clock } from 'three'
import ProgressIndicator from '../components/ui/ProgressIndicator'
import { LabelManager, LABEL_FONT_SIZE, LABEL_PADDING } from '../lib/three/labels'
import { cleanupThreeScene } from '../lib/three/cleanup'
import { setupSolarSystemGUI } from '../lib/three/gui'
import usePalmPause from '../hooks/usePalmPause'
import * as THREE from 'three'
import { initObjectTrackingCamera, focusOnObject, updateTrackingCamera, resetCamera } from '../lib/three/objectTrackingCamera'

// --- CONSTANTS ---
const TIME_MULTIPLIER = 1e5
const SKYBOX_TEXTURE_PATH = '/textures/material_emissive.jpg'
const CANVAS_CLASSNAME = 'webgl'
const CANVAS_STYLE: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }
const CONTAINER_STYLE: CSSProperties = { position: 'relative', width: '100vw', height: '100vh' }

// --- MAIN PAGE COMPONENT ---
export default function Home() {
  // --- REFS ---
  // Refs for canvas and container DOM elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // --- STATE ---
  // State for controlling planet spread (distance between planets)
  const [planetSpread, setPlanetSpread] = useState(INIT_PLANET_SPREAD)
  // State for initial offset of planets (not currently updated after mount)
  const [startOffset] = useState(INIT_START_OFFSET)
  // Multiplier to speed up time for visible spin and orbit animations
  const timeMultiplier = TIME_MULTIPLIER
  // GUI options for pausing orbit and spin
  const guiOptions = useRef({ orbitPaused: false, spinPaused: false })
  // State for skybox loading progress and visibility
  const [skyboxProgress, setSkyboxProgress] = useState(0)
  const [skyboxLoading, setSkyboxLoading] = useState(true)
  // State for enabling/disabling hand gestures
  const [handGesturesEnabled, setHandGesturesEnabled] = useState(false)

  // --- THREE.JS SCENE SETUP & ANIMATION EFFECT ---
  useEffect(() => {
    // --- INITIAL SETUP ---
    // Get initial window size
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    // Create Three.js scene
    const scene = createScene()
    // Set up skybox with progress and loading callbacks
    setEquirectangularSkybox(
      scene,
      SKYBOX_TEXTURE_PATH,
      (progress) => setSkyboxProgress(progress),
      () => setSkyboxLoading(false)
    )
    // Create camera and set to angled view
    const camera = createSolarCamera(sizes.width, sizes.height)
    scene.add(camera)
    // Create renderer and attach to canvas
    const renderer = createRenderer(canvasRef.current as HTMLCanvasElement, sizes.width, sizes.height)
    // Initialize label manager for 3D text labels (CSS2D)
    const labelMgr = new LabelManager(containerRef.current!)
    // Set up orbit controls
    const controls = createControls(camera, renderer.domElement)
    // Initialize tracking camera with controls
    initObjectTrackingCamera(camera, controls)
    // Clock for animation timing
    const clock = new Clock()

    // --- SOLAR SYSTEM OBJECTS ---
    // Calculate scaling factors for solar system objects
    const scales = getSolarSystemScales(solarParams)
    // Create meshes for the sun and planets
    const meshes = createSolarSystemObjects(
      { sun: solarParams.sun, planets: solarParams.planets },
      scales,
      planetSpread,
      startOffset
    )
    // Add all meshes to the scene
    meshes.forEach(mesh => scene.add(mesh))
    // Add CSS2D labels for each mesh (planet/sun)
    labelMgr.addLabelsForMeshes(scene, meshes, { fontSize: LABEL_FONT_SIZE, padding: LABEL_PADDING })
    // --- GUI FOR FOCUS CONTROLS ---
    const focusTargets = [
      { name: solarParams.sun.name, mesh: meshes.find(m => m.name === solarParams.sun.name)! },
      ...solarParams.planets.map(p => ({
        name: p.name,
        mesh: meshes.find(m => m.name === p.name)!
      })),
    ]
    const cleanupGUI = setupSolarSystemGUI(
      planetSpread,
      setPlanetSpread,
      guiOptions,
      focusTargets,
      (name, mesh) => {
        const meshAsMesh = mesh as THREE.Mesh
        const radius = (meshAsMesh.geometry as any).parameters.radius as number
        focusOnObject(mesh, radius)
      },
      () => {
        // Smooth top-down reset: center system with easing
        resetCamera(
          new THREE.Vector3(0, 50, 50),
          new THREE.Vector3(0, 0, 0)
        )
      },
      handGesturesEnabled,
      setHandGesturesEnabled
    )

    // --- WINDOW RESIZE HANDLING ---
    const onResize = () => handleResize(camera, renderer, sizes)
    window.addEventListener('resize', onResize)

    // --- ANIMATION LOOP ---
    let frameId: number
    const tick = () => {
      // Calculate time delta (scaled up for visible motion)
      const deltaSec = clock.getDelta() * timeMultiplier
      // Update planet/sun positions and rotations
      updateSolarSystem([solarParams.sun, ...solarParams.planets], meshes, deltaSec, { orbitPaused: guiOptions.current.orbitPaused, spinPaused: guiOptions.current.spinPaused })
      // FIRST_EDIT: replace direct tracking and controls update with conditional logic
      if (updateTrackingCamera()) {
        // camera tracking active, skip control damping
      } else {
        controls.update()
      }
      // Render the scene
      renderer.render(scene, camera)
      // Render 3D text labels (CSS2D)
      labelMgr.render(scene, camera)
      // Schedule next frame
      frameId = requestAnimationFrame(tick)
    }
    // Start animation loop
    frameId = requestAnimationFrame(tick)

    // --- CLEANUP ON UNMOUNT ---
    return () => {
      cleanupGUI()
      cleanupThreeScene({
        frameId,
        meshes,
        scene,
        renderer,
        controls,
        camera,
        onResize,
      })
      // Dispose of label manager and its DOM elements
      labelMgr.dispose()
    }
  }, [planetSpread, startOffset])

  // Palm open/closed detection for orbit pause
  usePalmPause(
    handGesturesEnabled
      ? paused => {
          guiOptions.current.orbitPaused = paused;
        }
      : () => {},
  );

  // --- RENDER ---
  // Render progress indicator, canvas, and overlay UI
  return (
    <>
      <ProgressIndicator progress={skyboxProgress} visible={skyboxLoading} />
      <div
        ref={containerRef}
        style={CONTAINER_STYLE}
      >
        <canvas
          ref={canvasRef}
          className={CANVAS_CLASSNAME}
          style={CANVAS_STYLE}
        />
      </div>
      <Overlay planets={solarParams.planets} />
    </>
  )
}
// --- END OF HOME PAGE ---
