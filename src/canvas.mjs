import { updateKeys } from './kbd.mjs';
import { parametric, turtle, πhalf, π2 } from './math.mjs';

const raf = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

export function loadSprites(spriteNames, template) {
    return new Promise((resolve, reject) => {
        const numSprites = spriteNames.length;
        let spritesLeft = numSprites;
        const sprites = new Array(numSprites);

        function onImgLoaded(imgEl, index, spriteName) {
            sprites[index] = imgEl;
            --spritesLeft;
            //console.log('sprite ' + spriteName + ' loaded');
            if (spritesLeft === 0) {
                resolve(sprites);
            }
        }

        for (let [index, spriteName] of spriteNames.entries()) {
            const imgUri = template.replace('{spriteName}', spriteName);
            const imgEl = new Image();
            imgEl.onload = onImgLoaded.bind(null, imgEl, index, spriteName);
            imgEl.onerror = reject;
            imgEl.src = imgUri;
        }
    });
};

export function drawPolygon(ctx, poly, { fill, close } = {}) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
    });
    if (close) {
        const [x, y] = poly[0];
        ctx.lineTo(x, y);
    }
    ctx[fill ? 'fill' : 'stroke']();
}

export function drawText(ctx, [x, y], text) {
    ctx.fillText(text, x, y);
}

export function drawRect(ctx, [x1, y1], [x2, y2], { fill, clear } = {}) {
    const w = x2 - x1 || 1;
    const h = y2 - y1 || 1;
    ctx[fill ? 'fillRect' : clear ? 'clearRect' : 'strokeRect'](x1, y1, w, h);
}

export function drawLine(ctx, [x1, y1], [x2, y2]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function drawArrow(ctx, p0, angle, length = 20, tipLength = 10, tipAngle = πhalf * 1.75) {
    const t = turtle(p0, angle);
    let a, b, c, d;
    t
        .save()
        .forward(-length / 2)
        .getP(p => { a = p; })
        .restore()
        .forward(length / 2)
        .getP(p => { b = p; })
        .save()
        .turn(tipAngle)
        .forward(tipLength)
        .getP(p => { c = p; })
        .restore()
        .turn(-tipAngle)
        .forward(tipLength)
        .getP(p => { d = p; });

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.stroke();
}

export function drawPixel(ctx, p) {
    drawRect(ctx, p, p, { fill: true });
}

export function drawCircle(ctx, [cx, cy], r, { fill } = {}) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, π2);
    ctx[fill ? 'fill' : 'stroke']();
}

export function drawIndices(ctx, poly, angle, dist, formatter = (i) => `${i}`) {
    const poly2 = parametric(poly, angle, dist);
    for (let [i, p] of Object.entries(poly2)) {
        drawText(ctx, p, formatter(i));
    }
}

//  dPos
//  dPos, dDims
//  sPos, sDims, dPos, dDims
export function blit(ctx, srcImg, a, b, c, d) {
    if (!c) {
        c = a;
        d = b;
        a = undefined;
        b = undefined;
    }
    if (!d) { ctx.drawImage(srcImg, c[0], c[1]); }
    else if (!a) { ctx.drawImage(srcImg, c[0], c[1], d[0], d[1]); }
    else { ctx.drawImage(srcImg, a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]); }
}

export function drawSprite(ctx, sprite, [w, h], [x, y], rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(-0.5 * w, -0.5 * h);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
}

export function runGameLoop(onTick_) {
    let lastT = -1 / 60;
    let t = 0;
    function onTick(t_) {
        raf(onTick);

        t = t_ / 1000;
        const dt = t - lastT;

        onTick_(t, dt);

        lastT = t;

        updateKeys();
    }
    onTick(lastT);
}
