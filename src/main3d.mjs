import * as THREE from '../external/three.mjs';
import { OrbitControls } from '../external/OrbitControls.mjs';
//import { OBJExporter } from '../external/OBJExporter.mjs';

import { parseTrack } from './parseTrack.mjs';

// https://threejs.org/docs
// TODO https://threejs.org/docs/index.html#api/en/lights/shadows/DirectionalLightShadow
// TODO https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry.html
// https://threejs.org/examples/#webgl_buffergeometry_indexed
// https://threejs.org/examples/#webgl_buffergeometry
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometries_parametric.html
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_extrude_shapes.html https://threejs.org/examples/#webgl_geometry_extrude_shapes
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_extrude_splines.html https://threejs.org/examples/#webgl_geometry_extrude_splines
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_custom_attributes_particles.html
// TODO https://threejs.org/examples/#physics_ammo_rope
// https://threejs.org/docs/#api/en/helpers/ArrowHelper
// https://threejs.org/docs/?q=helper#api/en/helpers/AxesHelper

const ZOOM = 16;
const S = 1 / 40;

function convertPoint([x, z]) {
    return [x * S, 0, z * S];
}

function throughSpline(points, closed) {
    const spline = new THREE.CatmullRomCurve3(points.map(p_ => {
        const p = convertPoint(p_);
        return new THREE.Vector3(p[0], p[1], p[2]);
    }));
    //spline.curveType = 'catmullrom'; // centripetal, chordal, catmullrom
    //spline.tension = // only relevant for CMR
    spline.closed = closed;
    //const segments = tubeGeometry.tangents.length;
    //https://threejs.org/docs/#api/en/extras/core/Curve
    const out = spline.getPoints(points.length * 2 + 1).map(({ x, y, z }) => [x, y, z]);
    return out;
}

function generateRailGeometry(leftRail, rightRail, closed) {
    const geometry = new THREE.BufferGeometry();

    const rails = [leftRail, rightRail];//.map(points => throughSpline(points, closed));

    const waySize = leftRail.length;

    if (rightRail.length !== waySize) { throw new Error('rails should be sized the same!'); }

    const crossSectionSize = 2;

    const vertices = [];
    const indices = [];

    // vertices
    for (let wi = 0; wi < waySize; ++wi) {
        const p0 = rails[0][wi];
        const p1 = rails[1][wi];
        const crossSize = [ // TODO: injecting Y for now
            convertPoint(p0), convertPoint(p1)
        ];
        for (let csi = 0; csi < crossSectionSize; ++csi) {
            const p = crossSize[csi];
            vertices.push(p[0], p[1], p[2]);
        }
    }

    // indices
    for (let wi = 0; wi < waySize - 1; ++wi) {
        const a = wi * crossSectionSize;
        const b = a + 1;
        const c = a + crossSectionSize;
        const d = b + crossSectionSize;
        indices.push(a, d, c);
        indices.push(a, b, d);
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
}

async function run() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const helper = new THREE.GridHelper(10, 10);
    scene.add(helper);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(20, 30, 0);
    scene.add(light);

    const mapName = location.hash?.substring(1) || 'portimao.2d.rt.geojson';
    const data = await parseTrack(`./assets/tracks/${mapName}`, { zoom: ZOOM });
    //console.log('data', data);

    const trackGroup = new THREE.Group();

    const lambertMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, wireframe: true, transparent: true });

    // track parts
    let parts = [
        [data.track.left, data.track.right, true],
        [data.pit.left, data.pit.right, false]
    ];
    for (let params of parts) {
        const geometry = generateRailGeometry(...params);
        const mesh = new THREE.Mesh(geometry, lambertMat);
        mesh.add(new THREE.Mesh(geometry, wireMat));
        trackGroup.add(mesh);
    }

    // positions
    parts = [
        data.pitStop,
        data.startingGrid
    ];
    for (let points of parts) {
        for (let p_ of points) {
            const p = convertPoint(p_)
            const geometry = new THREE.SphereGeometry(0.02, 16, 16);
            const mesh = new THREE.Mesh(geometry, lambertMat);
            mesh.position.set(p[0], p[1], p[2]);
            //mesh.add(new THREE.Mesh(geometry, wireMat));
            trackGroup.add(mesh);

            // TODO add directions to startingGrid?
        }
    }

    // TODO checkpoints

    scene.add(trackGroup);

    /* const oe = new OBJExporter();
    const obj = oe.parse(mesh);
    console.log(obj); */

    camera.position.y = 3;
    camera.position.z = 5;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    function animate() {
        requestAnimationFrame(animate);
        //trackGroup.rotation.x += 0.005;
        //trackGroup.rotation.y += 0.01;
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
}

run();
