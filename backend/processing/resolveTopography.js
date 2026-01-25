const path = require('path');
const fs = require('fs-extra');

async function getEdiMetadata(ediPath) {
    if (!(await fs.pathExists(ediPath))) {
        throw new Error(`EDI file not found at: ${ediPath}`);
    }

    const content = await fs.readFile(ediPath, 'utf-8');
    const ediFileName = path.basename(ediPath, '.edi');

    // Extract DATAID (e.g., >DATAID  bi100)
    const dataIdMatch = content.match(/DATAID\s*[=:]?\s*(\S+)/i);
    const dataId = dataIdMatch ? dataIdMatch[1].replace(/['"]/g, '').trim() : null;

    // Extract ELEV (e.g., ELEV=863.0)
    const elevMatch = content.match(/ELEV\s*=\s*([\d\.-]+)/i);
    if (!elevMatch) throw new Error(`ELEV tag not found in ${ediPath}`);

    const elev = parseFloat(elevMatch[1]);

    return { dataId, elev, ediFileName };
}
module.exports = { getEdiMetadata };