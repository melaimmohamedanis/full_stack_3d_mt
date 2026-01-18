/*const utm = require('utm');
const result = utm.fromLatLon(35.852222, 3.916389);
console.log(result);*/


// test_utm.js

const utm = require('utm');

// === YOUR ORIGINAL FUNCTION (with fix applied) ===
function getStationBounds(stations, bufferKM = 0) {
  if (!stations || stations.length === 0) throw new Error("No stations provided");

  const lats = stations.map(s => s.lat);
  const lons = stations.map(s => s.lon);
  
  const bbox_geo = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons)
  };

  // 🔧 FIX: Correct zoneLetter based on latitude
  const utmCoords = stations.map(s => {
    const raw = utm.fromLatLon(s.lat, s.lon);
    return {
      ...raw,
      zoneLetter: s.lat >= 0 ? 'N' : 'S' // ✅ CORRECT HEMISPHERE
    };
  });

  const eastings = utmCoords.map(u => u.easting);
  const northings = utmCoords.map(u => u.northing);

  const bufferMeters = bufferKM * 1000;
  const bbox_utm = {
    minX: Math.min(...eastings) - bufferMeters,
    maxX: Math.max(...eastings) + bufferMeters,
    minY: Math.min(...northings) - bufferMeters,
    maxY: Math.max(...northings) + bufferMeters,
    zoneNum: utmCoords[0].zoneNum,
    zoneLetter: utmCoords[0].zoneLetter
  };

  return {
    bbox_geo,
    bbox_utm,
    centerUTM: { 
      x: (bbox_utm.minX + bbox_utm.maxX) / 2, 
      y: (bbox_utm.minY + bbox_utm.maxY) / 2 
    },
    utmCoords // for debugging
  };
}

// === TEST STATIONS (matching your GEO BBOX) ===
const stations = [
  { code: 'S1', lat: 35.852222, lon: 3.916389 }, // SW corner
  { code: 'S2', lat: 35.852222, lon: 4.288333 }, // SE corner
  { code: 'S3', lat: 36.043333, lon: 3.916389 }, // NW corner
  { code: 'S4', lat: 36.043333, lon: 4.288333 }  // NE corner
];

console.log("📍 Test Stations (Lat/Lon):");
stations.forEach(s => {
  console.log(`  ${s.code}: ${s.lat.toFixed(6)}, ${s.lon.toFixed(6)}`);
});

console.log("\n" + "=".repeat(60) + "\n");

// === RUN YOUR FUNCTION ===
const result = getStationBounds(stations, 0); // no buffer

console.log("🌍 GEO BBOX (from stations):");
console.log(result.bbox_geo);

console.log("\n🗺️  UTM BBOX (CORRECTED with zoneLetter fix):");
console.log(result.bbox_utm);

console.log("\n🔍 Individual Station UTM (after fix):");
result.utmCoords.forEach((u, i) => {
  console.log(`  ${stations[i].code}: E=${u.easting.toFixed(2)}, N=${u.northing.toFixed(2)}, Zone=${u.zoneNum}${u.zoneLetter}`);
});

console.log("\n" + "=".repeat(60) + "\n");

// === VERIFY KEY POINT (SW corner) ===
const sw = result.utmCoords[0]; // S1 = SW
console.log("✅ Verification for SW station (35.852222, 3.916389):");
console.log(`  Your result:    E=${sw.easting.toFixed(2)}, N=${sw.northing.toFixed(2)}, Zone=${sw.zoneNum}${sw.zoneLetter}`);
console.log(`  Expected (epsg.io): E=582746.89, N=3967945.51, Zone=31N`);

if (Math.abs(sw.easting - 582746.89) < 1 && Math.abs(sw.northing - 3967945.51) < 1 && sw.zoneLetter === 'N') {
  console.log("\n🎉 SUCCESS: UTM conversion is now CORRECT!");
} else {
  console.log("\n❌ FAILURE: Still incorrect.");
}