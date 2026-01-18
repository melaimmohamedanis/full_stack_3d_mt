// parsers/model_parser.js
const fs = require('fs-extra');

async function parseRhoFile(rhoPath) {
    const rhoRaw = await fs.readFile(rhoPath, 'utf-8');
    const nonCommentLines = rhoRaw.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

    // 🧭 Dimensions: north, east, depth
    const n_north = parseInt(nonCommentLines[0].split(/\s+/)[0]);
    const n_east = parseInt(nonCommentLines[0].split(/\s+/)[1]);
    const n_depth = parseInt(nonCommentLines[0].split(/\s+/)[2]);

    // 📏 Cell widths
    const north_widths = nonCommentLines[1].split(/\s+/).filter(x => x).map(Number);
    const east_widths = nonCommentLines[2].split(/\s+/).filter(x => x).map(Number);
    const depth_widths = nonCommentLines[3].split(/\s+/).filter(x => x).map(Number);

    // --- COORDINATE CENTERING LOGIC ---
    const getCenteredCoords = (widths) => {
        const midIndex = Math.floor(widths.length / 2);
        let coords = new Array(widths.length);
        coords[midIndex] = 0;

        // Positive direction (North/East)
        for (let i = midIndex + 1; i < widths.length; i++) {
            coords[i] = coords[i - 1] + widths[i];
        }

        // Negative direction (South/West)
        for (let i = midIndex - 1; i >= 0; i--) {
            coords[i] = coords[i + 1] - widths[i];
        }
        return coords;
    };

    const north_coords = getCenteredCoords(north_widths);
    const east_coords = getCenteredCoords(east_widths);

    // 📏 Total spans
    const total_north_span = Math.abs(north_coords[north_coords.length - 1] - north_coords[0]);
    const total_east_span = Math.abs(east_coords[east_coords.length - 1] - east_coords[0]);

    // --- DEPTH COORDINATES (positive down) ---
    let depth_coords = new Array(n_depth);
    let currentDepth = 0;
    for (let i = 0; i < n_depth; i++) {
        currentDepth += Math.abs(depth_widths[i]);
        depth_coords[i] = currentDepth;
    }
    const total_depth = currentDepth;

    // --- RESISTIVITY DATA PARSING ---
    const resVals = [];
    for (let k = 4; k < nonCommentLines.length; k++) {
        const line = nonCommentLines[k].trim();
        if (!line) continue;
        const parts = line.split(/\s+/).map(Number);
        for (let p = 0; p < parts.length; p++) {
            if (!isNaN(parts[p])) {
                resVals.push(parts[p]);
            }
        }
    }

    // --- DATA INTEGRITY CHECK ---
    const expected = n_north * n_east * n_depth;
    if (resVals.length < expected) {
        console.warn(`⚠️ Warning: Data mismatch. Expected ${expected}, but found ${resVals.length}. Padding with valid values.`);
    }

    const rawResistivityData = new Float32Array(expected);
    for (let i = 0; i < expected; i++) {
        rawResistivityData[i] = (i < resVals.length && isFinite(resVals[i])) ? resVals[i] : 0;
    }

    // --- CONVERT TO LOG10(RESISTIVITY) ---
    const log10Data = new Float32Array(expected);
    for (let j = 0; j < expected; j++) {
        const rawLogE = resVals[j] ?? 0;
        const linearVal = Math.exp(rawLogE);
        const safeLinear = linearVal > 0 && isFinite(linearVal) ? linearVal : 1.0;
        log10Data[j] = Math.log10(safeLinear);
    }

    console.log("----------------------------------------");
    console.log(`📐 Grid: ${n_north} (North) × ${n_east} (East) × ${n_depth} (Depth)`);
    console.log(`📏 Spans: ${ (total_north_span/1000).toFixed(2) } km (N) × ${ (total_east_span/1000).toFixed(2) } km (E) × ${ (total_depth/1000).toFixed(2) } km (D)`);
    console.log("----------------------------------------");

    return { 
        // Dimensions
        n_north,
        n_east,
        n_depth,

        // Spans (meters)
        total_north_span,
        total_east_span,
        total_depth,

        // Cell widths
        north_widths,
        east_widths,
        depth_widths,

        // Coordinate arrays (meters, origin at center)
        north_coords,
        east_coords,
        depth_coords,

        // Resistivity data
        rawResistivityData,
        log10Data
    };
}

module.exports = { parseRhoFile };