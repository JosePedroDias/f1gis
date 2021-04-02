import { loadSprites, drawPolygon, drawCircle, drawRect, drawText, drawPixel, drawSprite, runGameLoop } from './canvas.mjs';
import { subscribeKeys, keysDown, keysJustDown } from './kbd.mjs';
import { projectFactory } from './gis.mjs';
import { limits2, parametric } from './math.mjs';

async function run() {
    //const res = await fetch('./assets/maps/portimao.geojson');
    const res = await fetch('./assets/maps/portimao.2d.rt.geojson');
    const data = await res.json();

    // https://www.openstreetmap.org/#map=16/37.2303/-8.6279

    const scroll = [230, 100];
    const ZOOM = 16;
    const FONT_SIZE = 10;
    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.font = `${FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#330';

    const pr = projectFactory(ZOOM);

    let ox, oy;
    data.features.forEach((feature, i) => {
        const geo = feature.geometry;
        const props = feature.properties;
        const kind = props['rt:kind'];
        console.log(props);

        if (props.stroke) {
            ctx.strokeStyle = props.stroke;
        }

        if (geo.type === 'LineString') {
            const coords = geo.coordinates;
            const coords2 = coords.map(pr);

            if (i === 0) {
                const limits = limits2(coords2);
                [ox, oy] = [limits[0][0] - scroll[0], limits[1][0] - scroll[1]];
            }

            const coords3 = coords2.map(([x, y]) => [x - ox, y - oy]);

            if (['track', 'pit'].includes(kind)) {
                const width = parseFloat(props["rt:width"]);
                if (isNaN(width)) { throw new Error(`${kind} missing property rt:width!`) }
                const w = width * ZOOM * 0.015;
                const closed = false;
                const coords3r = parametric(coords3, Math.PI / 2, w, closed);
                const coords3l = parametric(coords3, -Math.PI / 2, w, closed);
                drawPolygon(ctx, coords3r);
                drawPolygon(ctx, coords3l);

                const w_ = w * 4;
                const coords3_ = parametric(coords3, Math.PI / 2, w_, closed);
                const coords3__ = parametric(coords3, -Math.PI / 2, w_, closed);
                ctx.strokeStyle = '#033';
                for (const [i, p] of Object.entries(coords3)) {
                    //drawPixel(ctx, p);

                    drawCircle(ctx, p, 2);
                    drawText(ctx, coords3_[i], `${i}`);
                    drawText(ctx, coords3__[i], `${i}`);
                }
            } else {
                drawPolygon(ctx, coords3);
            }
        }
    });

    const SPRITE_DIMS = [83, 34];
    const SPRITE_NAMES = '01 02 03'.split(' ');
    const sprites = await loadSprites(SPRITE_NAMES, 'assets/cars/{spriteName}.png');

    //drawPolygon(ctx, [[30, 40], [130, 40], [80, 120]], { fill: true, close: true });
    //drawCircle(ctx, [200, 100], 50, { fill: true });
    //drawSprite(ctx, sprites[0], SPRITE_DIMS, [400, 400], 0);

    subscribeKeys();

    const ARROW_UP = 'ArrowUp';
    const ARROW_DOWN = 'ArrowDown';

    function onTick(t, dt) {
        if (keysDown[ARROW_DOWN]) { console.log('DOWN IS PRESSED'); }
        if (keysJustDown[ARROW_UP]) { console.log('UP JUST GOT PRESSED'); }
        //ctx.clearRect(0, 0, 800, 800);
        //console.log(`t:${t.toFixed(2)}, dt:${dt.toFixed(2)}`);
        //drawSprite(ctx, sprites[0], SPRITE_DIMS, [400, 400], t);
    }
    runGameLoop(onTick);
}

run();
