/*
./assets/maps/portimao.2d.rt.geojson
https://www.openstreetmap.org/#map=16/37.2303/-8.6279
*/
import { projectFactory } from './gis.mjs';
import { limits2, parametric, distanceSquared2, zip } from './math.mjs';

const ZOOM_TO_METERS = 0.000003; // has not been calculated, estimated by trial and error

const GJ_GEO_TYPE_LS = 'LineString';
const GJ_GEO_TYPE_P = 'Point';

const RT_KIND = 'rt:kind';
const RT_WIDTH = 'rt:width';
const RT_HEIGHT = 'rt:height';
const RT_CAMBER = 'rt:camber';

const RT_KIND_TRACK = 'track';
const RT_KIND_PIT = 'pit';

const RT_POINT_TAG_RACEWAY = 'raceway';
const RT_POINT_TAG_PIT_STOP = 'rt:pit-stop';
const RT_POINT_TAG_STARTING_GRID = 'rt:starting-grid';
const RT_POINT_TAG_DRS = 'rt:drs';
const RT_POINT_TAG_SECTOR = 'rt:sector';

const RT_VALUE_START = 'start';
const RT_VALUE_FINISH = 'finish';
const RT_VALUE_START_FINISH = 'start-finish';
const RT_VALUE_DETECT = 'detect';

const trueish = ['true', 'yes'];
const falsy = ['false', 'no'];

function rotate(arr, delta) {
    const l = arr.length;
    const before = arr.slice(0, delta);
    const from = arr.slice(delta);
    return [...from, ...before];
}

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
        dimensions: [], // [w, h]
        center: [], // [x, y]
        startFinishIndex: 0
    }

    let ox, oy;
    { // TODO REVIEW THIS. map should be centered
        const geo = trackFeature.geometry;
        const coords = geo.coordinates;
        const coords2 = coords.map(pr);
        const limits = limits2(coords2);
        const width = limits[0][1] - limits[0][0];
        const height = limits[1][1] - limits[1][0];
        output.dimensions = [width, height];
        //[ox, oy] = [limits[0][0] - (0 - width) / 2, limits[1][0] - (0 - height) / 2];
        [ox, oy] = [limits[0][0], limits[1][0]];
        output.center = [ox, oy];
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

            let bag, k;

            for (let propName of Object.keys(props)) {
                let isArray = false;
                if (propName === RT_POINT_TAG_PIT_STOP) {
                    bag = output.pitStop;
                    k = RT_POINT_TAG_PIT_STOP;
                } else if (propName === RT_POINT_TAG_STARTING_GRID) {
                    bag = output.startingGrid;
                    k = RT_POINT_TAG_STARTING_GRID;
                } else if (propName === RT_POINT_TAG_SECTOR) {
                    bag = output.sector;
                    k = RT_POINT_TAG_SECTOR;
                } else if (propName === RT_POINT_TAG_DRS) {
                    bag = output.drs;
                    k = RT_POINT_TAG_DRS;
                    isArray = true;
                } else if (propName === RT_POINT_TAG_RACEWAY) {
                    if ([RT_VALUE_START_FINISH, RT_VALUE_FINISH].includes(props[RT_POINT_TAG_RACEWAY])) {
                        output._racewayStartFinish = coord;
                    }
                } else if ([RT_WIDTH, RT_HEIGHT, RT_CAMBER].includes(propName)) {
                    // noop
                }
                else {
                    console.warn(`Prop ${propName} ignored.`);
                }
                if (bag) {
                    const v = props[k];
                    if (isArray) {
                        if (bag[v]) {
                            bag[v].push(coord);
                        } else {
                            bag[v] = [coord];
                        }
                    } else {
                        bag[v] = coord;
                    }
                }
            }
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
            _pointsToHandle = [];

            pointsToHandle.forEach(([coord, props]) => {
                let idx;
                try {
                    idx = findIndex(track.center, coord);
                } catch (_) {
                    _pointsToHandle.push([coord, props]);
                    return;
                }

                slots[idx] = props;
                if (isClosed) {
                    if (idx === 0) {
                        slots[l - 1] = props;
                    } else if (idx === l - 1) {
                        slots[0] = props;
                    }
                }
            });

            pointsToHandle = _pointsToHandle;
            track.pointProperties = slots;
        }

        if (pointsToHandle.length > 0) {
            console.log('pointsToHandle', pointsToHandle);
        }
    }

    // startFinishIndex
    if (output._racewayStartFinish) {
        const i = findNearestIndex(output.track.center, output._racewayStartFinish);
        output.startFinishIndex = i;
        delete output._racewayStartFinish;
    } else {
        console.warn(`${RT_POINT_TAG_RACEWAY} property with value ${RT_VALUE_START_FINISH} missing from a point in the ${GJ_GEO_TYPE_LS} ${RT_KIND_TRACK}! Assuming index 0.`);
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
                    starts = rotate(starts, 1);
                }
                while (finishes[0] < starts[0] && finishes.length > 1) {
                    finishes = rotate(finishes, 1);
                }
                ways.push(trimWay(output.track.center, starts[0], finishes[0]));
            }
            output.drs = {
                detect: detects.map((idx) => [...output.track.center[idx]]),
                way: ways
            }
        }
    }

    // assign widths and heights... generate left and right ways
    // TODO: cambers
    {
        const tracks = [[output.track, true], [output.pit, false]];
        for (let [track, isClosed] of tracks) {
            const l = track.center.length;
            const widths = new Array(l);
            const heights = new Array(l);
            const cambers = new Array(l);
            widths.fill(api.fromMeters(track.properties[RT_WIDTH]));
            heights.fill(api.fromMeters(track.properties[RT_HEIGHT] || 0));
            cambers.fill(api.fromMeters(track.properties[RT_CAMBER] || 0));

            for (let [idx, props] of Object.entries(track.pointProperties)) {
                if (props[RT_WIDTH]) {
                    widths[idx] = api.fromMeters(props[RT_WIDTH]);
                }
                if (props[RT_HEIGHT]) {
                    heights[idx] = api.fromMeters(props[RT_HEIGHT]);
                }
                if (props[RT_CAMBER]) {
                    cambers[idx] = api.fromMeters(props[RT_CAMBER]);
                }
            }

            //console.log('widths', widths);
            //console.log('heights', heights);
            //console.log('cambers', cambers);

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
