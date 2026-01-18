// server.js
const { parseRhoFile } = require('../parsers/model_parser');
const { parseDatFile, getStationBounds } = require('../parsers/data_parser');
const { shrinkModel } = require('./shrinkModel');
const { interpolateModel } = require('./interpolateModel');
const { parseEarthquakeClusters } = require('../parsers/earthquake_parser');
const utm = require('utm'); // ← ADD THIS

async function processModel(rhoPath, datPath,earthquake_cluster, bufferKM = 2) {
    // 1. Parse model
    const modelData = await parseRhoFile(rhoPath);
    console.log("✅ Model parsed");

    // 2. Parse stations and get center
    const { stations, center_easting, center_northing ,zoneNum ,zoneLetter} = await parseDatFile(datPath);
    console.log("stations",stations)
    console.log("center_easting",center_easting)
    console.log("center_northing",center_northing)
    
    const geoData = { 
        stations, 
        modelCenterUTM: { easting: center_easting, northing: center_northing, zoneNum,zoneLetter } 
      };

    // 3. Compute station bounds in UTM
    const bounds = getStationBounds(stations, bufferKM);
    console.log("✅ Station bounds computed");

    // 4. Get model center in UTM (from model lat/lon)
    const modelCenterUTM = geoData.modelCenterUTM;

    // 5. Convert stations to local offsets (meters from model center)
    const stationsLocal = stations.map(s => ({
        code: s.code,
        east_m: s.easting - modelCenterUTM.easting,   // East offset in meters
        north_m: s.northing - modelCenterUTM.northing, // North offset in meters
        z: s.z // elevation/depth
    }));
    //console.log("stationsLocal",stationsLocal)

    // 6. Shrink model to region of interest
    const { shrink, shrunkNorthCoords, shrunkEastCoords, shrunkDepthCoords } = 
        shrinkModel(geoData, modelData, bounds);

    // 7. Extract shrunk resistivity data
    const { i_start, i_end, j_start, j_end, k_end } = shrink;
    const nEastShrunk  = i_end - i_start + 1;
    const nNorthShrunk = j_end - j_start + 1;
    const nDepthShrunk = k_end + 1;

    const shrunkData = new Float32Array(nNorthShrunk * nEastShrunk * nDepthShrunk);
    let targetIdx = 0;
    for (let k = 0; k <= k_end; k++) {
        for (let i = i_start; i <= i_end; i++) {      // East
            for (let j = j_start; j <= j_end; j++) {  // North
                const srcIdx = k * (modelData.n_east * modelData.n_north) + i * modelData.n_north + j;
                shrunkData[targetIdx++] = modelData.log10Data[srcIdx];
            }
        }
    }

    // 8. Interpolate to uniform grid
    const targetRes = { northRes: 100, eastRes: 100, depthRes: 80 }; // ✅ Matches interpolateModel
    const uniformData = interpolateModel(
        nNorthShrunk,
        nEastShrunk,
        nDepthShrunk,
        shrunkNorthCoords,
        shrunkEastCoords,
        shrunkDepthCoords,
        shrunkData,
        targetRes
    );

    // 9. Convert depth coords to NEGATIVE
    const uniformZCoords = Array.from({ length: targetRes.tz }, (_, k) => {
        const frac = k / (targetRes.tz - 1);
        return - (frac * shrunkDepthCoords[shrunkDepthCoords.length - 1]);
    });

    // 10. Generate uniform coordinate arrays (km)
    const northCoords = Array.from({ length: targetRes.northRes }, (_, i) =>
        shrunkNorthCoords[0] + (i / (targetRes.northRes - 1)) * (shrunkNorthCoords.at(-1) - shrunkNorthCoords[0])
    );
   // console.log("targetRes",targetRes)
   // console.log("northCoords",northCoords)
    const eastCoords = Array.from({ length: targetRes.eastRes }, (_, j) =>
        shrunkEastCoords[0] + (j / (targetRes.eastRes - 1)) * (shrunkEastCoords.at(-1) - shrunkEastCoords[0])
    );

    // 10. Generate UTM coordinate arrays (meters, absolute)


// Convert local model coords → absolute UTM
const northCoordsUTM = northCoords.map(n => n + modelCenterUTM.northing); // north = northing
const eastCoordsUTM = eastCoords.map(e => e + modelCenterUTM.easting);   // east = easting
const depthCoordsUTM = uniformZCoords; // depth remains negative, in km → keep as is or convert

//11 add  earthquake clusters
const earthquakeClusters = await parseEarthquakeClusters(earthquake_cluster);

console.log("earthquakeclusters",JSON.stringify(earthquakeClusters,null, 2));

    // ✅ Return stations in local coordinates (origin = model center)
    return {
        uniformData,
        dimensions: { 
            n_north: targetRes.northRes, 
            n_east: targetRes.eastRes, 
            n_z: targetRes.depthRes 
        },
        // 🔹 ABSOLUTE UTM COORDINATES (meters)
        coordinates_utm: {
            north_utm_m: northCoordsUTM,    // northing (Y)
            east_utm_m: eastCoordsUTM,      // easting (X)
            depth_km: uniformZCoords        // keep in km (negative)
        },
        // 🔹 MODEL EXTENT IN UTM
        model_utm_extents: {
            east_min: Math.min(...eastCoordsUTM),
            east_max: Math.max(...eastCoordsUTM),
            north_min: Math.min(...northCoordsUTM),
            north_max: Math.max(...northCoordsUTM),
            depth_min: Math.min(...uniformZCoords) * 1000, // convert to meters if needed
            depth_max: Math.max(...uniformZCoords) * 1000
        },
        // 🔹 MODEL CENTER IN UTM
        model_center_utm: modelCenterUTM, // { easting, northing, zoneNum, zoneLetter }
        // 🔹 STATIONS IN ABSOLUTE UTM (meters)
        stations_utm: stations.map(s => ({
            code: s.code,
            easting: s.easting,       // absolute UTM
            northing: s.northing,     // absolute UTM
            depth_m: -s.z             // convert to negative depth in meters
        })),
        // Keep existing fields for backward compatibility (optional)
        bounds,
        sizeKM: [
            (shrunkEastCoords.at(-1) - shrunkEastCoords[0]) / 1000,
            (shrunkNorthCoords.at(-1) - shrunkNorthCoords[0]) / 1000,
            shrunkDepthCoords.at(-1) / 1000
        ],
        earthquakeClusters
    };
}

module.exports = { processModel };