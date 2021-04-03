import { loadSprites, drawPolygon, drawRect, drawText, drawSprite, drawIndices, runGameLoop } from './canvas.mjs';
import { subscribeKeys, keysDown } from './kbd.mjs';
import { movePolar, clamp, wrapAngle, addV, subV, mulVScalar, RAD2DEG } from './math.mjs';
import { drawCircle } from './canvas.mjs';
import { parseTrack } from './parseTrack.mjs';
import { toPolar } from './math.mjs';
import { drawArrow } from './canvas.mjs';

async function run() {
    const WINDOW_SIZE = 1400;
    const ZOOM = 17;
    const FONT_SIZE = 10;

    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';

    const data = await parseTrack('./assets/maps/portimao.2d.rt.geojson', { zoom: ZOOM });
    console.log('data', data);
    window.data = data;

    const DASHED = [5, 15];
    const SOLID = [];

    function formatterFactory(prefix) { return (i) => `${prefix}${i}` }
    let fmt;

    const canvasDims = [WINDOW_SIZE, WINDOW_SIZE];
    const dataDims = data.dimensions;
    const offset = mulVScalar(0.5, subV(canvasDims, dataDims));

    // TODO data should be center at map center! it isn't yet
    //ctx.scale(2, 2);
    ctx.translate(offset[0], offset[1]);
    //ctx.rotate(Math.PI / 2);

    // DRAW TRACK (main, closed track)
    {
        ctx.strokeStyle = data.track.stroke;
        ctx.setLineDash(DASHED);
        drawPolygon(ctx, data.track.center, { close: true });
        ctx.setLineDash(SOLID);
        drawPolygon(ctx, data.track.left, { close: true });
        drawPolygon(ctx, data.track.right, { close: true });

        ctx.globalAlpha = 0.5;
        fmt = formatterFactory('T_');
        drawIndices(ctx, data.track.center, Math.PI / 2, 20, fmt);
        drawIndices(ctx, data.track.center, -Math.PI / 2, 20, fmt);
        ctx.globalAlpha = 1;
    }

    // DRAW PIT (auxiliary, open track)
    {
        ctx.strokeStyle = data.pit.stroke;
        ctx.setLineDash(DASHED);
        drawPolygon(ctx, data.pit.center);
        ctx.setLineDash(SOLID);
        drawPolygon(ctx, data.pit.left);
        drawPolygon(ctx, data.pit.right);

        ctx.globalAlpha = 0.5;
        fmt = formatterFactory('P_');
        drawIndices(ctx, data.pit.center, Math.PI / 2, 20, fmt);
        drawIndices(ctx, data.pit.center, -Math.PI / 2, 20, fmt);
        ctx.globalAlpha = 1;
    }

    // STARTING TRACK POS AND DIR
    {
        const p0 = data.track.center[0];
        const p1 = data.track.center[1];
        const v0 = subV(p1, p0);
        const angleAtP0 = toPolar(v0)[0];
        ctx.strokeStyle = '#00F';
        drawArrow(ctx, p0, angleAtP0);
    }
}

run();
