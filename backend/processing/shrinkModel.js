// processing/shrinkModel.js
const utm = require('utm');

function shrinkModel(geoData, modelData, bounds) {
    console.log("\n🔍 === SHRINK MODEL DEBUG START ===");

    // 1. Get model center in UTM
    const modelCenterUTM = geoData.modelCenterUTM;
    console.log(`📍 modelCenterUTM : ${modelCenterUTM }`);
 
    // 2. Transform local model coords to UTM
    const globalEasting = modelData.east_coords.map(east => east + modelCenterUTM.easting);
    const globalNorthing = modelData.north_coords.map(north => north + modelCenterUTM.northing);

    // 3. Log model extent (local and UTM)
    const localEastMin = Math.min(...modelData.east_coords);
    const localEastMax = Math.max(...modelData.east_coords);
    const localNorthMin = Math.min(...modelData.north_coords);
    const localNorthMax = Math.max(...modelData.north_coords);
    
    const utmEastMin = Math.min(...globalEasting);
    const utmEastMax = Math.max(...globalEasting);
    const utmNorthMin = Math.min(...globalNorthing);
    const utmNorthMax = Math.max(...globalNorthing);

    console.log(`📏 Model Extent (Local m):`);
    console.log(`   East: ${localEastMin.toFixed(1)} → ${localEastMax.toFixed(1)} (span: ${(localEastMax - localEastMin)/1000} km)`);
    console.log(`   North: ${localNorthMin.toFixed(1)} → ${localNorthMax.toFixed(1)} (span: ${(localNorthMax - localNorthMin)/1000} km)`);

    console.log(`🌍 Model Extent (UTM m):`);
    console.log(`   East: ${utmEastMin.toFixed(1)} → ${utmEastMax.toFixed(1)}`);
    console.log(`   North: ${utmNorthMin.toFixed(1)} → ${utmNorthMax.toFixed(1)}`);

    // 4. Log station bounds
    console.log(`🎯 Station Bounds (UTM m, buffer: ${bounds.bufferKM || 0} km):`);
    console.log(`   East: ${bounds.bbox_utm.min_easting.toFixed(1)} → ${bounds.bbox_utm.max_easting.toFixed(1)}`);
    console.log(`   North: ${bounds.bbox_utm.min_northing.toFixed(1)} → ${bounds.bbox_utm.max_northing.toFixed(1)}`);

    // 5. Compute overlap
    const eastOverlap = !(utmEastMax < bounds.bbox_utm.min_easting || utmEastMin > bounds.bbox_utm.max_easting);
    const northOverlap = !(utmNorthMax < bounds.bbox_utm.min_northing || utmNorthMin > bounds.bbox_utm.max_northing);
    
    console.log(`🔗 Overlap Check:`);
    console.log(`   East Overlap: ${eastOverlap ? 'YES' : 'NO'}`);
    console.log(`   North Overlap: ${northOverlap ? 'YES' : 'NO'}`);

    // 6. Find indices
    const i_east = globalEasting
        .map((easting, i) => (easting >= bounds.bbox_utm.min_easting && easting <= bounds.bbox_utm.max_easting ? i : -1))
        .filter(i => i !== -1);

    const j_north = globalNorthing
        .map((northing, j) => (northing >= bounds.bbox_utm.min_northing && northing <= bounds.bbox_utm.max_northing ? j : -1))
        .filter(j => j !== -1);

    const k_depth = modelData.depth_coords
        .map((z, k) => (z <= 50000 ? k : -1))
        .filter(k => k !== -1);

    console.log(`📊 Index Counts:`);
    console.log(`   East indices: ${i_east.length}`);
    console.log(`   North indices: ${j_north.length}`);
    console.log(`   Depth indices: ${k_depth.length}`);

    // 7. Error handling with details
    if (i_east.length === 0 || j_north.length === 0) {
        console.log(`\n❌ ERROR: No overlap between model and station bounds!`);
        if (i_east.length === 0) {
            console.log(`   💡 East issue: Model [${utmEastMin}, ${utmEastMax}] vs Stations [${bounds.bbox_utm.min_easting}, ${bounds.bbox_utm.max_easting}]`);
        }
        if (j_north.length === 0) {
            console.log(`   💡 North issue: Model [${utmNorthMin}, ${utmNorthMax}] vs Stations [${bounds.bbox_utm.min_northing}, ${bounds.bbox_utm.max_northing}]`);
        }
        console.log("🔍 === SHRINK MODEL DEBUG END ===\n");
        throw new Error("No model points within station bounds - check coordinate alignment");
    }

    // 8. Compute shrink region
    const shrink = {
        i_start: Math.min(...i_east),
        i_end: Math.max(...i_east),
        j_start: Math.min(...j_north),
        j_end: Math.max(...j_north),
        k_end: Math.max(...k_depth)
    };

    // 9. Log shrunk region
    const shrunkEastMin = modelData.east_coords[shrink.i_start];
    const shrunkEastMax = modelData.east_coords[shrink.i_end];
    const shrunkNorthMin = modelData.north_coords[shrink.j_start];
    const shrunkNorthMax = modelData.north_coords[shrink.j_end];

    console.log(`✂️ Shrunk Region (Local m):`);
    console.log(`   East: ${shrunkEastMin.toFixed(1)} → ${shrunkEastMax.toFixed(1)}`);
    console.log(`   North: ${shrunkNorthMin.toFixed(1)} → ${shrunkNorthMax.toFixed(1)}`);

    // 10. Extract coordinates
    const shrunkNorthCoords = modelData.north_coords.slice(shrink.j_start, shrink.j_end + 1);
    const shrunkEastCoords = modelData.east_coords.slice(shrink.i_start, shrink.i_end + 1);
    const shrunkDepthCoords = modelData.depth_coords.slice(0, shrink.k_end + 1);

    console.log("✅ Shrink successful!");
    console.log("🔍 === SHRINK MODEL DEBUG END ===\n");

    return { shrink, shrunkNorthCoords, shrunkEastCoords, shrunkDepthCoords };
}

module.exports = { shrinkModel };