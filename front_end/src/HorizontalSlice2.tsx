import React, { useMemo } from 'react';
import * as THREE from 'three';

interface HorizontalSliceProps {
  volumeData: string;
  metadata: { nx: number; ny: number; nz: number; sizeKM: number[] };
  zSlice: number; // Normalized 0 to 1
}

const HorizontalSlice: React.FC<HorizontalSliceProps> = ({ volumeData, metadata, zSlice }) => {
  // 1. Create the 3D Texture only when volumeData changes
  const texture = useMemo(() => {
    if (!volumeData) return null;
    const binaryString = window.atob(volumeData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const floatArray = new Float32Array(bytes.buffer);

    const tex = new THREE.Data3DTexture(floatArray, metadata.nx, metadata.ny, metadata.nz);
    tex.format = THREE.RedFormat;
    tex.type = THREE.FloatType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    return tex;
  }, [volumeData, metadata.nx, metadata.ny, metadata.nz]);

  // 2. Define Uniforms
  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uZLevel: { value: zSlice }, // This must update
   uColors: { value: [
        new THREE.Color('#8b0000'), 
        new THREE.Color('#ff0000'), 
        new THREE.Color('#ffa500'), 
        new THREE.Color('#ffff00'), 
        new THREE.Color('#00ff00'), 
        new THREE.Color('#00ffff'), 
        new THREE.Color('#0000ff'), 
        new THREE.Color('#6217a8')
      ]},
      uMinLog: { value: 0 },
      uMaxLog: { value: 2.5 },
  }), [texture]);

  // 3. Force the uniform to update when the prop zSlice changes
  if (uniforms.uZLevel.value !== zSlice) {
    uniforms.uZLevel.value = zSlice;
  }

  if (!texture) return null;

// ... (Your existing texture and uniforms code) ...

return (
  <mesh 
    // Scale based on North (KM) and East (KM)
    scale={[metadata.sizeKM[0], metadata.sizeKM[1], 1]}
    // PlaneGeometry is vertical by default, rotate it to be horizontal
    rotation={[0, 0, 0]} 
  >
    <planeGeometry args={[1, 1]} />
    <shaderMaterial
      side={THREE.DoubleSide}
         transparent={true}
           // Still checks if it's behind things (like stations)
    //   blending={THREE.AdditiveBlending}
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        precision highp float;
        precision highp sampler3D;
        varying vec2 vUv;
        uniform sampler3D uTexture;
        uniform float uZLevel;
        uniform vec3 uColors[8];
           uniform float uMinLog; // Now used
          uniform float uMaxLog; // Now used

       void main() {
  // Use vUv for X/Y and the uniform uZLevel for the Depth layer
  // Note: Depending on your data orientation, you may need to swap vUv.x/y
  vec3 samplingPos = vec3(vUv.x, vUv.y, uZLevel);
  
  float val = texture(uTexture, samplingPos).r;
  
  // Filter out the 'no-data' or air values
  if (val > 10.0 || val < -5.0) discard;

  // Normalized color mapping
  float norm = clamp((val - uMinLog) / (uMaxLog - uMinLog), 0.0, 1.0);
  int idx = int(floor(norm * 7.0));
  vec3 col = mix(uColors[clamp(idx, 0, 7)], uColors[clamp(idx + 1, 0, 7)], fract(norm * 7.0));
  
  gl_FragColor = vec4(col, 1.0);
}
      `}
    />
  </mesh>
);
};

export default HorizontalSlice;
