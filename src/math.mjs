export const π = Math.PI;
export const πhalf = π / 2;
export const π2 = 2 * π;

export const DEG2RAD = π / 180;
export const RAD2DEG = 180 / π;

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

export function wrapAngle(n) {
    return wrap(n, -π, π);
}

export function lerp(a, b, i) {
    return a * (1 - i) + b * i;
}

export function lerp2(a, b, i) {
    const I = 1 - i;
    return [a[0] * I + b[0] * i, a[1] * I + b[1] * i];
}

export function distance([x, y]) {
    return Math.sqrt(x * x + y * y);
}

export function distance2([x1, y1], [x2, y2]) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSquared([x, y]) {
    return x * x + y * y;
}

export function distanceSquared2([x1, y1], [x2, y2]) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

export function normalized(v) {
    const l = distance(v);
    return [v[0] / l, v[1] / l];
}

export function addV([x1, y1], [x2, y2]) {
    return [x1 + x2, y1 + y2];
}

export function subV([x1, y1], [x2, y2]) {
    return [x1 - x2, y1 - y2];
}

export function mulVScalar(s, [x, y]) {
    return [s * x, s * y];
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

export function average(arr) {
    return arr.reduce((prev, curr) => prev + curr, 0) / arr.length;
}

export function averageAngles(arr) {
    let v = [0, 0];

    for (const a of arr) {
        v = addV(v, movePolar([0, 0], a, 1));
    }

    return Math.atan2(v[1], v[0]);
}

export function parametric(points, angle, dists, closed) {
    const l = points.length;
    const points2 = [];

    const idx = (i) => (closed ? wrap : clamp)(i, 0, l - 1);

    let i = 0;
    while (i < l) {
        let prev = points[idx(i - 1)];
        let curr = points[idx(i)];
        let next = points[idx(i + 1)];

        if (i === 0 && distance2(prev, curr) === 0) {
            //console.log('override first');
            prev = points[idx(i - 2)];
        }
        if (i === l - 1 && distance2(prev, curr) === 0) {
            //console.log('override last');
            prev = points[idx(i + 2)];
        }
        //console.log(`i: ${i}, prev-curr dist: ${distance2(prev, curr)}, curr-next dist: ${distance2(curr, next)}`);

        let d = subV(curr, prev);
        let a1 = Math.atan2(d[1], d[0]);

        d = subV(next, curr);
        let a2 = Math.atan2(d[1], d[0]);

        let a = averageAngles([a1, a2]);
        const dist = dists instanceof Array ? dists[i] : dists;
        const p = movePolar(curr, a + angle, dist);

        points2.push(p);
        ++i;
    }

    return points2;
}

export function turtle(startP = [0, 0], startAngle = 0) {
    const state = {
        p: [...startP],
        a: startAngle
    };
    const stack = [];

    const api = {
        get p() { return state.p; },
        get a() { return state.a; },
        set p(arr) { state.p = [...arr]; },
        set a(ang) { state.a = ang; },
        getP(fn) {
            fn(state.p);
            return this;
        },
        getA(fn) {
            fn(state.a);
            return this;
        },
        restore() {
            const s = stack.pop();
            state.p = [...s.p];
            state.a = s.a;
            return this;
        },
        save() {
            stack.push({
                p: [...state.p],
                a: state.a
            });
            return this;
        },
        forward(dist = 1) {
            state.p = movePolar(state.p, state.a, dist);
            return this;
        },
        right(dist = 1) {
            state.p = movePolar(state.p, state.a + πhalf, dist);
            return this;
        },
        turn(angle = πhalf) {
            state.a += angle;
            return this;
        }
    };

    return api;
}