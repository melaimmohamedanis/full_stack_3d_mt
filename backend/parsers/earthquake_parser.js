// parsers/earthquake_parser.js
const fs = require('fs-extra');
const path = require('path');
const utm = require('utm');

async function parseEarthquakeClusters(folderPath) {
  try {
    
      console.log(`\n🔍 Parsing earthquake clusters from: ${folderPath}`);
      
      // Get all files (no extension filtering)
      const allEntries = await fs.readdir(folderPath);
      const files = [];
      for (const entry of allEntries) {
        const fullPath = path.join(folderPath, entry);
        const stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) {
          files.push(entry);
        }
      }
      files.sort(); // Ensure consistent order
  
      console.log(`📁 Found ${files.length} cluster files:`, files);

    // Process each file as ONE cluster
    const clusters = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) continue;

      // Extract cluster ID from filename (remove extension)
      const clusterId = path.basename(file, path.extname(file)).padStart(3, '0');
      
      // Read and parse events
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Keep lines that look like event data (start with numbers)
          return line && /^\d/.test(line) && !line.toLowerCase().includes('centroid');
        });

      const events = [];
      for (const line of lines) {
        const parts = line.split(/\s+/).filter(p => p !== '');
        if (parts.length < 13) continue;

        const eventId = parts[1] || `evt${events.length + 1}`;
        const lat = parseFloat(parts[8]);
        const lon = parseFloat(parts[9]);
        const depth = parseFloat(parts[10]);
        const magnitude = parseFloat(parts[12]);

        if (isNaN(lat) || isNaN(lon) || isNaN(depth) || isNaN(magnitude)) continue;

        const utmCoord = utm.fromLatLon(lat, lon);
        events.push({
          id: `${clusterId}_${eventId}`,
          clusterId,
          utm_east: utmCoord.easting,
          utm_north: utmCoord.northing,
          depth: depth, // Negative for downward
          magnitude,
          lat,
          lon
        });
      }

      if (events.length > 0) {
        clusters.push({
          id: clusterId,
          events,
          count: events.length,
          sourceFile: file
        });
      }
    }

    // Sort clusters by ID
    clusters.sort((a, b) => a.id.localeCompare(b.id));

    // 🔍 Debug output
    console.log(`\n✅ Successfully parsed ${clusters.length} clusters:`);
    clusters.forEach((cluster, idx) => {
      console.log(`  ${idx + 1}. Cluster ${cluster.id} → ${cluster.count} events (from ${cluster.sourceFile})`);
    });

    return clusters;

  } catch (err) {
    console.error("💥 Earthquake parser error:", err);
    throw err;
  }
}

module.exports = { parseEarthquakeClusters };
