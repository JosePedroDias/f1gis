import * as THREE from '../external/three.mjs';
import { OrbitControls } from '../external/OrbitControls.mjs';
//import { OBJExporter } from '../external/OBJExporter.mjs';

import { parseTrack, RT_POINT_TAG_CURVE, RT_POINT_TAG_LABEL, RT_HEIGHT } from './parseTrack.mjs';

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

const textLabels = [];

window.addEventListener('hashchange', () => location.reload());

function convertPoint(p) {
    if (p.length === 2) {
        return [p[0] * S, 0, p[1] * S];
    } else if (p.length === 3) {
        return [p[0] * S, p[1] * S, p[2] * S];
    } else {
        throw new Error('Wrong number of coords!');
    }

}

function createTextLabel() {
    const div = document.createElement('div');
    div.className = 'text-label';
    div.style.position = 'absolute';
    div.innerHTML = 'label';
    div.style.display = 'none';

    return {
        element: div,
        parent: false,
        position: new THREE.Vector3(0, 0, 0),
        setHTML(html) {
            this.element.innerHTML = html;
        },
        setParent(parObj) {
            this.parent = parObj;
        },
        updatePosition(camera) {
            if (parent) {
                this.position.copy(this.parent.position);
            }

            const c2d = this.get2DCoords(this.position, camera);

            if (c2d.visible) {
                if (this.element.style.display === 'none') {
                    this.element.style.display = '';
                }
                this.element.style.left = c2d.x.toFixed(1) + 'px';
                this.element.style.top = c2d.y.toFixed(1) + 'px';
            } else {
                this.element.style.display = 'none';
            }
        },
        get2DCoords(position, camera) {
            const vector = position.project(camera);
            vector.visible = vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1;
            vector.x = (vector.x + 1) / 2 * window.innerWidth;
            vector.y = -(vector.y - 1) / 2 * window.innerHeight;
            return vector;
        }
    };
}

function throughSpline(points_, closed) {
    const points = points_.map(p_ => {
        const p = convertPoint(p_);
        return new THREE.Vector3(p[0], p[1], p[2]);
    });
    const spline = new THREE.CatmullRomCurve3(points);
    spline.curveType = 'centripetal'; // centripetal, chordal, catmullrom
    spline.closed = closed;
    //spline.tension = // only relevant for CMR
    //const segments = tubeGeometry.tangents.length;
    //https://threejs.org/docs/#api/en/extras/core/Curve getPoints getSpacedPoints getPointAt getTangentAt
    //spline.computeFrenetFrames(); // fails
    const out1 = spline.getPoints(points.length * 2);
    /* const l2 = points.length * 2;
    const out1 = [];
    for (let i = 0; i <= l2; ++i) {
        out1.push(spline.getPointAt(i / l2));
    } */
    const out2 = out1.map(({ x, y, z }) => [x, y, z]);
    return out2;
}

function generateRailGeometry(leftRail, rightRail, closed, scene) {
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
        const crossSize = [
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

function generateLineGeometry(centerRail, pointProperties, closed, scene) {
    const points = [];
    centerRail.forEach((p) => {
        const [x, y, z] = convertPoint(p);
        points.push(new THREE.Vector3(x, 0, z));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    points.forEach((p, i) => {
        const props = pointProperties[i];
        const hasLabel = props[RT_POINT_TAG_CURVE] || props[RT_HEIGHT]; // RT_HEIGHT RT_POINT_TAG_CURVE RT_POINT_TAG_LABEL
        if (!hasLabel) { return; }
        const label = `c${props[RT_POINT_TAG_CURVE] || `#${i}`} ${props[RT_HEIGHT] ? `${props[RT_HEIGHT]}m` : '--'}`;

        const group = new THREE.Group();
        group.position.set(p.x, p.y, p.z);
        scene.add(group);

        const text = createTextLabel();
        text.setHTML(label);
        text.setParent(group);
        textLabels.push(text);
        document.body.appendChild(text.element);
    });

    return geometry;
}

async function run() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(30, 30);
    scene.add(gridHelper);

    const ambLight = new THREE.AmbientLight(0x404040);
    scene.add(ambLight);

    const pointLight = new THREE.PointLight(0xffffff, 3, 300, 2);
    pointLight.position.set(100, 100, 50);
    scene.add(pointLight);

    const pointLightHelper = new THREE.PointLightHelper(pointLight, 1);
    scene.add(pointLightHelper);

    const mapName = location.hash?.substring(1) || 'portimao.2d.rt.geojson';
    const data = await parseTrack(`./assets/tracks/${mapName}`, { zoom: ZOOM });
    console.log('data', data);
    window.data = data;

    const trackGroup = new THREE.Group();

    const lambertMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const lambertMat2 = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, opacity: 0.75, wireframe: true, transparent: false });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });

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
    // TODO sectors, drs, colors
    parts = [
        data.pitStop,
        data.startingGrid
    ];
    for (let bag of parts) {
        for (let p_ of [bag.start, bag.finish]) {
            if (!p_) { break; }
            const p = convertPoint(p_)
            const geometry = new THREE.SphereGeometry(0.04, 16, 16);
            const mesh = new THREE.Mesh(geometry, lambertMat2);
            mesh.position.set(...p);
            trackGroup.add(mesh);

            // TODO add directions to startingGrid?
        }
    }

    parts = [
        [data.track.center, data.track.pointProperties, true, scene],
        //[data.pit.center, data.pit.pointProperties, false, scene]
    ];
    for (let params of parts) {
        const geometry = generateLineGeometry(...params);
        const line = new THREE.Line(geometry, lineMat);
        trackGroup.add(line);
    }

    scene.add(trackGroup);

    /* const oe = new OBJExporter();
    const obj = oe.parse(mesh);
    console.log(obj); */

    camera.position.y = 3;
    camera.position.z = 5;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();


    let lastSecond = -1;
    function animate(tMs) {
        let second = Math.floor(tMs / 100);
        requestAnimationFrame(animate);
        //trackGroup.rotation.x += 0.005;
        //trackGroup.rotation.y += 0.01;
        controls.update();

        lastSecond !== second && textLabels.forEach(tl => {
            tl.updatePosition(camera);
        });

        renderer.render(scene, camera);

        lastSecond = second;
    };

    animate();
}

run();
