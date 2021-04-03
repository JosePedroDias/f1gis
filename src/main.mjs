import { loadSprites, drawPolygon, drawRect, drawText, drawSprite, runGameLoop } from './canvas.mjs';
import { subscribeKeys, keysDown } from './kbd.mjs';
import { projectFactory } from './gis.mjs';
import { limits2, parametric, movePolar, clamp, wrapAngle, mulVScalar, RAD2DEG } from './math.mjs';
import { drawCircle } from './canvas.mjs';

async function run() {
    //const res = await fetch('./assets/maps/portimao.geojson');
    const res = await fetch('./assets/maps/portimao.2d.rt.geojson');
    const data = await res.json();

    // https://www.openstreetmap.org/#map=16/37.2303/-8.6279

    const WINDOW_SIZE = 800;
    const ZOOM = 16;
    const ZOOM_TO_METERS = 0.015; // has not been calculated, estimated by trial and error
    const FONT_SIZE = 10;
    const CAR_SPRITE_ZOOM = 1 / 15;
    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';

    const pr = projectFactory(ZOOM);

    // will store right and left margins for both track and pit
    const trackMargins = new Array(2);
    const pitMargins = new Array(2);

    // we ought to visit the track first to find its boundaries and center the canvas there...
    const trackFeature = data.features.find(f => f.geometry?.type === 'LineString' && f?.properties['rt:kind'] === 'track');
    if (!trackFeature) { throw new Error('Missing a LineString with rt:kind defined astrack'); }

    let ox, oy;
    {
        const geo = trackFeature.geometry;
        const coords = geo.coordinates;
        const coords2 = coords.map(pr);
        const limits = limits2(coords2);
        const w = limits[0][1] - limits[0][0];
        const h = limits[1][1] - limits[1][0];
        [ox, oy] = [limits[0][0] - (0 - w) / 2, limits[1][0] - (0 - h) / 2];
        //[ox, oy] = [limits[0][0], limits[1][0]];
    }

    data.features.forEach(feature => {
        const geo = feature.geometry;
        const props = feature.properties;
        const kind = props['rt:kind'];
        //console.log(props);

        if (geo.type === 'LineString') {
            const coords = geo.coordinates;
            const coords2 = coords.map(pr);
            const coords3 = coords2.map(([x, y]) => [x - ox, y - oy]);

            if (['track', 'pit'].includes(kind)) {
                let marginsArray = kind === 'track' ? trackMargins : pitMargins;

                const width = parseFloat(props["rt:width"]);
                if (isNaN(width)) { throw new Error(`${kind} missing property rt:width!`) }
                const w = width * ZOOM * ZOOM_TO_METERS;
                const closed = false;
                marginsArray[0] = parametric(coords3, Math.PI / 2, w, closed);
                marginsArray[1] = parametric(coords3, -Math.PI / 2, w, closed);
            } else {
                // TODO
                //drawPolygon(ctx, coords3);
            }
        }
    });

    drawPolygon(ctx, trackMargins[0], { close: true });
    drawPolygon(ctx, trackMargins[1], { close: true });
    drawPolygon(ctx, pitMargins[0]);
    drawPolygon(ctx, pitMargins[1]);

    const SPRITE_DIMS = [83, 34];
    const SPRITE_NAMES = '01 02 03'.split(' ');
    const sprites = await loadSprites(SPRITE_NAMES, 'assets/cars/{spriteName}.png');

    subscribeKeys();

    // cam
    let cam_center = [0, 0];
    let cam_zoom = 4;
    let cam_angle = 0;

    // car
    let car_pos = [0, 0];
    let car_angle = 0;
    let car_speed = 0;
    let dAccel = 20;
    let dTurn = 1.5;

    function onTick(t, dt) {
        //console.log(`t:${t.toFixed(2)}, dt:${dt.toFixed(2)}`);

        drawRect(ctx, [0, 0], [WINDOW_SIZE, WINDOW_SIZE], { clear: true });

        drawText(ctx, [400, 10], `POS: ${car_pos[0].toFixed(1)}, ${car_pos[1].toFixed(1)}  SPEED:${car_speed.toFixed(1)}  ROTATION:${(car_angle * RAD2DEG).toFixed(0)}`);

        ctx.save();

        ctx.translate(WINDOW_SIZE / 2, WINDOW_SIZE / 2);

        //rotation += dt * 0.1;
        //zoom *= 1.001;
        //center[0] += dt * 10;
        //rotation = -car_angle - Math.PI / 2;
        //center = mulVScalar(-1, car_pos);

        // TRACK
        ctx.save();
        ctx.rotate(cam_angle);
        ctx.translate(cam_center[0], cam_center[1]);
        ctx.scale(cam_zoom, cam_zoom);

        drawPolygon(ctx, trackMargins[0], { close: true });
        drawPolygon(ctx, trackMargins[1], { close: true });
        drawPolygon(ctx, pitMargins[0]);
        drawPolygon(ctx, pitMargins[1]);

        //drawCircle(ctx, car_pos, SPRITE_DIMS[1]);

        ctx.restore();

        //CAR
        ctx.save();
        ctx.rotate(cam_angle);
        ctx.translate(cam_center[0], cam_center[1]);
        ctx.scale(cam_zoom * CAR_SPRITE_ZOOM, cam_zoom * CAR_SPRITE_ZOOM);
        //ctx.scale(zoom, zoom);

        drawCircle(ctx, car_pos, SPRITE_DIMS[1]);
        drawSprite(ctx, sprites[0], SPRITE_DIMS, car_pos, car_angle);
        ctx.restore();

        if (keysDown['ArrowUp']) {
            car_speed = clamp(car_speed + dAccel * dt, -20, 400);
        }
        if (keysDown['ArrowDown']) {
            car_speed = clamp(car_speed - dAccel * dt * 3, -20, 400);
        }
        if (keysDown['ArrowLeft']) {
            car_angle = wrapAngle(car_angle - dTurn * dt);
        }
        if (keysDown['ArrowRight']) {
            car_angle = wrapAngle(car_angle + dTurn * dt);
        }

        if (keysDown['a']) {
            cam_zoom *= 1 + (0.5 * dt);
        }
        if (keysDown['d']) {
            cam_zoom *= 1 - (0.5 * dt);
        }
        if (keysDown['s']) {
            cam_center[1] += 100 * dt;
        }
        if (keysDown['x']) {
            cam_center[1] -= 100 * dt;
        }
        if (keysDown['z']) {
            cam_center[0] += 100 * dt;
        }
        if (keysDown['c']) {
            cam_center[0] -= 100 * dt;
        }
        if (keysDown['f']) {
            cam_angle = wrapAngle(cam_angle + dt * 1);
        }
        if (keysDown['v']) {
            cam_angle = wrapAngle(cam_angle - dt * 1);
        }

        //if (keysJustDown[ARROW_UP]) { console.log('UP JUST GOT PRESSED'); }

        if (car_speed !== 0) {
            car_pos = movePolar(car_pos, car_angle, car_speed * dt);
        }

        ctx.restore();
    }
    runGameLoop(onTick);
}

run();
