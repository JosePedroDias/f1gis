import { parseTrack } from './parseTrack.mjs';
import { drawPolygon, drawArrow, drawCircle, drawText, } from './canvas.mjs';
import { subV, mulVScalar, toPolar, parametric } from './math.mjs';
import { turtle } from './math.mjs';

const SECTOR_COLORS = {
    1: "#ff0000",
    2: "#00b5e9",
    3: "#ffd500"
}

const DRS_COLOR = '#00c500';

async function run() {
    const hash = (location.hash?.substring(1) || '').split(',');
    const canvasEl = document.querySelector('canvas');

    const WINDOW_SIZE = canvasEl.getBoundingClientRect().width;
    const FONT_SIZE = 14;
    const ZOOM = hash[1] ? Number(hash[1]) : 17;
    const mapName = hash[0] || 'portimao.2d.rt.geojson';

    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    //ctx.lineJoin = 'round';
    //ctx.lineCap = 'round';
    ctx.miterLimit = 20;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';


    const data = await parseTrack(`./assets/tracks/${mapName}`, { zoom: ZOOM });
    console.log('data', data);
    window.data = data;

    //const DASHED = [5, 15];
    const DASHED = [2, 2];
    const SOLID = [];

    const LW = 2;

    const steps = ['start', 'finish'];
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
        ctx.lineWidth = LW;
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
        ctx.lineWidth = LW;
    }

    // STARTING TRACK POS AND DIR, pitStop and startingGrid
    {
        {
            const p0 = data.track.center[data.startFinishIndex];
            const p1 = data.track.center[data.startFinishIndex + 1];
            const v0 = subV(p1, p0);
            const angleAtP0 = toPolar(v0)[0];
            const t = turtle(p0, angleAtP0);
            const p0_ = t.right(-13).p;
            ctx.strokeStyle = '#00A';
            drawArrow(ctx, p0_, angleAtP0);
        }


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
                const p = data.sector[step] && data.sector[step][0];
                if (!p) { break; }
                drawCircle(ctx, p, 5);
                drawText(ctx, p, ` ---- sector ${step}`);
            }
        }

        {
            ctx.strokeStyle = DRS_COLOR;
            ctx.fillStyle = DRS_COLOR;
            const lw = data.fromMeters(data.track.properties['rt:width']);
            const detectPoints = data.drs.detect;
            if (detectPoints) {
                for (let [i, p] of Object.entries(detectPoints)) {
                    drawCircle(ctx, p, 5);
                    drawText(ctx, p, ` ---- drs detect`);
                    const way = data.drs.way[i];
                    const way2 = parametric(way, -Math.PI / 2, lw * 3);

                    ctx.lineWidth = lw * 0.7;
                    ctx.setLineDash(DASHED);
                    drawPolygon(ctx, way2);
                    ctx.setLineDash(SOLID);
                    ctx.lineWidth = LW;
                }
            }
        }

        ctx.textAlign = 'center';
    }
}

run();
