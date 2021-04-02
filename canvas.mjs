export function drawPolygon(ctx, poly, { fill, close } = {}) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
        //console.log(x, y);
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
    });
    if (close) {
        const [x, y] = poly[0];
        ctx.lineTo(x, y);
    }
    ctx[fill ? 'fill' : 'stroke']();
}