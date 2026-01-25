// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { processModel } = require('./processing/processModel');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// --- CONFIGURATION ---
const DEFAULT_RHO_PATH = 'C:/Users/moham/Music/mtest20a/Modular_NLCG_079.rho';
const DEFAULT_DAT_PATH = 'C:/Users/moham/Music/mtest20a/data.dat';
const DEFAULT_ERTHQUAKE_FOLDER='C:/Users/moham/Music/mtest20a/BI_Multiplet_clusters'
const Z_Datuim=1149;
//extract real elevation
const edi_file_path='C:/edi/bi_edi/all/bi100.edi'


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Geophysics backend is running' });
});

// API: Process model and stations → return 3D resistivity
app.get('/api/model-data', async (req, res) => {
  try {
    const rhoPath = req.query.rho || DEFAULT_RHO_PATH;
    const datPath = req.query.dat || DEFAULT_DAT_PATH;
    const earthquake_cluster = req.query.txt || DEFAULT_ERTHQUAKE_FOLDER;

    console.log(`🔄 Reading files:\n RHO: ${rhoPath}\n DAT: ${datPath}`);

    if (!fs.existsSync(rhoPath) || !fs.existsSync(datPath)) {
      return res.status(404).json({ 
        error: 'Files not found. Check DEFAULT_RHO_PATH / DEFAULT_DAT_PATH in server.js'
      });
    }

    console.log('🔄 Starting model processing...');
    const result = await processModel(rhoPath, datPath,edi_file_path,earthquake_cluster, 2.0); // bufferKM = 2 km

    // Convert Float32Array → base64
    const dataBuffer = Buffer.from(result.uniformData.buffer);
    const dataBase64 = dataBuffer.toString('base64');

    // ✅ DEBUG: Log points and dimensions
    console.log(`✅ Processed ${result.uniformData.length} points.`);
    console.log(`📊 Dimensions: n_north=${result.dimensions.n_north}, n_east=${result.dimensions.n_east}, n_z=${result.dimensions.n_z}`);



// ✅ DEBUG: Log coordinate arrays
//console.log("📤 Sending coordinates to frontend:");
//console.log("   North coords (km):", 
//  result.northCoords.slice(0, 3).map(v => (v/1000).toFixed(2)), 
 // "...", 
 // result.northCoords.slice(-3).map(v => (v/1000).toFixed(2))
//);

//console.log("   East coords (km):", 
 // result.eastCoords.slice(0, 3).map(v => (v/1000).toFixed(2)), 
 // "...", 
//  result.eastCoords.slice(-3).map(v => (v/1000).toFixed(2))
//);
//console.log("   Station sample (km):", result.stationsLocal.slice(0, 2));



    // Send geophysically consistent response
    res.json({
      success: true,
      dimensions: {
        n_north: result.dimensions.n_north,  // ← changed
        n_east: result.dimensions.n_east,    // ← changed
        n_z: result.dimensions.n_z           // ← changed
      },
      // Coordinate spans (km)
      spans_km: {
        north: result.sizeKM[0],
        east: result.sizeKM[1],
        depth: result.sizeKM[2]
      },
      dataBase64: dataBase64,
    
      // ✅ NEW: Absolute UTM data
      coordinates_utm: {
        north_utm_km: result.coordinates_utm.north_utm_m.map(v => v / 1000),
        east_utm_km: result.coordinates_utm.east_utm_m.map(v => v / 1000),
        depth_km: result.coordinates_utm.depth_km
      },
      model_utm_extents: result.model_utm_extents,
      model_center_utm: result.model_center_utm,
      stations_utm: result.stations_utm.map(s => ({
        code: s.code,
        north_km: s.northing / 1000,
        east_km: s.easting / 1000,
        depth_km: s.depth_m / 1000
      })),
      earthquakeClusters:result.earthquakeClusters,
      z_datuim:Z_Datuim

    
      // Keep old fields if needed (optional)
      // coordinates: { ... },
      // stations_km: [ ... ]
    });

  } catch (err) {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: err.message || 'Model processing failed' });
  }
});



app.listen(PORT, () => {
  console.log(`🌍 Geophysics backend running on http://localhost:${PORT}`);
});

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => {
    console.log(`🌍 Geophysics backend running on http://localhost:${PORT}`);
    console.log(`📈 Access model at http://localhost:${PORT}/api/model-data`);
});