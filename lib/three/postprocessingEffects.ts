import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Simple Radial Blur Shader
export const RadialBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    strength: { value: 0.0 }, // 0.0 means no blur
    samples: { value: 3 }, // Increased default for better quality
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 center;
    uniform float strength;
    uniform int samples;
    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - center;
      float dist = length(dir);
      vec4 color = texture2D(tDiffuse, vUv);

      if (strength > 0.0 && samples > 1) {
        vec4 sum = color; // Start with original pixel
        
        // Create streaking lines by sampling backward toward center
        float lineLength = strength * dist * 1.0; // Increased for stronger star streaks
        
        for (int i = 1; i < samples; i++) {
          float t = float(i) / float(samples - 1); // 0.0 to 1.0
          // Sample backward along the direction toward center
          vec2 samplePos = vUv - dir * t * lineLength;
          sum += texture2D(tDiffuse, samplePos);
        }
        
        // Average all samples for the streak effect
        color = sum / float(samples);
      }
      gl_FragColor = color;
    }
  `,
};

export function createRadialBlurPass(): ShaderPass {
  const pass = new ShaderPass(RadialBlurShader);
  pass.enabled = true; // Enable by default, but strength is 0
  return pass;
}

export function setRadialBlurStrength(pass: ShaderPass, strength: number) {
  if (pass && pass.uniforms && pass.uniforms.strength) {
    pass.uniforms.strength.value = strength;
  }
}

export function setRadialBlurCenter(pass: ShaderPass, center: THREE.Vector2) {
  if (pass && pass.uniforms && pass.uniforms.center) {
    pass.uniforms.center.value.copy(center);
  }
}

export function setRadialBlurSamples(pass: ShaderPass, samples: number) {
  if (pass && pass.uniforms && pass.uniforms.samples) {
    pass.uniforms.samples.value = samples;
  }
}

// Note: setRadialBlurSamples is available but not currently used - samples are set to fixed value (3) 