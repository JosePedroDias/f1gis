export function minMax(arr) {
    let m = Number.MAX_VALUE;
    let M = -Number.MAX_VALUE;
    for (let n of arr) {
        if (n < m) { m = n; }
        if (n > M) { M = n; }
    }
    return [m, M];
}

export function minMax2(arr) {
    let xx = arr.map(e => e[0]);
    let yy = arr.map(e => e[1]);
    return [
        minMax(xx),
        minMax(yy),
    ];
}

export function lerp(a, b, i) {
    return a * (1 - i) + b * i;
}

export function lerp2(a, b, i) {
    const I = 1 - i;
    return [a[0] * I + b[0] * i, a[1] * I + b[1] * i];
}
