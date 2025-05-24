// This is the main entry point for the solar system visualization page
'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, CSSProperties, useMemo } from 'react'
import solarParams from '../info/solar-params.json'
import { createScene, createSolarCamera, createRenderer, createControls, setEquirectangularSkybox } from '../lib/three/setupScene'
import { updateSolarSystem } from '../lib/three/tick'
import { createSolarSystemObjects, PLANET_SPREAD as INIT_PLANET_SPREAD } from '../lib/three/solarSystem'
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
import PalmPauseDebugOverlay from '../components/PalmPauseDebugOverlay'
import ToggleImageSwitch from '../components/ui/toggle-image-switch'
import { VoiceService } from '../lib/services/realtime-api-service'
import { isMobile } from '../lib/utils/mobile'
import { EarthCesiumIntegration } from '../components/cesium/EarthCesiumIntegration'

// --- CONSTANTS ---
const TIME_MULTIPLIER = 1e5
const SKYBOX_TEXTURE_PATH = '/textures/stars/8k_stars_milky_way.jpg'
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
  // State for tracking the currently focused planet for facts overlay
  const [focusedPlanet, setFocusedPlanet] = useState<string | null>(null)
  // Multiplier to speed up time for visible spin and orbit animations
  const timeMultiplier = TIME_MULTIPLIER
  // GUI options for pausing orbit and spin
  const guiOptions = useRef({ orbitPaused: false, spinPaused: false })
  // State for skybox loading progress and visibility
  const [skyboxProgress, setSkyboxProgress] = useState(0)
  const [skyboxLoading, setSkyboxLoading] = useState(true)
  // State for enabling/disabling hand gestures
  const [handGesturesEnabled, setHandGesturesEnabled] = useState(false)
  // State for enabling/disabling voice mode
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  // State for mobile detection (to prevent hydration mismatch)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const voiceServiceRef = useRef<VoiceService | null>(null)
  const focusTargetsRef = useRef<{ name: string; mesh: THREE.Object3D }[]>([])
  const spinControllerRef = useRef<{ updateDisplay: () => void } | null>(null)
  const [hardStopWarning, setHardStopWarning] = useState<string | null>(null)
  // Refs for Cesium integration
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const earthMeshRef = useRef<THREE.Object3D | null>(null)
  // State for tracking Cesium visibility
  const [cesiumVisible, setCesiumVisible] = useState(false)

  // Detect mobile after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  // Mobile-aware button positioning - memoized to prevent hydration issues
  const buttonStyles = useMemo(() => {
    const baseVoiceStyle: CSSProperties = {
      position: 'fixed' as const,
      right: isMobileDevice ? '0.5rem' : '1rem',
      bottom: isMobileDevice ? '7rem' : '20rem',
      zIndex: 9999,
      transformOrigin: 'center center' as const,
      ...(isMobileDevice && {
        transform: 'scale(0.7)',
        transformOrigin: 'bottom right'
      })
    }
    
    // Only add animation when needed to avoid undefined values
    if (voiceRecording) {
      baseVoiceStyle.animation = 'pulse-scale 1s infinite ease-in-out'
    }

    return {
      voice: baseVoiceStyle,
      gesture: {
        position: 'fixed' as const,
        right: isMobileDevice ? '0.5rem' : '1rem',
        bottom: isMobileDevice ? '0.5rem' : '11rem',
        zIndex: 9999,
        ...(isMobileDevice && {
          transform: 'scale(0.7)',
          transformOrigin: 'bottom right'
        })
      }
    }
  }, [isMobileDevice, voiceRecording])

  // --- THREE.JS SCENE SETUP & ANIMATION EFFECT ---
  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return

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
    // Store camera reference for Cesium integration
    threeCameraRef.current = camera
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
      planetSpread
    )
    // Add all meshes to the scene
    meshes.forEach(mesh => scene.add(mesh))
    // Store Earth mesh reference for Cesium integration
    const earthMesh = meshes.find(mesh => mesh.name.toLowerCase() === 'earth')
    if (earthMesh) {
      earthMeshRef.current = earthMesh
    }
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
    const { cleanup: cleanupGUI, spinController } = setupSolarSystemGUI(
      planetSpread,
      setPlanetSpread,
      guiOptions,
      focusTargets,
      (name, mesh) => {
        let radius: number
        if (mesh instanceof THREE.Group) {
          // Saturn is a group: get the body child
          const body = mesh.getObjectByName(`${name}_body`) as THREE.Mesh
          radius = (body.geometry as any).parameters.radius as number
        } else {
          const meshAsMesh = mesh as THREE.Mesh
          radius = (meshAsMesh.geometry as any).parameters.radius as number
        }
        focusOnObject(mesh, radius)
        setFocusedPlanet(name)
        // Pause spinning when focusing via GUI control
        guiOptions.current.spinPaused = true
        // Reflect in GUI
        spinController.updateDisplay()
      },
      () => {
        // Smooth reset to initial camera state
        resetCamera()
        setFocusedPlanet(null)
        // Resume spinning when resetting focus
        guiOptions.current.spinPaused = false
        // Reflect in GUI
        spinController.updateDisplay()
      }
    )
    // Store refs for voice control
    focusTargetsRef.current = focusTargets
    spinControllerRef.current = spinController

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
      // toggle between tracking and OrbitControls update
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
  }, [planetSpread])

  // Palm open/closed detection for orbit and spin pause
  usePalmPause(
    handGesturesEnabled
      ? paused => {
          guiOptions.current.orbitPaused = paused;
          guiOptions.current.spinPaused = paused;
        }
      : () => {},
  );

  // Hook up VoiceService to start/stop recording when voiceModeEnabled changes
  useEffect(() => {
    if (voiceModeEnabled) {
      if (!voiceServiceRef.current) {
        const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY
        if (!key) {
          console.error('Missing NEXT_PUBLIC_OPENAI_API_KEY')
          return
        }
        voiceServiceRef.current = new VoiceService(key)
        voiceServiceRef.current.on('error', err => console.error('[VoiceService]', err))
        voiceServiceRef.current.on('debug', msg => console.debug('[VoiceService]', msg))
        voiceServiceRef.current.on('recordingStarted', () => setVoiceRecording(true))
        voiceServiceRef.current.on('recordingStopped', () => {
          setVoiceRecording(false)
          setVoiceModeEnabled(false)
        })
        // Listen for focus_planet calls from voice service
        voiceServiceRef.current.on('focus_planet', (planetName: string) => {
          // Find the target mesh
          const target = focusTargetsRef.current.find(t => t.name.toLowerCase() === planetName.toLowerCase())
          if (!target) return
          const mesh = target.mesh
          // Determine radius for camera offset
          let radius: number
          if (mesh instanceof THREE.Group) {
            const body = mesh.getObjectByName(`${target.name}_body`) as THREE.Mesh
            radius = (body.geometry as any).parameters.radius as number
          } else {
            radius = ((mesh as THREE.Mesh).geometry as any).parameters.radius as number
          }
          // Trigger camera focus and update state
          focusOnObject(mesh, radius)
          setFocusedPlanet(planetName)
          // Pause spinning and update GUI
          guiOptions.current.spinPaused = true
          spinControllerRef.current?.updateDisplay()
        })
        // Listen for hard stop warning
        voiceServiceRef.current.on('hardStopWarning', (msg: string) => {
          setHardStopWarning(msg)
          setTimeout(() => setHardStopWarning(null), 10000)
        })
        // Subscribe to transcript streaming events
        voiceServiceRef.current.on('recordingStopped', () => setVoiceRecording(false))
      }
      voiceServiceRef.current.startRecording()
    } else {
      voiceServiceRef.current?.stopRecording()
    }
  }, [voiceModeEnabled]);

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
      <Overlay planets={solarParams.planets} focusedPlanet={focusedPlanet} cesiumVisible={cesiumVisible} />
      {/* Voice mode button */}
      <ToggleImageSwitch
        enabled={voiceModeEnabled}
        onToggle={() => setVoiceModeEnabled(!voiceModeEnabled)}
        label="Voice"
        enabledLabel="Disable"
        disabledLabel="Voice"
        enabledBorder="2px solid #fa0"
        disabledBorder="2px solid #fff200"
        enabledText="#fa0"
        disabledText="#fff200"
        image="/images/gestures/mic.jpg"
        alt={voiceModeEnabled ? 'Disable voice' : 'Enable voice'}
        style={buttonStyles.voice}
      />
      {/* Gestures button */}
      <ToggleImageSwitch
        enabled={handGesturesEnabled}
        onToggle={() => setHandGesturesEnabled(!handGesturesEnabled)}
        label="Gestures"
        enabledLabel="Disable"
        disabledLabel="Gestures"
        enabledBorder="2px solid #f55"
        disabledBorder="2px solid #6f6"
        enabledText="#f55"
        disabledText="#6f6"
        image="/images/gestures/gesture_mode.jpg"
        alt={handGesturesEnabled ? 'Disable gestures' : 'Enable gestures'}
        style={buttonStyles.gesture}
      />
      {handGesturesEnabled && <PalmPauseDebugOverlay />}
      {/* Hard stop warning dialog */}
      {hardStopWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#222',
            color: '#fff',
            padding: '2rem 3rem',
            borderRadius: '1rem',
            boxShadow: '0 2px 16px #0008',
            fontSize: '1.2rem',
            textAlign: 'center',
            maxWidth: 400,
          }}>
            {hardStopWarning}
            <br />
            <button onClick={() => setHardStopWarning(null)} style={{
              marginTop: '1.5rem',
              background: '#fa0',
              color: '#222',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}>OK</button>
          </div>
        </div>
      )}
      
      {/* Cesium Earth Integration */}
      <EarthCesiumIntegration
        focusedPlanet={focusedPlanet}
        onCesiumVisibilityChange={setCesiumVisible}
        onTransitionStart={() => {
          console.log('Cesium transition started');
        }}
        onTransitionComplete={() => {
          console.log('Cesium transition completed');
        }}
      />
    </>
  )
}
// --- END OF HOME PAGE ---
