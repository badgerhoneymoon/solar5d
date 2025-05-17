import { useEffect, useRef } from 'react';
import { Camera } from '@mediapipe/camera_utils';

const HANDS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

declare global {
  interface Window {
    __PALM_PAUSE_DEBUG__?: (dist: number) => void;
  }
}

// Module-level singletons to avoid double-init under StrictMode
let initPromise: Promise<void> | null = null;
let globalHands: any = null;
let globalCamera: any = null;
let globalVideo: HTMLVideoElement | null = null;

const PALM_PAUSE_THRESHOLD = 0.25;

/**
 * Hook that pauses based on palm-to-wrist distance using MediaPipe Hands.
 * Uses singleton initPromise to load WASM only once per session.
 */
export default function usePalmPause(
  onPauseChange: (paused: boolean) => void,
  threshold: number = PALM_PAUSE_THRESHOLD
) {
  // Use a ref to always point to the latest callback
  const callbackRef = useRef(onPauseChange);
  callbackRef.current = onPauseChange;

  useEffect(() => {
    let active = true;
    if (!initPromise) {
      initPromise = (async () => {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        globalVideo = video;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream as MediaStream;
        await video.play();

        const { Hands } = await import('@mediapipe/hands');
        globalHands = new Hands({ locateFile: file => `${HANDS_CDN}/${file}` });
        globalHands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        globalHands.onResults(({ multiHandLandmarks }: any) => {
          if (!multiHandLandmarks?.length) return;
          const [wrist, ...rest] = multiHandLandmarks[0];
          const tips = [rest[3], rest[7], rest[11], rest[15], rest[19]];
          const avgDist = tips.reduce((sum: number, t: any) =>
            sum + Math.hypot(t.x - wrist.x, t.y - wrist.y, t.z - wrist.z), 0
          ) / tips.length;
          if (window.__PALM_PAUSE_DEBUG__) window.__PALM_PAUSE_DEBUG__(avgDist);
          window.dispatchEvent(new CustomEvent('palmPause', { detail: avgDist }));
        });

        globalCamera = new Camera(video, {
          onFrame: async () => { if (globalHands) await globalHands.send({ image: globalVideo! }); },
          width: window.innerWidth,
          height: window.innerHeight,
        });
        globalCamera.start();
      })();
    }
    // Stable event handler that always calls the latest callback
    const handler = (e: Event) => {
      const dist = (e as CustomEvent<number>).detail;
      callbackRef.current(dist < threshold);
    };
    window.addEventListener('palmPause', handler);
    return () => {
      active = false;
      window.removeEventListener('palmPause', handler);
    };
  }, [threshold]);
} 