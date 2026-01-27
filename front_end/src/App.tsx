import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Image } from '@react-three/drei';
import axios from 'axios';
//use on of those
//marching ray look like
//import SolidAnomaly from './Anomaly5';
//or this block view look like
import SolidAnomaly from './Anomaly6';

import HorizontalSlice from './HorizontalSlice2';
import VerticalNorthSlice from './VerticalNorthSlice';
import VerticalEastSlice from './VerticalEastSlice';
import AxesFrame from './AxesFrame';


interface Station {
  code: string;
  north_km: number; // Changed from plotX
  east_km: number;  // Changed from plotY
  z_km: number;     // Changed from plotZ (usually 0 for surface)
  elev:number | null;
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
  const [zDatumKM, setZDatumKM] = useState<number>(0);

  const [showHorizontal, setShowHorizontal] = useState(true);
  const [showNorth, setShowNorth] = useState(true);
  const [showEast, setShowEast] = useState(true);



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

      if (res.data.z_datuim) {
        setZDatumKM(res.data.z_datuim / 1000);
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




////////////////////////////
const takeScreenshot = () => {
  // Give Three.js time to finish rendering the current frame
  setTimeout(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'mt_model_screenshot.png';
    
    // Force a high-quality capture
    canvas.toBlob((blob) => {
      if (blob) {
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }, 'image/png', 1.0);
  }, 100); // Wait 100ms for render to complete
};



//////////////////////////




  return (
    <div style={{ width: '100vw', height: '100vh', background: '#dad8d8' }}>

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

    


{/* East-West Slice Control */}
<div style={{ width: '100%', marginBottom: '15px' }}>
  <label style={{ 
    fontSize: '14px', 
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px', 
    cursor: 'pointer',
    color: 'white'
  }}>
    {/* Visible, styled checkbox */}
    <div style={{
      width: '20px',
      height: '20px',
      border: showEast ? '2px solid #00ffff' : '2px solid #666',
      backgroundColor: showEast ? '#00ffff' : 'transparent',
      borderRadius: '4px',
      marginRight: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}>
      {showEast && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 6L4 9L11 2" stroke="black" strokeWidth="2" fill="none"/>
        </svg>
      )}
    </div>

    <span style={{ flex: 1 }}>
      East Slice (Y): <span style={{ color: '#00ffff', fontWeight: 'bold' }}>
        {(modelEastMin + eastSlice * actualEastSpan).toFixed(2)} km
      </span>
    </span>

    {/* Hidden native checkbox for accessibility & state */}
    <input
      type="checkbox"
      checked={showEast}
      onChange={() => setShowEast(!showEast)}
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-label="Toggle East Slice"
    />
  </label>

  {/* Slider */}
  <input 
    type="range" 
    min="0" 
    max="1" 
    step="0.001" 
    value={eastSlice} 
    disabled={!showEast}
    onChange={(e) => setEastSlice(parseFloat(e.target.value))} 
    style={{ 
      width: '100%', 
      cursor: showEast ? 'pointer' : 'not-allowed',
      opacity: showEast ? 1 : 0.3 
    }}
  />
</div>










    {/* North-South Slider */}

{/* North-South Slice Control */}
<div style={{ width: '100%', marginBottom: '15px' }}>
  <label style={{ 
    fontSize: '14px', 
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px', 
    cursor: 'pointer',
    color: 'white'
  }}>
    {/* Visible, styled checkbox */}
    <div style={{
      width: '20px',
      height: '20px',
      border: showNorth ? '2px solid #00ff00' : '2px solid #666',
      backgroundColor: showNorth ? '#00ff00' : 'transparent',
      borderRadius: '4px',
      marginRight: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}>
      {showNorth && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 6L4 9L11 2" stroke="black" strokeWidth="2" fill="none"/>
        </svg>
      )}
    </div>

    <span style={{ flex: 1 }}>
      North Slice (X): <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
        {(modelNorthMin + northSlice * actualNorthSpan).toFixed(2)} km
      </span>
    </span>

    {/* Hidden native checkbox for accessibility & state */}
    <input
      type="checkbox"
      checked={showNorth}
      onChange={() => setShowNorth(!showNorth)}
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-label="Toggle North Slice"
    />
  </label>

  {/* Slider */}
  <input 
    type="range" 
    min="0" 
    max="1" 
    step="0.001" 
    value={northSlice} 
    disabled={!showNorth}
    onChange={(e) => setNorthSlice(parseFloat(e.target.value))} 
    style={{ 
      width: '100%', 
      cursor: showNorth ? 'pointer' : 'not-allowed',
      opacity: showNorth ? 1 : 0.3 
    }}
  />
</div>



    {/* Horizontal/Depth Slider */}
   

{/* Horizontal (Depth) Slice Control */}
<div style={{ width: '100%', marginBottom: '15px' }}>
  <label style={{ 
    fontSize: '14px', 
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px', 
    cursor: 'pointer',
    color: 'white'
  }}>
    {/* Visible, styled checkbox */}
    <div style={{
      width: '20px',
      height: '20px',
      border: showHorizontal ? '2px solid #ffff00' : '2px solid #666',
      backgroundColor: showHorizontal ? '#ffff00' : 'transparent',
      borderRadius: '4px',
      marginRight: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}>
      {showHorizontal && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 6L4 9L11 2" stroke="black" strokeWidth="2" fill="none"/>
        </svg>
      )}
    </div>

    <span style={{ flex: 1 }}>
      Depth Slice (Z): <span style={{ color: '#ffff00', fontWeight: 'bold' }}>
        {(sliceDepth * (model?.spans_km?.depth ?? 0)).toFixed(1)} km
      </span>
    </span>

    {/* Hidden native checkbox for accessibility & state */}
    <input
      type="checkbox"
      checked={showHorizontal}
      onChange={() => setShowHorizontal(!showHorizontal)}
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-label="Toggle Depth Slice"
    />
  </label>

  {/* Slider */}
  <input 
    type="range" 
    min="0" 
    max="1" 
    step="0.01" 
    value={sliceDepth} 
    disabled={!showHorizontal}
    onChange={(e) => setSliceDepth(parseFloat(e.target.value))} 
    style={{ 
      width: '100%', 
      cursor: showHorizontal ? 'pointer' : 'not-allowed',
      opacity: showHorizontal ? 1 : 0.3 
    }}
  />
</div>






<button
  onClick={takeScreenshot}
  style={{
    background: '#444',
    color: 'white',
    border: '1px solid #666',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '10px',
    width: '100%'
  }}
>
  📸 Download High-Quality Screenshot
</button>





  </div>
)}































































     <Canvas 
      gl={{ preserveDrawingBuffer: true, antialias: true }}
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
          <AxesFrame 
      northCoords={model.coordinates_utm.north_utm_km}
      eastCoords={model.coordinates_utm.east_utm_km}
      depth={model.spans_km.depth}
    />

            {/* 1. The 3D Volume Model */}
            <group position={[centerNorth, centerEast, (sizeArray[2] / 2)-zDatumKM]}>
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
  const elev=(st as any).elev ?? z;


  return (
    <Billboard
      key={`station-${idx}`}
      position={[x, y, -elev]} // [East, North, Elevation]
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
{ showHorizontal && model?.dataBase64 && (
  <group position={[
    centerNorth, 
    centerEast, 
    // This physically moves the plane up and down
    sliceDepth * sizeArray[2] -zDatumKM
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
{showNorth && model?.dataBase64 && (

<group position={[
    // Use the derived nMin and actualNorthSpan
    nMin + (northSlice * actualNorthSpan), 
    centerEast, 
    sizeArray[2] / 2 -zDatumKM
]}>
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
 
</group>
 )}

{/*Vertical East-Weast Slice */}

{ showEast && model?.dataBase64 && (
<group position={[
    centerNorth, 
    modelEastMin + (eastSlice * actualEastSpan), 
    sizeArray[2] / 2 -zDatumKM
]}>
 
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
  

</group>
)}
      
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