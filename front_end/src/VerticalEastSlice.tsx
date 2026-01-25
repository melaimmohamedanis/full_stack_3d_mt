import React, { useMemo } from 'react';
import * as THREE from 'three';

interface VerticalEastSliceProps {
  volumeData: string;
  metadata: { nx: number; ny: number; nz: number; sizeKM: number[] };
  eSlice: number; // Normalized 0 to 1 (East-West translation)
}

const VerticalEastSlice: React.FC<VerticalEastSliceProps> = ({ volumeData, metadata, eSlice }) => {
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

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uELevel: { value: eSlice }, 
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

  if (uniforms.uELevel.value !== eSlice) {
    uniforms.uELevel.value = eSlice;
  }

  if (!texture) return null;

  return (
    <mesh 
      // scale[0] = North Span (Width of plane), scale[1] = Depth Span (Height of plane)
      scale={[metadata.sizeKM[0], metadata.sizeKM[2], 1]} 
      // Rotation: Facing North/South (standard plane rotation)
      rotation={[ Math.PI / 2,0, 0]} 
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        side={THREE.DoubleSide}
          transparent={true}
              // Still checks if it's behind things (like stations)
      
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
          uniform float uELevel;
          uniform vec3 uColors[8];
          uniform float uMinLog; // Now used
          uniform float uMaxLog; // Now used

          void main() {
            // uELevel = East (Y axis in texture) - FIXED
            // vUv.x  = North (X axis in texture) - Traversed horizontally
            // vUv.y  = Depth (Z axis in texture) - Traversed vertically
            
            // Note: Using 1.0 - vUv.y to keep Depth orientation correct (Surface at top)
            //the north-south somehow  flipped so we use 1.0 - vUv.x instead of  vUv.x
            vec3 samplingPos = vec3(1.0 - vUv.x, uELevel, vUv.y);
            
            float val = texture(uTexture, samplingPos).r;
            if (val > 10.0 || val < -5.0) discard;

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

export default VerticalEastSlice;