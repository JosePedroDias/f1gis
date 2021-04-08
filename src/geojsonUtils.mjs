// this is intended to be used in node, unlike most modules in this folder
// usage:
// node src/geojsonUtils.mjs <inFilePath> <outFilePath> <selector> <indexToBeginWith>
// example (noop):
// node src/geojsonUtils.mjs assets/tracks/sakhir.2d.rt.geojson assets/tracks/sakhir.2d.rt.geojson '[0]' 0
// example (rotate 1):
// node src/geojsonUtils.mjs assets/tracks/sakhir.2d.rt.geojson assets/tracks/sakhir.2d.rt.geojson '[0]' 0

import * as fs from 'fs/promises';

function reorderArray(arr, startingIndex) {
    const beforePart = arr.slice(0, startingIndex);
    const whereWeStartFromPart = arr.slice(startingIndex);
    return [...whereWeStartFromPart, ...beforePart];
}

const PREFIX = '.features';
const SUFFIX = '.geometry.coordinates';

async function reorderWay(inFilePath, outFilePath, selector, indexToBeginWith) {
    const inFile = await fs.readFile(inFilePath);
    const o = JSON.parse(inFile.toString());

    const getArray = new Function('o', `return o${PREFIX}${selector}${SUFFIX};`);
    const setArray = new Function('o', 'arr', `o${PREFIX}${selector}${SUFFIX} = arr;`);

    let arr;
    try {
        arr = getArray(o);
    } catch {
        throw new Error('selector failed');
    }

    indexToBeginWith = parseInt(indexToBeginWith, 10);
    if (isNaN(indexToBeginWith) || !isFinite(indexToBeginWith)) {
        throw new Error('wrong index');
    }

    const arr2 = reorderArray(arr, indexToBeginWith);

    try {
        setArray(o, arr2);
    } catch {
        throw new Error('attribution failed');
    }

    const outS = JSON.stringify(o, null, 2);
    await fs.writeFile(outFilePath, outS);
}

function run() {
    const [inFilePath, outFilePath, selector, indexToBeginWith] = process.argv.slice(2);
    // console.log({ inFilePath, outFilePath, selector, indexToBeginWith });
    reorderWay(inFilePath, outFilePath, selector, indexToBeginWith);
}

run();
