import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SolidAnomalyProps {
  volumeData: string; 
  metadata: {
    nx: number; // Will receive n_north
    ny: number; // Will receive n_east
    nz: number; // Will receive n_z
    sizeKM: number[]; 
  };
  resMin?: number;
  resMax?: number;
  density?: number;
}

const SolidAnomaly: React.FC<SolidAnomalyProps> = ({ 
  volumeData, 
  metadata, 
  resMin = 0, 
  resMax = 3,
  density = 0.85 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const texture = useMemo(() => {
    if (!volumeData) return null;
    try {
      const binaryString = window.atob(volumeData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const floatArray = new Float32Array(bytes.buffer);
  
      // ✅ Updated to use the correct dimensions from your server's metadata
      const tex = new THREE.Data3DTexture(floatArray, metadata.nx, metadata.ny, metadata.nz);
      tex.format = THREE.RedFormat;
      tex.type = THREE.FloatType;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.unpackAlignment = 1;
      tex.needsUpdate = true;
      return tex;
    } catch (e) { 
      console.error("🔥 Texture Creation Error:", e);
      return null; 
    }
  }, [volumeData, metadata.nx, metadata.ny, metadata.nz]); // ✅ Explicit dependencies

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uInverseModelMatrix: { value: new THREE.Matrix4() },
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
    uMaxLog: { value: 3 },
    uResMin: { value: resMin },
    uResMax: { value: resMax },
    uDensity: { value: density }
  }), [texture]);

  useFrame(() => {
    if (meshRef.current && matRef.current) {
      matRef.current.uniforms.uInverseModelMatrix.value.copy(meshRef.current.matrixWorld).invert();
      matRef.current.uniforms.uResMin.value = resMin;
      matRef.current.uniforms.uResMax.value = resMax;
      matRef.current.uniforms.uDensity.value = density;
    }
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef} scale={[metadata.sizeKM[0], metadata.sizeKM[1], metadata.sizeKM[2]]}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.FrontSide} 
        transparent={true}
           // Still checks if it's behind things (like stations)
     
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          void main() {
            vLocalPos = position + 0.5; 
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          precision highp sampler3D;
          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          uniform sampler3D uTexture;
          uniform mat4 uInverseModelMatrix;
          uniform vec3 uColors[8];
          uniform float uMinLog;
          uniform float uMaxLog;
          uniform float uResMin;
          uniform float uResMax;
          uniform float uDensity;

          void main() {
            vec3 worldRayDir = normalize(vWorldPos - cameraPosition);
            vec3 localRayDir = normalize((uInverseModelMatrix * vec4(worldRayDir, 0.0)).xyz);
            
            vec3 p = vLocalPos; 
            const int MAX_STEPS = 150; 
            float stepSize = 1.0 / float(MAX_STEPS);
            vec3 step = localRayDir * stepSize; 
            vec4 acc = vec4(0.0);

            for(int i = 0; i < MAX_STEPS; i++) {
              if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z < 0.0 || p.z > 1.0 || acc.a >= 0.95) break;

           // Flip the X coordinate (North-South) for the texture lookup
           //from this
           //   float val = texture(uTexture, p).r;
           vec3 samplingPos = vec3(1.0 - p.x, p.y, p.z);
          float val = texture(uTexture, samplingPos).r;

              if (val >= uResMin && val <= uResMax && val < 15.0) {
                float norm = clamp((val - uMinLog) / (uMaxLog - uMinLog), 0.0, 1.0);
                float scaledT = norm * 7.0;
                int idx = int(floor(scaledT));
                vec3 color = mix(uColors[clamp(idx, 0, 7)], uColors[clamp(idx + 1, 0, 7)], fract(scaledT));
                
                float stepAlpha = uDensity * stepSize * 15.0; 
                vec4 src = vec4(color * stepAlpha, stepAlpha);
                acc = acc + src * (1.0 - acc.a);
              }
              p += step;
            }

            if(acc.a < 0.01) discard;
            gl_FragColor = vec4(acc.rgb * 1.0, acc.a);
          }
        `}
      />
    </mesh>
  );
};

export default SolidAnomaly;
/*
precision highp float;
precision highp sampler3D;
varying vec3 vLocalPos;
varying vec3 vWorldPos;
uniform sampler3D uTexture;
uniform mat4 uInverseModelMatrix;
uniform vec3 uColors[8];
uniform float uMinLog;
uniform float uMaxLog;
uniform float uResMin;
uniform float uResMax;
uniform float uDensity;

void main() {
  vec3 worldRayDir = normalize(vWorldPos - cameraPosition);
  vec3 localRayDir = normalize((uInverseModelMatrix * vec4(worldRayDir, 0.0)).xyz);
  
  vec3 p = vLocalPos + localRayDir * 0.001; 
  
  const int MAX_STEPS = 120;
  vec3 step = localRayDir * (1.5 / float(MAX_STEPS)); 
  vec4 acc = vec4(0.0);

  for(int i = 0; i < MAX_STEPS; i++) {
    if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z < 0.0 || p.z > 1.0 || acc.a >= 0.98) break;

    float val = texture(uTexture, p).r;

    // --- 3D FILTERING LOGIC ---
    // If the value is outside our range, we don't add any color (transparent)
    if (val >= uResMin && val <= uResMax) {
      
      float norm = clamp((val - uMinLog) / (uMaxLog - uMinLog), 0.0, 1.0);
      float scaledT = norm * 7.0;
      int idx = int(floor(scaledT));
      vec3 color = mix(uColors[clamp(idx, 0, 7)], uColors[clamp(idx + 1, 0, 7)], fract(scaledT));
      
      // --- CONTRAST & DENSITY ---
      // We use a high alpha to make the anomaly look solid
      float alpha = uDensity; 
      
      vec4 src = vec4(color * alpha, alpha);
      acc = acc + src * (1.0 - acc.a);
    }
    
    p += step;
  }

  if(acc.a < 0.01) discard;
  gl_FragColor = vec4(acc.rgb * 1.2, acc.a);
}
*/