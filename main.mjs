import { drawPolygon } from './canvas.mjs';
import { projectFactory } from './gis.mjs';
import { minMax2 } from './math.mjs';

async function run() {
    const res = await fetch('./assets/maps/portimao.geojson');
    const data = await res.json();

    // https://www.openstreetmap.org/#map=16/37.2303/-8.6279

    const ORIGIN = [37.2303, -8.6279];
    const ZOOM = 16;
    const ctx = document.querySelector('canvas').getContext('2d');
    const pr = projectFactory(ORIGIN, ZOOM);

    data.features.forEach((feature) => {
        const geo = feature.geometry;
        console.log(geo);
        if (geo.type === 'LineString') {
            const coords = geo.coordinates;
            //console.log('minMax2 before transform', minMax2(coords));
            const coords2 = coords.map(pr);
            const limits = minMax2(coords2);
            const [ox, oy] = [limits[0][0], limits[1][0]];
            console.log(limits[0][1] - limits[0][0], limits[1][1] - limits[1][0]);
            console.log('minMax2 after transform', limits);
            const coords3 = coords2.map(([x, y]) => [x - ox, y - oy]);
            drawPolygon(ctx, coords3);
        }
    });


    //drawPolygon(ctx, [[30, 40], [130, 40], [80, 120]], { fill: true, close: true });
}

run();
