import { parseTrack } from './parseTrack.mjs';
import { drawPolygon, drawArrow, drawCircle, drawText, } from './canvas.mjs';
import { subV, mulVScalar, toPolar } from './math.mjs';

const SECTOR_COLORS = {
    1: "#ff0000",
    2: "#00b5e9",
    3: "#ffd500"
}

const DRS_COLOR = '#00c500';

async function run() {
    const WINDOW_SIZE = 1400;
    const ZOOM = 17;
    const FONT_SIZE = 14;

    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';

    const mapName = location.hash?.substring(1) || 'portimao.2d.rt.geojson';
    const data = await parseTrack(`./assets/tracks/${mapName}`, { zoom: ZOOM });
    console.log('data', data);
    window.data = data;

    const DASHED = [5, 15];
    const SOLID = [];

    const steps = ['start', 'finish'];
    const stepsDrs = ['detect', 'start', 'finish'];
    const stepsSectors = ['1', '2', '3'];

    const canvasDims = [WINDOW_SIZE, WINDOW_SIZE];
    const dataDims = data.dimensions;
    const offset = mulVScalar(0.5, subV(canvasDims, dataDims));

    // TODO data should be center at map center! it isn't yet
    ctx.translate(offset[0], offset[1]);

    // draw pit lane
    {
        ctx.lineWidth = data.fromMeters(data.pit.properties['rt:width']) * 2;
        ctx.strokeStyle = '#333';
        drawPolygon(ctx, data.pit.center);
        ctx.lineWidth = 1;
    }

    // DRAW SECTORS
    {
        const lw = data.fromMeters(data.track.properties['rt:width']) * 2;
        for (let [sector, way] of Object.entries(data.sector)) {
            ctx.lineWidth = lw;
            ctx.strokeStyle = '#000';
            drawPolygon(ctx, way);
            ctx.lineWidth = lw / 4;
            ctx.strokeStyle = SECTOR_COLORS[sector];
            drawPolygon(ctx, way);
        }
        ctx.lineWidth = 2;
    }

    /* // DRAW TRACK (main, closed track)
    {
        ctx.strokeStyle = data.track.stroke;
        ctx.setLineDash(DASHED);
        drawPolygon(ctx, data.track.center, { close: true });
        ctx.setLineDash(SOLID);
        drawPolygon(ctx, data.track.left, { close: true });
        drawPolygon(ctx, data.track.right, { close: true });
    }

    // DRAW PIT (auxiliary, open track)
    {
        ctx.strokeStyle = data.pit.stroke;
        ctx.setLineDash(DASHED);
        drawPolygon(ctx, data.pit.center);
        ctx.setLineDash(SOLID);
        drawPolygon(ctx, data.pit.left);
        drawPolygon(ctx, data.pit.right);
    } */

    // STARTING TRACK POS AND DIR, pitStop and startingGrid
    {
        const p0 = data.track.center[data.startFinishIndex];
        const p1 = data.track.center[data.startFinishIndex + 1];
        const v0 = subV(p1, p0);
        const angleAtP0 = toPolar(v0)[0];
        ctx.strokeStyle = '#00F';
        drawArrow(ctx, p0, angleAtP0);

        ctx.textAlign = 'left';

        {
            ctx.strokeStyle = '#077';
            ctx.fillStyle = '#077';
            for (let step of steps) {
                const p = data.startingGrid[step];
                if (!p) { break; }
                drawCircle(ctx, p, 5);
                drawText(ctx, p, ` ---- starting-grid ${step}`);
            }
        }

        {
            ctx.strokeStyle = '#770';
            ctx.fillStyle = '#770';
            for (let step of steps) {
                const p = data.pitStop[step];
                if (!p) { break; }
                drawCircle(ctx, p, 5);
                drawText(ctx, p, ` ---- pit-stop ${step}`);
            }
        }

        {
            ctx.strokeStyle = '#707';
            ctx.fillStyle = '#707';
            for (let step of stepsSectors) {
                const p = data.sector[step][0];
                if (!p) { break; }
                drawCircle(ctx, p, 5);
                drawText(ctx, p, ` ---- sector ${step}`);
            }
        }

        {
            ctx.strokeStyle = DRS_COLOR;
            ctx.fillStyle = DRS_COLOR;
            for (let step of stepsDrs) {
                const points = data.drs[step];
                if (!points) { break; }
                for (let p of points) {
                    drawCircle(ctx, p, 5);
                    drawText(ctx, p, ` ---- drs ${step}`);
                }
            }
        }

        ctx.textAlign = 'center';
    }
}

run();
