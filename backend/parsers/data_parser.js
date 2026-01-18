// parsers/data_parser.js
const fs = require('fs-extra');
const utm = require('utm'); // for lat/lon → UTM

async function parseDatFile(datPath) {
    try {
        const datRaw = await fs.readFile(datPath, 'utf-8');
        const datLines = datRaw.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && !line.startsWith('>') && /^\d/.test(line));

        const stations = [];
        const processedCodes = new Set();

        for (const line of datLines) {
            const parts = line.split(/\s+/);
            const code = parts[1];
            if (processedCodes.has(code)) continue;

            const lat = parseFloat(parts[2]);
            const lon = parseFloat(parts[3]);
            const elevation = parseFloat(parts[6]); // usually elevation/depth

            if (!isNaN(lat) && !isNaN(lon)) {
                processedCodes.add(code);
                const utmCoord = utm.fromLatLon(lat, lon);
                stations.push({
                    code,
                    easting: utmCoord.easting,   // UTM Easting (meters)
                    northing: utmCoord.northing, // UTM Northing (meters)
                    lat,
                    lon,
                    z: elevation                 // elevation/depth (same unit as in .dat)
                });
            }
        }

        if (stations.length === 0) {
            throw new Error("No valid stations found in .dat file");
        }

        // Compute UTM center of stations (for model alignment in shrinkModel.js)
        const center_easting = stations.reduce((sum, s) => sum + s.easting, 0) / stations.length;
        const center_northing = stations.reduce((sum, s) => sum + s.northing, 0) / stations.length;
        const lats = stations.map(s => s.lat);
const lons = stations.map(s => s.lon);
const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
        const zoneInfo = utm.fromLatLon(centerLat, centerLon);

        return {
            stations,           // ← Array of { code, easting, northing, lat, lon, z }
            center_easting,     // ← UTM center (meters)
            center_northing,    // ← UTM center (meters)
            zoneNum: zoneInfo.zoneNum,      // ← UTM zone number
            zoneLetter: zoneInfo.zoneLetter, // ← UTM zone letter ('N' or 'S')
            lats: stations.map(s => s.lat),
            lons: stations.map(s => s.lon)
        };

    } catch (err) {
        console.error("❌ Error parsing .dat file:", err);
        throw err;
    }
}

// Keep getStationBounds for bbox computation
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

    const utmCoords = stations.map(s => {
        const raw = utm.fromLatLon(s.lat, s.lon);
        return {
            ...raw,
            zoneLetter: s.lat >= 0 ? 'N' : 'S'
        };
    });

    const eastings = utmCoords.map(u => u.easting);
    const northings = utmCoords.map(u => u.northing);

    const bufferMeters = bufferKM * 1000;
    const bbox_utm = {
        min_easting: Math.min(...eastings) - bufferMeters,
        max_easting: Math.max(...eastings) + bufferMeters,
        min_northing: Math.min(...northings) - bufferMeters,
        max_northing: Math.max(...northings) + bufferMeters,
        zoneNum: utmCoords[0].zoneNum,
        zoneLetter: utmCoords[0].zoneLetter
    };

    return {
        bbox_geo,
        bbox_utm,
        centerUTM: {
            easting: (bbox_utm.min_easting + bbox_utm.max_easting) / 2,
            northing: (bbox_utm.min_northing + bbox_utm.max_northing) / 2
        }
    };
}

module.exports = { parseDatFile, getStationBounds };