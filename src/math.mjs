const sin = Math.sin;
const cos = Math.cos;

export function limits(arr) {
    let m = Number.MAX_VALUE;
    let M = -Number.MAX_VALUE;
    for (let n of arr) {
        if (n < m) { m = n; }
        if (n > M) { M = n; }
    }
    return [m, M];
}

export function limits2(arr) {
    const xx = arr.map(e => e[0]);
    const yy = arr.map(e => e[1]);
    return [
        limits(xx),
        limits(yy),
    ];
}

export function clamp(n, m = 0, M = 1) {
    if (n < m) { return m; }
    if (n > M) { return M; }
    return n;
}

export function wrap(n, min, max) {
    const delta = max - min;
    if (n < min) {
        while (n < min) {
            n += delta;
        }
    } else if (n > max) {
        while (n > max) {
            n -= delta;
        }
    }
    return n;
}

export function lerp(a, b, i) {
    return a * (1 - i) + b * i;
}

export function lerp2(a, b, i) {
    const I = 1 - i;
    return [a[0] * I + b[0] * i, a[1] * I + b[1] * i];
}

export function distanceSquared([x, y]) {
    return x * x + y * y;
}

export function distance([x, y]) {
    return Math.sqrt(x * x + y * y);
}

export function normalized(v) {
    const l = distance(v);
    return [v[0] / l, v[1] / l];
}

export function movePolar([x, y], ang, dist) {
    return [
        dist * cos(ang) + x,
        dist * sin(ang) + y
    ];
}

export function toPolar([x, y]) {
    const dist = Math.sqrt(x * x + y * y);
    const ang = Math.atan2(y, x);
    return [ang, dist];
}

export function sign(n) {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function accum(
    arr,
    newReading,
    maxLength
) {
    arr.unshift(newReading);
    if (arr.length > maxLength) {
        arr.pop();
    }
    let v = 0;
    arr.forEach(vi => {
        v += vi;
    });

    return v / maxLength;
}
