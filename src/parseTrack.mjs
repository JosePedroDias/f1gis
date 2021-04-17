/*
./assets/maps/portimao.2d.rt.geojson
https://www.openstreetmap.org/#map=16/37.2303/-8.6279
*/
import { projectFactory } from './gis.mjs';
import { limits2, parametric, distanceSquared2, distance2, zip, rotateArray, lerp, getWrappedItem, isClosedArray } from './math.mjs';

const ZOOM_TO_METERS = 0.000003; // has not been calculated, estimated by trial and error

const GJ_GEO_TYPE_LS = 'LineString';
const GJ_GEO_TYPE_P = 'Point';

const RT_KIND = 'rt:kind';

const RT_KIND_TRACK = 'track';
const RT_KIND_PIT = 'pit';

export const RT_WIDTH = 'rt:width';
export const RT_HEIGHT = 'rt:height';
export const RT_CAMBER = 'rt:camber';

export const RT_POINT_TAG_RACEWAY = 'raceway';
export const RT_POINT_TAG_PIT_STOP = 'rt:pit-stop';
export const RT_POINT_TAG_STARTING_GRID = 'rt:starting-grid';
export const RT_POINT_TAG_DRS = 'rt:drs';
export const RT_POINT_TAG_SECTOR = 'rt:sector';
export const RT_POINT_TAG_CURVE = 'rt:curve';
export const RT_POINT_TAG_LABEL = 'rt:label';

export const RT_VALUE_START = 'start';
export const RT_VALUE_FINISH = 'finish';
export const RT_VALUE_START_FINISH = 'start-finish';
export const RT_VALUE_DETECT = 'detect';

const trueish = ['true', 'yes'];
const falsy = ['false', 'no'];

function parseProperty(s) {
    if (isFinite(s)) {
        return parseFloat(s);
    } else if (trueish.includes(s)) {
        return true;
    } else if (falsy.includes(s)) {
        return false;
    } else if (s[0] === '[' || s[0] === '{') {
        return JSON.parse(s);
    } else {
        return s;
    }
}

function parseProperties(props) {
    const o = {};

    for (let [k, v] of Object.entries(props)) {
        o[k] = parseProperty(v);
    }

    return o;
}

function findNearestIndex(arr, point) {
    let nearestIndex;
    let nearestDistSq = Number.MAX_SAFE_INTEGER;
    for (let [i, p] of Object.entries(arr)) {
        const distSq = distanceSquared2(p, point);
        if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearestIndex = Number(i);
            if (nearestDistSq === 0) {
                return nearestIndex;
            }
        }
    }

    console.log('nearest');
    return nearestIndex;
}

function findIndex(arr, [x1, y1]) {
    for (let [i, [x2, y2]] of Object.entries(arr)) {
        if (x1 === x2 && y1 === y2) {
            return i;
        }
    }

    throw new Error('point not found');
}

function trimWay(arr, i, f) {
    const res = [];
    const l = arr.length;
    while (true) {
        res.push(arr[i]);
        if (i === f) { return res; }
        i = (i + 1) % l;
    }
}

function interpolateNeigbours(coordArr, propsArr, i, prop, isClosed) {
    if (propsArr[i][prop] !== undefined) {
        return propsArr[i][prop];
    }

    const l = coordArr.length;

    let distBefore = 0;
    let propBefore;
    for (let delta = 1; delta < l; ++delta) {
        const p1 = getWrappedItem(coordArr, i - delta + 1, isClosed);
        const p2 = getWrappedItem(coordArr, i - delta, isClosed);
        distBefore += distance2(p1, p2);
        const v = getWrappedItem(propsArr, i - delta, isClosed)[prop];
        if (v !== undefined) {
            propBefore = v;
            break;
        }
    }
    if (!propBefore) {
        throw new Error(`could not find ${prop} before index #${i}!`);
    }

    let distAfter = 0;
    let propAfter;
    for (let delta = 1; delta < l; ++delta) {
        const p1 = getWrappedItem(coordArr, i + delta - 1, isClosed);
        const p2 = getWrappedItem(coordArr, i + delta, isClosed);
        distAfter += distance2(p1, p2);
        const v = getWrappedItem(propsArr, i + delta)[prop];
        if (v !== undefined) {
            propAfter = v;
            break;
        }
    }
    if (!propAfter) {
        throw new Error(`could not find ${prop} after index #${i}!`);
    }

    const ratio = distBefore / (distBefore + distAfter);
    const v = lerp(propBefore, propAfter, ratio);
    return v;
}

export async function parseTrack(url, { zoom } = {}) {
    const res = await fetch(url);
    const data = await res.json();
    const pr = projectFactory(zoom);

    // we ought to visit the track first to find its boundaries and center the canvas there...
    const trackFeature = data.features.find(f => f.geometry?.type === GJ_GEO_TYPE_LS && f?.properties[RT_KIND] === RT_KIND_TRACK);
    if (!trackFeature) { throw new Error('Missing a LineString with rt:kind defined as track'); }

    const api = {
        fromMeters(dim) {
            return dim * Math.pow(2, zoom) * ZOOM_TO_METERS;
        }/* ,
        toMeters(d) {
            return d * 0.037 * Math.pow(2, 18 - zoom);
        } */
    }
    const output = {
        track: {}, // poly arrays (left, center and right)
        pit: {}, // poly arrays (left, center and right)
        pitStop: {}, // positions (start, finish)
        startingGrid: {}, // positions (start, finish)
        sector: {}, // positions (1, 2, 3)
        drs: {}, // positions (start, finish, detect (arrays))
        dimensions: [] // [w, h]
    }

    let ox, oy
    { // TODO REVIEW THIS. map should be centered
        const geo = trackFeature.geometry;
        const coords = geo.coordinates;
        const coords2 = coords.map(pr);
        const limits = limits2(coords2);
        const width = limits[0][1] - limits[0][0];
        const height = limits[1][1] - limits[1][0];
        output.dimensions = [width, height];
        ox = limits[0][0] + width / 2;
        oy = limits[1][0] + height / 2;
    }

    function offset([x, y]) {
        return [x - ox, y - oy];
    }

    function handlePoint(p) {
        return offset(pr(p));
    }

    let pointsToHandle = [];

    data.features.forEach(feature => {
        const geo = feature.geometry;
        const props = parseProperties(feature.properties);
        const kind = props[RT_KIND];
        //console.log(props);

        if (geo.type === GJ_GEO_TYPE_LS) {
            const coords = geo.coordinates.map(handlePoint);

            if ([RT_KIND_TRACK, RT_KIND_PIT].includes(kind)) {
                let bag = kind === RT_KIND_TRACK ? output.track : output.pit;
                bag.properties = props;
                bag.center = coords;
            } else {
                console.warn(`rt-kind ${kind} ignored.`);
                console.log(feature);
            }
        } else if (geo.type === GJ_GEO_TYPE_P) {
            const coord = handlePoint(geo.coordinates);
            pointsToHandle.push([coord, props]);
        }
        else {
            console.warn(`Geometry type ${geo.type} ignored.`);
            console.log(feature);
        }
    });

    // handle point attributions to track and pit
    {
        const tracks = [[output.track, true], [output.pit, false]];

        let _pointsToHandle;

        for (let [track, isClosed] of tracks) {
            const l = track.center.length;
            const slots = new Array(l);
            slots.fill({});
            _pointsToHandle = [];

            pointsToHandle.forEach(([coord, props]) => {
                let idx;
                try {
                    idx = findIndex(track.center, coord);
                } catch (_) {
                    _pointsToHandle.push([coord, props]);
                    return;
                }

                const superProps = { ...slots[idx], ...props };

                slots[idx] = superProps;
                if (isClosed) {
                    if (idx === 0) {
                        slots[l - 1] = superProps;
                    } else if (idx === l - 1) {
                        slots[0] = superProps;
                    }
                }
            });

            pointsToHandle = _pointsToHandle;
            track.pointProperties = slots;
        }

        if (pointsToHandle.length > 0) {
            console.log('pointsToHandle', pointsToHandle);
        }

        // promote sectors and drs...
        for (let [i, coord] of Object.entries(output.track.center)) {
            const props = output.track.pointProperties[i];
            if (props[RT_POINT_TAG_SECTOR]) {
                const v = props[RT_POINT_TAG_SECTOR];
                output.sector[v] = coord;
            }
            if (props[RT_POINT_TAG_STARTING_GRID]) {
                const v = props[RT_POINT_TAG_STARTING_GRID];
                output.startingGrid[v] = coord;
            }
            if (props[RT_POINT_TAG_DRS]) {
                const v = props[RT_POINT_TAG_DRS];
                let bag = output.drs[v];
                if (!bag) {
                    bag = [];
                    output.drs[v] = bag;
                }
                output.drs[v].push(coord);
            }
        }
        for (let [i, coord] of Object.entries(output.pit.center)) {
            const props = output.pit.pointProperties[i];
            if (props[RT_POINT_TAG_PIT_STOP]) {
                const v = props[RT_POINT_TAG_PIT_STOP];
                output.pitStop[v] = coord;
            }
        }
    }

    // trim sector ways
    {
        const sectors = [];
        const numSectors = Object.keys(output.sector).length;
        if (numSectors === 0) {
            console.warn('no sectors found!');
            output.sector['1'] = output.track.center;
        } else {
            for (let [sector, p] of Object.entries(output.sector)) {
                const i = findNearestIndex(output.track.center, p);
                const s2 = 1 + Number(sector) % numSectors;
                const sector2 = `${s2}`;
                const p2 = output.sector[sector2];
                const f = findNearestIndex(output.track.center, p2);
                sectors.push(trimWay(output.track.center, i, f));
            }
            output.sector = sectors.reduce((prev, curr) => {
                const key = `${(1 + Object.keys(prev).length)}`;
                prev[key] = curr;
                return prev;
            }, {});
        }
    }

    // sort drs points and trim ways
    {
        if (!output.drs.detect || !output.drs.start || !output.drs.finish) {
            console.warn('no drs data found!');
            output.drs = {
                detect: [],
                way: []
            }
        }
        else {
            const fn = (p) => findNearestIndex(output.track.center, p);

            let detects = output.drs.detect.map(fn);
            let starts = output.drs.start.map(fn);
            let finishes = output.drs.finish.map(fn);

            detects.sort();
            starts.sort();
            finishes.sort();

            const ways = [];
            for (let detect of detects) {
                while (starts[0] < detect && starts.length > 1) {
                    starts = rotateArray(starts, 1);
                }
                while (finishes[0] < starts[0] && finishes.length > 1) {
                    finishes = rotateArray(finishes, 1);
                }
                ways.push(trimWay(output.track.center, starts[0], finishes[0]));
            }
            output.drs = {
                detect: detects.map((idx) => [...output.track.center[idx]]),
                way: ways
            }
        }
    }

    // assign widths and heights... generate left and right ways TODO: cambers
    {
        const tracks = [
            [output.track, true],
            [output.pit, false]
        ];
        for (let [track, isClosed] of tracks) {
            const l = track.center.length;

            const widths = new Array(l);
            const heights = new Array(l);
            //const cambers = new Array(l);

            let width = track.properties[RT_WIDTH];
            let height = track.properties[RT_HEIGHT] || 0;
            //let camber = track.properties[RT_CAMBER] || 0;

            widths.fill(api.fromMeters(width));
            heights.fill(api.fromMeters(height));
            //cambers.fill(api.fromMeters(camber));

            for (let idx = 0; idx < track.pointProperties.length; ++idx) {
                try {
                    width = interpolateNeigbours(track.center, track.pointProperties, idx, RT_WIDTH, isClosed);
                    widths[idx] = api.fromMeters(width);
                } catch (_) { }

                try {
                    height = interpolateNeigbours(track.center, track.pointProperties, idx, RT_HEIGHT, isClosed) * 5;
                    heights[idx] = api.fromMeters(height);
                } catch (_) { }
            }

            track.left = parametric(track.center, -Math.PI / 2, widths, closed)
            track.right = parametric(track.center, Math.PI / 2, widths, closed);

            const addHeight = (p2, h) => [p2[0], h, p2[1]];
            track.left = zip([track.left, heights], addHeight);
            track.center = zip([track.center, heights], addHeight);
            track.right = zip([track.right, heights], addHeight);
        }
    }

    return {
        ...output,
        ...api
    }
}
