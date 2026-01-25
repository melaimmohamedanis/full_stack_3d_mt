import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SolidAnomalyProps {
  volumeData: string; 
  metadata: {
    nx: number;
    ny: number;
    nz: number;
    sizeKM: number[]; 
  };
  resMin?: number;
  resMax?: number;
  density?: number;
  sliceState?: {
    north: number;
    east: number;
    depth: number;
    enabled: boolean;
  };
}

const SolidAnomaly: React.FC<SolidAnomalyProps> = ({ 
  volumeData, 
  metadata, 
  resMin = 0, 
  resMax = 3,
  density = 0.85,
  sliceState = { north: 0.5, east: 0.5, depth: 0.5, enabled: false }
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
  
      // Use NearestFilter to get the hard "Block/Voxel" look
      const tex = new THREE.Data3DTexture(floatArray, metadata.nx, metadata.ny, metadata.nz);
      tex.format = THREE.RedFormat;
      tex.type = THREE.FloatType;
      tex.minFilter = THREE.NearestFilter; // KEY CHANGE: Makes it blocky
      tex.magFilter = THREE.NearestFilter; // KEY CHANGE: Makes it blocky
      tex.unpackAlignment = 1;
      tex.needsUpdate = true;
      return tex;
    } catch (e) { 
      console.error("🔥 Texture Creation Error:", e);
      return null; 
    }
  }, [volumeData, metadata.nx, metadata.ny, metadata.nz]);

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uInverseModelMatrix: { value: new THREE.Matrix4() },
    uColors: { value: [
      new THREE.Color('#8b0000'), new THREE.Color('#ff0000'), 
      new THREE.Color('#ffa500'), new THREE.Color('#ffff00'), 
      new THREE.Color('#00ff00'), new THREE.Color('#00ffff'), 
      new THREE.Color('#0000ff'), new THREE.Color('#6217a8')
    ]},
    uMinLog: { value: 0 },
    uMaxLog: { value: 3 },
    uResMin: { value: resMin },
    uResMax: { value: resMax },
    uDensity: { value: density },
    // New Uniforms for Slicing
    uSlicePos: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    uSliceEnabled: { value: 0 }, // 1 = true, 0 = false
    uGridSize: { value: new THREE.Vector3(metadata.nx, metadata.ny, metadata.nz) } // For voxel snapping
  }), [texture, metadata.nx, metadata.ny, metadata.nz]);

  useFrame(() => {
    if (meshRef.current && matRef.current) {
      matRef.current.uniforms.uInverseModelMatrix.value.copy(meshRef.current.matrixWorld).invert();
      matRef.current.uniforms.uResMin.value = resMin;
      matRef.current.uniforms.uResMax.value = resMax;
      matRef.current.uniforms.uDensity.value = density;
      
      // Update Slice Uniforms
      matRef.current.uniforms.uSlicePos.value.set(
        sliceState.north, 
        sliceState.east, 
        sliceState.depth
      );
      matRef.current.uniforms.uSliceEnabled.value = sliceState.enabled ? 1.0 : 0.0;
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
          
          // Slice Uniforms
          uniform vec3 uSlicePos;     // x=North, y=East, z=Depth (0.0 to 1.0)
          uniform float uSliceEnabled;
          uniform vec3 uGridSize;     // Dimensions for voxel snapping

          void main() {
            vec3 worldRayDir = normalize(vWorldPos - cameraPosition);
            vec3 localRayDir = normalize((uInverseModelMatrix * vec4(worldRayDir, 0.0)).xyz);
            
            vec3 p = vLocalPos; 
            const int MAX_STEPS = 200; 
            float stepSize = 1.0 / float(MAX_STEPS);
            vec3 step = localRayDir * stepSize; 
            vec4 acc = vec4(0.0);

            // Slice Thickness (in normalized UV space 0-1)
            // Making it thicker makes the "blocks" look deeper
            float thickness = 0.02; 

            for(int i = 0; i < MAX_STEPS; i++) {
              // Boundary Check
              if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z < 0.0 || p.z > 1.0 || acc.a >= 0.95) break;

              // --- LOGIC: SLICE MASKING ---
              // Only draw if we are near one of the slice planes
             //the north-south somehow !!!! flipped so we use 1.0 - p.x instead of  p.x 
             vec3 flippedP = vec3(1.0 - p.x, p.y, p.z);
              bool nearNorth = abs(flippedP.x - uSlicePos.x) < thickness;
              bool nearEast  = abs(p.y - uSlicePos.y) < thickness;
              bool nearDepth = abs(p.z - uSlicePos.z) < thickness;

              // If Slicing is enabled, skip empty space instantly
              if (uSliceEnabled > 0.5) {
                if (!nearNorth && !nearEast && !nearDepth) {
                  p += step;
                  continue; 
                }
              }

              // --- LOGIC: VOXEL SNAPPING ---
              // Snap exact position 'p' to grid coordinates to get that blocky 8-bit look
              vec3 voxelCoord = floor(flippedP * uGridSize) / uGridSize;

              // Sample texture at voxel center
              float val = texture(uTexture, voxelCoord).r;

              if (val >= uResMin && val <= uResMax && val < 15.0) {
                float norm = clamp((val - uMinLog) / (uMaxLog - uMinLog), 0.0, 1.0);
                float scaledT = norm * 7.0;
                int idx = int(floor(scaledT));
                vec3 color = mix(uColors[clamp(idx, 0, 7)], uColors[clamp(idx + 1, 0, 7)], fract(scaledT));
                
                // Increase alpha on slices to make them look solid
                float alphaMult = (uSliceEnabled > 0.5) ? 5.0 : 1.0; 
                float stepAlpha = uDensity * stepSize * 15.0 * alphaMult; 
                
                vec4 src = vec4(color * stepAlpha, stepAlpha);
                acc = acc + src * (1.0 - acc.a);
              }
              p += step;
            }

            if(acc.a < 0.01) discard;
            gl_FragColor = vec4(acc.rgb, acc.a);
          }
        `}
      />
    </mesh>
  );
};

export default SolidAnomaly;