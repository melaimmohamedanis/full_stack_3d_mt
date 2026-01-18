// processing/interpolateModel.js

function interpolateModel(
    nNorth, nEast, nDepth,
    northCoords, eastCoords, depthCoords,
    log10Data,
    targetRes = { northRes: 300, eastRes: 300, depthRes: 240 }
) {
    const { northRes, eastRes, depthRes } = targetRes;
    const uniformData = new Float32Array(northRes * eastRes * depthRes);

    const minNorth = northCoords[0];
    const maxNorth = northCoords[nNorth - 1];
    const minEast = eastCoords[0];
    const maxEast = eastCoords[nEast - 1];
    const minDepth = 0;
    const maxDepth = depthCoords[nDepth - 1];

    for (let k = 0; k < depthRes; k++) {
        const targetDepth = minDepth + (k / (depthRes - 1)) * (maxDepth - minDepth);
        const depthIndex = findNearestIndex(depthCoords, targetDepth);

        for (let j = 0; j < eastRes; j++) {
            const targetEast = minEast + (j / (eastRes - 1)) * (maxEast - minEast);
            const eastIndex = findNearestIndex(eastCoords, targetEast);

            for (let i = 0; i < northRes; i++) {
                const targetNorth = minNorth + (i / (northRes - 1)) * (maxNorth - minNorth);
                const northIndex = findNearestIndex(northCoords, targetNorth);

                // Original data layout: [depth][east][north]
                const srcIndex = depthIndex * (nEast * nNorth) + eastIndex * nNorth + northIndex;
                const value = log10Data[srcIndex];

                // Output layout: [depth][east][north]
                const dstIndex = k * (eastRes * northRes) + j * northRes + i;
                uniformData[dstIndex] = value;
            }
        }
    }

    return uniformData;
}

function findNearestIndex(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        let mid = (low + high) >>> 1;
        if (arr[mid] < val) low = mid + 1;
        else if (arr[mid] > val) high = mid - 1;
        else return mid;
    }
    if (low >= arr.length) return arr.length - 1;
    if (high < 0) return 0;
    return (Math.abs(arr[low] - val) < Math.abs(arr[high] - val)) ? low : high;
}

module.exports = { interpolateModel };