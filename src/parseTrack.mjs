/*
./assets/maps/portimao.2d.rt.geojson
https://www.openstreetmap.org/#map=16/37.2303/-8.6279
*/
import { projectFactory } from './gis.mjs';
import { limits2, parametric, distanceSquared2 } from './math.mjs';

const ZOOM_TO_METERS = 0.000003; // has not been calculated, estimated by trial and error

const GJ_GEO_TYPE_LS = 'LineString';
const GJ_GEO_TYPE_P = 'Point';

const RT_KIND = 'rt:kind';
const RT_WIDTH = 'rt:width';

const RT_KIND_TRACK = 'track';
const RT_KIND_PIT = 'pit';

const RT_POINT_TAG_PIT_STOP = 'rt:pit-stop';
const RT_POINT_TAG_STARTING_GRID = 'rt:starting-grid';
const RT_POINT_TAG_DRS = 'rt:drs';
const RT_POINT_TAG_ZONE = 'rt:zone';

const RT_VALUE_START = 'start';
const RT_VALUE_FINISH = 'finish';
const RT_VALUE_START_FINISH = 'start-finish';
const RT_VALUE_DETECT = 'detect';

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

export async function parseTrack(url, { zoom } = {}) {
    const res = await fetch(url);
    const data = await res.json();

    //console.log('data0', data);

    const pr = projectFactory(zoom);

    // we ought to visit the track first to find its boundaries and center the canvas there...
    const trackFeature = data.features.find(f => f.geometry?.type === GJ_GEO_TYPE_LS && f?.properties[RT_KIND] === RT_KIND_TRACK);
    if (!trackFeature) { throw new Error('Missing a LineString with rt:kind defined as track'); }

    const api = {
        fromMeters(dim) {
            return dim * Math.pow(2, zoom) * ZOOM_TO_METERS;
        }
    }
    const output = {
        track: {}, // poly arrays (left, center and right)
        pit: {}, // poly arrays (left, center and right)
        pitStop: {}, // positions (start, finish)
        startingGrid: {}, // positions (start, finish)
        zone: {}, // positions (1, 2, 3)
        drs: {}, // positions (start, finish, detect (arrays))
        dimensions: [], // [w, h]
        center: [] // [x, y]
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

    function findIndex(arr, point) {
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

        return nearestIndex;
    }

    data.features.forEach(feature => {
        const geo = feature.geometry;
        const props = parseProperties(feature.properties);
        const kind = props[RT_KIND];
        //console.log(props);

        if (geo.type === GJ_GEO_TYPE_LS) {
            const coords = geo.coordinates.map(handlePoint);

            if ([RT_KIND_TRACK, RT_KIND_PIT].includes(kind)) {
                let bag = kind === RT_KIND_TRACK ? output.track : output.pit;

                // TODO left and right should be computed after all geojson is parsed, so points can override widths, etc.
                let width = api.fromMeters(props[RT_WIDTH]);
                const closed = kind === RT_KIND_TRACK;

                bag.properties = props;
                bag.left = parametric(coords, -Math.PI / 2, width, closed)
                bag.center = coords;
                bag.right = parametric(coords, Math.PI / 2, width, closed);
            } else {
                console.warn(`rt-kind ${kind} ignored.`);
                console.log(feature);
            }
        } else if (geo.type === GJ_GEO_TYPE_P) {
            const coord = handlePoint(geo.coordinates);
            let bag, k;

            for (let propName of Object.keys(props)) {
                let isArray = false;
                if (propName === RT_POINT_TAG_PIT_STOP) {
                    bag = output.pitStop;
                    k = RT_POINT_TAG_PIT_STOP;
                } else if (propName === RT_POINT_TAG_STARTING_GRID) {
                    bag = output.startingGrid;
                    k = RT_POINT_TAG_STARTING_GRID;
                } else if (propName === RT_POINT_TAG_ZONE) {
                    bag = output.zone;
                    k = RT_POINT_TAG_ZONE;
                } else if (propName === RT_POINT_TAG_DRS) {
                    bag = output.drs;
                    k = RT_POINT_TAG_DRS;
                    isArray = true;
                } else {
                    console.warn(`Prop ${propName} ignored.`);
                }
                if (bag) {
                    const v = props[k];
                    if (isArray) {
                        if (bag[v]) {
                            bag[v].append(coord);
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

    // TODO sort drs points
    const referenceArray = output.track.center;
    for (let [k, arr] of Object.entries(output.drs)) {
        console.log(k, arr);
        const indices = arr.map((p) => findIndex(referenceArray, p));
        console.log(indices);
    }

    // TODO assign widths by merging the default and node overrides

    return {
        ...output,
        ...api
    }
}
