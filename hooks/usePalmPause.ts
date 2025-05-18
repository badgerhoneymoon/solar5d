import { useEffect, useRef } from 'react';
import { Camera } from '@mediapipe/camera_utils';

// CDN URL for loading MediaPipe Hands assets
const HANDS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

// Extend the window object for optional debug callback
// This allows external debugging of the palm distance value
// Useful for development and tuning
//
declare global {
  interface Window {
    __PALM_PAUSE_DEBUG__?: (dist: number) => void;
  }
}

// --- Module-level singletons ---
// These ensure that MediaPipe Hands and camera are only initialized once per session,
// even if React StrictMode causes double-mounting in development.
let initPromise: Promise<void> | null = null;
let globalHands: any = null;
let globalCamera: any = null;
let globalVideo: HTMLVideoElement | null = null;

// Default threshold for palm pause detection (tunable)
const PALM_PAUSE_THRESHOLD = 0.35;

/**
 * usePalmPause
 *
 * React hook that detects when the user's palm is open (not in a fist) by measuring
 * the average distance from the wrist to the fingertips using MediaPipe Hands.
 *
 * - Calls the provided callback with true/false when the pause state changes.
 * - Uses a singleton pattern to avoid reloading WASM and re-initializing the camera.
 * - Emits a 'palmPause' CustomEvent with the computed distance for other listeners.
 *
 * @param onPauseChange Callback invoked with pause state (true = paused)
 * @param threshold Distance threshold for pause detection (default: 0.25)
 */
export default function usePalmPause(
  onPauseChange: (paused: boolean) => void,
  threshold: number = PALM_PAUSE_THRESHOLD
) {
  // Ref to always point to the latest callback, avoiding stale closures
  const callbackRef = useRef(onPauseChange);
  callbackRef.current = onPauseChange;

  useEffect(() => {
    // Only initialize MediaPipe Hands and camera once per session
    if (!initPromise) {
      initPromise = (async () => {
        // Create a hidden video element to capture webcam stream
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        globalVideo = video;

        // Request webcam access (front-facing camera)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream as MediaStream;
        await video.play();

        // Dynamically import MediaPipe Hands (WASM loaded from CDN)
        const { Hands } = await import('@mediapipe/hands');
        globalHands = new Hands({ locateFile: file => `${HANDS_CDN}/${file}` });
        // Configure hand tracking options
        globalHands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        // Register callback for hand landmarks results
        globalHands.onResults(({ multiHandLandmarks }: any) => {
          if (!multiHandLandmarks?.length) return; // No hands detected
          const [wrist, ...rest] = multiHandLandmarks[0];
          // Select the tip of each finger (indices 3, 7, 11, 15, 19)
          const tips = [rest[3], rest[7], rest[11], rest[15], rest[19]];
          // Compute average Euclidean distance from wrist to each fingertip
          const avgDist = tips.reduce((sum: number, t: any) =>
            sum + Math.hypot(t.x - wrist.x, t.y - wrist.y, t.z - wrist.z), 0
          ) / tips.length;
          // Optional debug hook for visualizing/tuning the distance
          if (window.__PALM_PAUSE_DEBUG__) window.__PALM_PAUSE_DEBUG__(avgDist);
          // Emit a custom event with the computed distance for all listeners
          window.dispatchEvent(new CustomEvent('palmPause', { detail: avgDist }));
        });

        // Initialize MediaPipe camera utility to feed video frames to Hands
        globalCamera = new Camera(video, {
          onFrame: async () => { if (globalHands) await globalHands.send({ image: globalVideo! }); },
          width: window.innerWidth,
          height: window.innerHeight,
        });
        globalCamera.start();
      })();
    }
    // Stable event handler for palmPause events
    // Always calls the latest callbackRef with pause state
    const handler = (e: Event) => {
      const dist = (e as CustomEvent<number>).detail;
      // Pause if the palm is closed (distance below threshold)
      callbackRef.current(dist < threshold);
    };
    window.addEventListener('palmPause', handler);
    return () => {
      window.removeEventListener('palmPause', handler);
    };
  }, [threshold]);
} 