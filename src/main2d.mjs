import { loadSprites, drawPolygon, drawRect, drawText, drawSprite, drawIndices, runGameLoop } from './canvas.mjs';
import { subscribeKeys, keysDown } from './kbd.mjs';
import { movePolar, clamp, wrapAngle, addV, subV, mulVScalar, RAD2DEG } from './math.mjs';
import { drawCircle } from './canvas.mjs';
import { parseTrack } from './parseTrack.mjs';

async function run() {
    const WINDOW_SIZE = 800;
    const ZOOM = 16;
    const FONT_SIZE = 10;
    const CAR_SPRITE_ZOOM = 1 / 15;
    const SPRITE_DIMS = [83, 34];
    const SPRITE_NAMES = '01 02 03 04 05 06 07 08 09 10'.split(' ');

    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';

    const data = await parseTrack('./assets/tracks/portimao.2d.rt.geojson', { zoom: ZOOM });

    function drawTrack() {
        drawPolygon(ctx, data.track.left, { close: true });
        drawPolygon(ctx, data.track.right, { close: true });

        drawPolygon(ctx, data.pit.left);
        drawPolygon(ctx, data.pit.right);
    }

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

        drawTrack();

        //drawCircle(ctx, car_pos, SPRITE_DIMS[1]);

        ctx.restore();

        //CAR
        ctx.save();
        ctx.rotate(cam_angle);
        ctx.translate(cam_center[0], cam_center[1]);
        ctx.scale(cam_zoom * CAR_SPRITE_ZOOM, cam_zoom * CAR_SPRITE_ZOOM);
        //ctx.scale(zoom, zoom);

        drawCircle(ctx, car_pos, SPRITE_DIMS[1]);
        drawSprite(ctx, sprites[8], SPRITE_DIMS, car_pos, car_angle);
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

        if (car_speed !== 0) {
            car_pos = movePolar(car_pos, car_angle, car_speed * dt);
        }

        ctx.restore();
    }
    runGameLoop(onTick);
}

run();
