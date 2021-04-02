const π = Math.PI;
const π2 = 2 * Math.PI;
const TILE_DIM = 256;
const RAD2DEG = 180 / π;
const DEG2RAD = π / 180;

function seq(n) {
    const arr = new Array(n);
    for (let i = 0; i < n; ++i) {
        arr[i] = i;
    }
    return arr;
};

// zoom 0 -> 2^0 = 1 by 1 tiles of 256x256
// zoom 17 -> 2^17 = Math.pow(2, 17) = 131072 by 131072
const powersOf2 = seq(30).map((i) => {
    return Math.pow(2, i);
});

// input:
// lat [-85.05112877980659, 85.0511287798066]
// lon [-180, 180]
// output:
// x: [-π, π]
// y: [-π ,π]
function project1([lon, lat]) {
    const λ = (π * lon) / 180,
        φ = (π * lat) / 180;
    return [
        λ,
        Math.log(Math.tan(π / 4 + φ / 2))
    ];
};

// input:
// x: [-π, π]
// y: [-π, π]
// output:
// x: [0, 1]
// y: [0, 1]
function project2([x, y]) {
    return [
        (x + π) / π2,
        (y + π) / π2
    ];
};

// input [0, 1] [0, 1]
// pixels!
function project3([x, y], zoom) {
    const tilesPerDim = powersOf2[zoom];
    return [
        x * tilesPerDim * TILE_DIM,
        y * tilesPerDim * TILE_DIM
    ];
};

// [lat, lon], zoom -> [x, y]
function project(loc, zoom) {
    return project3(project2(project1(loc)), zoom);
};

export function projectFactory(zoom) {
    return function pr(xyPair) {
        const [x, y] = project(xyPair, zoom);
        return [x, - y];
    }
}

const RK = 6373; // mean radius of the earth (km) at 39 degrees from the equator

export function distance(a, b) {
    // convert coordinates to radians
    const lat1 = DEG2RAD * a.lat;
    const lon1 = DEG2RAD * a.lon;
    const lat2 = DEG2RAD * b.lat;
    const lon2 = DEG2RAD * b.lon;

    // find the differences between the coordinates
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    // here's the heavy lifting
    const aa = Math.pow(
        Math.sin(dlat / 2),
        2
    ) +
        Math.pow(
            Math.sin(dlon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2),
            2
        );

    const c = 2 * Math.atan2(
        Math.sqrt(aa),
        Math.sqrt(1 - aa)
    ); // great circle distance in radians

    return c * RK; // great circle distance in km
}
