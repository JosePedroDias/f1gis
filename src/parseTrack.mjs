/*
./assets/maps/portimao.2d.rt.geojson
https://www.openstreetmap.org/#map=16/37.2303/-8.6279
*/
import { projectFactory } from './gis.mjs';
import { limits2, parametric } from './math.mjs';

const ZOOM_TO_METERS = 0.000003; // has not been calculated, estimated by trial and error

const GJ_GEO_TYPE_LS = 'LineString';

const RT_KIND = 'rt:kind';
const RT_WIDTH = 'rt:width';

const RT_KIND_TRACK = 'track';
const RT_KIND_PIT = 'pit';
const RT_KIND_PIT_STOP = 'pit-stop';
const RT_KIND_STARTING_GRID = 'starting-grid';
const RT_KIND_CHECKPOINT = 'checkpoint';

const trueish = ['true', 'yes'];
const falsy = ['false', 'no'];

function parseProperty(s) {
    if (isFinite(s)) {
        return parseFloat(s);
    } else if (trueish.includes(s)) {
        return true;
    } else if (falsy.includes(s)) {
        return false;
    } else if (s[0] === '[') {
        return JSON.parse(s);
    } else {
        return s;
    }
}

function parseOptionalArrayProperty(valueS, propName, expectedLength) {
    const arrOrValue = parseProperty(valueS);
    if (arrOrValue instanceof Array) {
        let arr = arrOrValue;
        if (arr.length !== expectedLength) {
            //throw new Error(`Expected ${expectedLength} elements in ${propName} but got ${arr.length}!`);
            arr = arr.concat(new Array(expectedLength - arr.length).fill(null));
        }
        let ifNull = arr.find((el) => el !== null);
        for (let [i, el] of Object.entries(arr)) {
            if (el === null) {
                arr[i] = ifNull;
            } else {
                ifNull = el;
            }
        }
        return arr;
    } else {
        const value = arrOrValue;
        const arr = new Array(expectedLength);
        arr.fill(value);
        return arr;
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
        }
    }
    const output = {
        track: {}, // poly arrays (left, center and right)
        pit: {}, // poly arrays (left, center and right)
        pitStop: [], // array of positions
        startingGrid: [], // array of positions (in pecking order?)
        dimensions: [], // [w, h]
        center: [] // [x, y]
    }

    let ox, oy;
    {
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

    data.features.forEach(feature => {
        const geo = feature.geometry;
        const props = feature.properties;
        const kind = props[RT_KIND];
        //console.log(props);

        if (geo.type === GJ_GEO_TYPE_LS) {
            const coords = geo.coordinates;
            const coords2 = coords.map(pr);
            const coords3 = coords2.map(([x, y]) => [x - ox, y - oy]);

            if ([RT_KIND_TRACK, RT_KIND_PIT].includes(kind)) {
                let bag = kind === RT_KIND_TRACK ? output.track : output.pit;

                props[RT_WIDTH] = parseOptionalArrayProperty(props[RT_WIDTH], RT_WIDTH, coords3.length);
                let widths = props[RT_WIDTH];
                //console.log('props[RT_WIDTH]', widths, isNaN(widths));
                //if (isNaN(width)) { throw new Error(`${kind} missing property rt:width!`) }
                widths = widths.map(api.fromMeters);
                const closed = kind === RT_KIND_TRACK;

                bag.properties = props;
                bag.left = parametric(coords3, -Math.PI / 2, widths, closed)
                bag.center = coords3;
                bag.right = parametric(coords3, Math.PI / 2, widths, closed);
            } else if (kind === RT_KIND_STARTING_GRID) {
                output.startingGrid = coords3;
            } else if (kind === RT_KIND_PIT_STOP) {
                output.pitStop = coords3;
            } else {
                console.warn(`rt-kind ${kind} ignored.`);
                console.log(feature);
            }
        } else {
            console.warn(`Geometry type ${geo.type} ignored.`);
            console.log(feature);
        }
    });

    return {
        ...output,
        ...api
    }
}
