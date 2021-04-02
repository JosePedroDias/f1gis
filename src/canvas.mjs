import { updateKeys } from './kbd.mjs';

const π2 = 2 * Math.PI;

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

export function drawCircle(ctx, [cx, cy], r, { fill } = {}) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, π2);
    ctx[fill ? 'fill' : 'stroke']();
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
