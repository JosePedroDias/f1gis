import { drawPolygon } from './canvas.mjs';
import { projectFactory } from './gis.mjs';
import { minMax2 } from './math.mjs';

async function run() {
    //const res = await fetch('./assets/maps/portimao.geojson');
    const res = await fetch('./assets/maps/portimao.2d.rt.geojson');
    const data = await res.json();

    // https://www.openstreetmap.org/#map=16/37.2303/-8.6279

    const scroll = [230, 100];
    const ZOOM = 16;
    const ctx = document.querySelector('canvas').getContext('2d');
    const pr = projectFactory(ZOOM);

    let ox, oy;
    data.features.forEach((feature, i) => {
        const geo = feature.geometry;
        const props = feature.properties;
        console.log(geo, props);

        if (props.stroke) {
            ctx.strokeStyle = props.stroke;
        }

        if (geo.type === 'LineString') {
            const coords = geo.coordinates;
            const coords2 = coords.map(pr);

            if (i === 0) {
                const limits = minMax2(coords2);
                [ox, oy] = [limits[0][0] - scroll[0], limits[1][0] - scroll[1]];
            }

            const coords3 = coords2.map(([x, y]) => [x - ox, y - oy]);
            drawPolygon(ctx, coords3);
        }
    });

    //drawPolygon(ctx, [[30, 40], [130, 40], [80, 120]], { fill: true, close: true });
}

run();
