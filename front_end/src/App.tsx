import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Image } from '@react-three/drei';
import axios from 'axios';
//use on of those
//marching ray look like
//import SolidAnomaly from './Anomaly5';
//block view look like
import SolidAnomaly from './Anomaly6';

import HorizontalSlice from './HorizontalSlice2';
import VerticalNorthSlice from './VerticalNorthSlice';
import VerticalEastSlice from './VerticalEastSlice';


interface Station {
  code: string;
  north_km: number; // Changed from plotX
  east_km: number;  // Changed from plotY
  z_km: number;     // Changed from plotZ (usually 0 for surface)
}

interface ApiResponse {
  success: boolean;
  dataBase64: string;
  dimensions: {
    n_north: number; // Updated to match server.js
    n_east: number;  // Updated to match server.js
    n_z: number;     // Updated to match server.js
  };
  spans_km: {
    north: number;
    east: number;
    depth: number;
  };
  coordinates_utm: {
    north_utm_km: number[];
    east_utm_km: number[];
    depth_km: number[];
  };
  stations_utm: Station[];
  earthquakeClusters:  EarthquakeCluster[];
}
interface EarthquakeEvent {
  id: string;        // Event ID (e.g., "002_0264")
  clusterId: string; // The parent Cluster ID (e.g., "002")
  utm_east: number;
  utm_north: number;
  depth: number;
  magnitude: number;
  lat: number;
  lon: number;
}

interface EarthquakeCluster {
  id: string;         // Cluster ID (e.g., "002")
  events: EarthquakeEvent[];
  count: number;
  sourceFile: string;
}

function App() {
  const [model, setModel] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleClusters, setVisibleClusters] = useState<Record<string, boolean>>({});
  const [sliceDepth, setSliceDepth] = useState(0.5); // 0.5 is middle depth
  const [northSlice, setNorthSlice] = useState(0.5);//middle north
  const [eastSlice, setEastSlice] = useState(0.5); //middle east

  useEffect(() => {
    axios.get('http://localhost:5000/api/model-data')
      .then((res) => {
        console.log("🔍 App5 Received Data:", res.data);
        setModel(res.data);
        setLoading(false);




         // ✅ DEBUG: Check if stations are inside model bounds
      const data = res.data;
      if (data.success && data.stations_utm && data.coordinates_utm) {
        const { north_utm_km, east_utm_km } = data.coordinates_utm;
        const stations = data.stations_utm;

        const modelNorthMin = Math.min(...north_utm_km);
        const modelNorthMax = Math.max(...north_utm_km);
        const modelEastMin = Math.min(...east_utm_km);
        const modelEastMax = Math.max(...east_utm_km);

        console.log("📊 Model Bounds (km):");
        console.log("   North:", modelNorthMin.toFixed(2), "→", modelNorthMax.toFixed(2));
        console.log("   East: ", modelEastMin.toFixed(2), "→", modelEastMax.toFixed(2));

        console.log("📍 Stations vs Model Bounds:");
        stations.forEach((s: any, i: number) => {
          const inNorth = s.north_km >= modelNorthMin && s.north_km <= modelNorthMax;
          const inEast = s.east_km >= modelEastMin && s.east_km <= modelEastMax;
          const status = inNorth && inEast ? "✅ INSIDE" : "❌ OUTSIDE";
          
          console.log(
            `   [${i}] ${s.code}: N=${s.north_km.toFixed(2)}, E=${s.east_km.toFixed(2)} → ${status}`
          );
        });

        const insideCount = stations.filter((s: any) =>
          s.north_km >= modelNorthMin && s.north_km <= modelNorthMax &&
          s.east_km >= modelEastMin && s.east_km <= modelEastMax
        ).length;
  
        console.log(`✅ ${insideCount}/${stations.length} stations inside model bounds`);
      }

      if (model?.earthquakeClusters) {
        const initialVisibility: Record<string, boolean> = {};
        model.earthquakeClusters.forEach(c => {
          initialVisibility[c.id] = true;
        });
        setVisibleClusters(initialVisibility);
      }








      })
      .catch((err) => {
        console.error("Fetch error:", err.response?.data?.error || err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ color: 'white', background: '#111', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1>Processing 3D Model & Stations...</h1>
      </div>
    );
  }

  const nMin = model ? Math.min(...model.coordinates_utm.north_utm_km) : 0;
const nMax = model ? Math.max(...model.coordinates_utm.north_utm_km) : 0;
const eMin = model ? Math.min(...model.coordinates_utm.east_utm_km) : 0;
const eMax = model ? Math.max(...model.coordinates_utm.east_utm_km) : 0;
const modelNorthMin = model ? Math.min(...model.coordinates_utm.north_utm_km) : 0;
const modelNorthMax = model ? Math.max(...model.coordinates_utm.north_utm_km) : 0;
const actualNorthSpan = modelNorthMax - modelNorthMin;
const modelEastMin = model ? Math.min(...model.coordinates_utm.east_utm_km) : 0;
const modelEastMax = model ? Math.max(...model.coordinates_utm.east_utm_km) : 0;
const actualEastSpan = modelEastMax - modelEastMin;

const centerNorth = (nMin + nMax) / 2;
const centerEast = (eMin + eMax) / 2;

  // Define sizeArray: [Width (East), Height (North), Depth (Z)]
  const sizeArray = model 
    ? [model.spans_km.east, model.spans_km.north, model.spans_km.depth] 
    : [0, 0, 0];



 
 ///CLUSTERS VISIBILITY 

// Initialize all clusters as 'visible' when data is loaded


// Helper to toggle a single cluster
const toggleCluster = (id: string) => {
  setVisibleClusters(prev => ({ ...prev, [id]: !prev[id] }));
};   




  return (
    <div style={{ width: '100vw', height: '100vh', background: '#222' }}>

{/* 3. Earthquake Clusters */}
<div style={{ 
  position: 'absolute', top: 20, right: 20, zIndex: 100, 
  background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px',
  color: 'white', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #444' 
}}>
  <h4 style={{ margin: '0 0 10px 0' }}>Toggle Clusters</h4>
  {model?.earthquakeClusters.map((cluster, index) => {
    const hue = (index * 137.5) % 360;
    const color = `hsl(${hue}, 90%, 60%)`;
    
    return (
      <div key={cluster.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', cursor: 'pointer' }}
           onClick={() => toggleCluster(cluster.id)}>
        <input 
          type="checkbox" 
          checked={!!visibleClusters[cluster.id]} 
          readOnly 
          style={{ marginRight: '10px' }}
        />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, marginRight: '8px' }} />
        <span style={{ fontSize: '14px', opacity: visibleClusters[cluster.id] ? 1 : 0.5 }}>
          {cluster.id} ({cluster.count})
        </span>
      </div>
    );
  })}
</div>






{/* Unified Slicing Control Panel */}
{model && (
  <div style={{ 
    position: 'absolute', 
    top: 20, 
    left: 20, // Positioned top-left
    zIndex: 110, 
    background: 'rgba(0,0,0,0.85)', 
    padding: '15px', 
    borderRadius: '12px', 
    color: 'white', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px',
    border: '1px solid #444',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    width: '260px'
  }}>
    <h4 style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '12px', textTransform: 'uppercase' }}>Cross-Section Controls</h4>

    {/* East-West Slider */}
    <div style={{ width: '100%' }}>
      <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px' }}>
        East Slice: <span style={{ color: '#00ffff' }}>{(modelEastMin + eastSlice * actualEastSpan).toFixed(2)} km</span>
      </label>
      <input 
        type="range" min="0" max="1" step="0.001" 
        value={eastSlice} 
        onChange={(e) => setEastSlice(parseFloat(e.target.value))} 
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>

    {/* North-South Slider */}
    <div style={{ width: '100%' }}>
      <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px' }}>
        North Slice: <span style={{ color: '#00ff00' }}>{(modelNorthMin + northSlice * actualNorthSpan).toFixed(2)} km</span>
      </label>
      <input 
        type="range" min="0" max="1" step="0.001" 
        value={northSlice} 
        onChange={(e) => setNorthSlice(parseFloat(e.target.value))} 
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>

    {/* Horizontal/Depth Slider */}
    <div style={{ width: '100%' }}>
      <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px' }}>
        Depth Slice: <span style={{ color: '#ffff00' }}>{(sliceDepth * (model?.spans_km?.depth ?? 0)).toFixed(1)} km</span>
      </label>
      <input 
        type="range" min="0" max="1" step="0.01" 
        value={sliceDepth} 
        onChange={(e) => setSliceDepth(parseFloat(e.target.value))} 
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
  </div>
)}































































     <Canvas 
  camera={{ position: [centerNorth+ 30 , centerEast+ 30 ,  30], fov: 45, up: [0, 0, -1] }}
>
        <ambientLight intensity={0.2} />
       
        <OrbitControls 
        target={[centerNorth, centerEast, 0]} 
        makeDefault
      //  enableDamping={true}
  //dampingFactor={0.15}
        />

        {model && (
          <>
            {/* 1. The 3D Volume Model */}
            <group position={[centerNorth, centerEast, sizeArray[2] / 2]}>
              <SolidAnomaly 
                volumeData={model.dataBase64} 
                metadata={{
                  // Mapping new n_ keys to Anomaly5's expected nx, ny, nz
                  nx: model.dimensions.n_north, 
                  ny: model.dimensions.n_east, 
                  nz: model.dimensions.n_z,
                  sizeKM: sizeArray
                }} 
                resMin={2.5} 
                resMax={4} 
                density={0.8}
              />
            </group>

            {/* 2. The Station Markers */}
            {model.stations_utm?.map((st, idx) => {
  // Mapping based on your preference:
  // X = East (Horizontal)
  // Y = North (Vertical/Depth in 2D, Forward in 3D)
  // Z = Vertical Elevation (Up)
  
  const x = (st as any).north_km;
  const y = (st as any).east_km;
  const z = (st as any).z_km || 0.05; // 50m offset to stay above the model surface

  return (
    <Billboard
      key={`station-${idx}`}
      position={[x, y, z]} // [East, North, Elevation]
    >
      {/* Fallback Marker: A bright red sphere in case the image is missing */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>

      <Image 
        url="/pin1.png" 
        transparent 
        scale={[0.8, 0.8]} 
        position={[0, 0.4, 0]} 
      />

      <Text
        position={[0, 0.9, 0]}
        fontSize={0.8}
        color="yellow"
        anchorX="center"
        outlineWidth={0.03}
        outlineColor="black"
      >
        {st.code}
      </Text>
    </Billboard>
  );
})}
          </>
        )}




         {/* 3. Render the actual 3D Cluster Spheres here inside the Canvas */}
         {model?.earthquakeClusters?.map((cluster, index) => {
            if (!visibleClusters[cluster.id]) return null;
            const clusterColor = `hsl(${(index * 137.5) % 360}, 90%, 60%)`;

            return (
              <group key={`spheres-${cluster.id}`}>
                {cluster.events.map((event) => (
                  <mesh key={event.id} position={[event.utm_north / 1000, event.utm_east / 1000, event.depth]}>
                    <sphereGeometry args={[event.magnitude * 0.15, 16, 16]} />
                    <meshStandardMaterial color={clusterColor} emissive={clusterColor} emissiveIntensity={0.5} />
                  </mesh>
                ))}
              </group>
            );
          })}


{/* 4. Horizontal Slice */}
{model?.dataBase64 && (
  <group position={[
    centerNorth, 
    centerEast, 
    // This physically moves the plane up and down
    sliceDepth * sizeArray[2] 
  ]}>
    <HorizontalSlice 
      volumeData={model.dataBase64}
      metadata={{
        nx: model.dimensions.n_north,
        ny: model.dimensions.n_east,
        nz: model.dimensions.n_z,
        sizeKM: sizeArray
      }}
      zSlice={sliceDepth}
    />
  </group>
)}
{/*Vertival North South Slice */}
{/* Vertical North-South Slice */}
<group position={[
    // Use the derived nMin and actualNorthSpan
    nMin + (northSlice * actualNorthSpan), 
    centerEast, 
    sizeArray[2] / 2 
]}>
  {model?.dataBase64 && (
    <VerticalNorthSlice 
      volumeData={model.dataBase64}
      metadata={{
        nx: model.dimensions.n_north,
        ny: model.dimensions.n_east,
        nz: model.dimensions.n_z,
        sizeKM: sizeArray
      }}
      nSlice={northSlice}
    />
  )}
</group>

{/*Vertical East-Weast Slice */}


<group position={[
    centerNorth, 
    modelEastMin + (eastSlice * actualEastSpan), 
    sizeArray[2] / 2 
]}>
  {model?.dataBase64 && (
    <VerticalEastSlice 
      volumeData={model.dataBase64}
      metadata={{
        nx: model.dimensions.n_north,
        ny: model.dimensions.n_east,
        nz: model.dimensions.n_z,
        sizeKM: sizeArray
      }}
      eSlice={eastSlice}
    />
  )}
</group>

      
      </Canvas>
    </div>
  );
}

export default App;

/*

  <gridHelper 
          args={[100, 50, 0x888888, 0x444444]} 
          position={[centerNorth, centerEast, 0]}
          rotation={[Math.PI / 2, 0, 0]} 
        />
*/