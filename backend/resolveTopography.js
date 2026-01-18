const path = require('path');
const fs = require('fs-extra');

// Helper to calculate the Calibration Constant C from real data
async function getCalibrationConstant(ediDir, targetCode, zRelFromDat) {
    const ediPath = path.join(ediDir, `${targetCode}.edi`);
    if (!(await fs.pathExists(ediPath))) {
        throw new Error(`Calibration EDI file not found at: ${ediPath}`);
    }

    const content = await fs.readFile(ediPath, 'utf-8');
    // Extract ELEV=...
    const elevMatch = content.match(/ELEV\s*=\s*([\d\.-]+)/i);
    if (!elevMatch) throw new Error(`ELEV tag not found in ${ediPath}`);

    const elev = parseFloat(elevMatch[1]);
    // C = Elev + Z_rel (Real Data: 863 + -238 = 625)
    return elev + zRelFromDat;
}
module.exports = { getCalibrationConstant };