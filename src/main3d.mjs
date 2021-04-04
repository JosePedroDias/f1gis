import * as THREE from '../external/three.mjs';
import { OrbitControls } from '../external/OrbitControls.mjs';

import { parseTrack } from './parseTrack.mjs';

// https://threejs.org/docs
// TODO https://threejs.org/docs/index.html#api/en/lights/shadows/DirectionalLightShadow
// TODO https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry.html
// https://threejs.org/examples/#webgl_buffergeometry_indexed
// https://threejs.org/examples/#webgl_buffergeometry
// TODO https://threejs.org/examples/#physics_ammo_rope

const ZOOM = 16;

function generateGeometry() {
    const geometry = new THREE.BufferGeometry();

    const indices = [];
    const vertices = [];
    const normals = [];

    const size = 2;
    const segments = 2;

    const halfSize = size / 2;
    const segmentSize = size / segments;

    // generate vertices, normals and color data for a simple grid geometry
    for (let i = 0; i <= segments; i++) {
        const z = (i * segmentSize) - halfSize;

        for (let j = 0; j <= segments; j++) {
            const x = (j * segmentSize) - halfSize;
            vertices.push(x, 0, z);
            normals.push(0, 1, 0);
        }
    }

    // generate indices (data for element array buffer)
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + (j + 1);
            const b = i * (segments + 1) + j;
            const c = (i + 1) * (segments + 1) + j;
            const d = (i + 1) * (segments + 1) + (j + 1);

            // generate two faces (triangles) per iteration
            indices.push(a, b, d); // face one
            indices.push(b, c, d); // face two
        }
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    //geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

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

    const light = new THREE.PointLight(0xff0000, 1, 100);
    light.position.set(20, 30, 0);
    scene.add(light);

    const mapName = location.hash?.substring(1) || 'portimao.2d.rt.geojson';
    const data = await parseTrack(`./assets/tracks/${mapName}`, { zoom: ZOOM });

    //const geometry = new THREE.BoxGeometry();
    const geometry = generateGeometry(data);

    const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
    const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, wireframe: true, transparent: true });

    const mesh = new THREE.Mesh(geometry, material);
    const mesh2 = new THREE.Mesh(geometry, material2);

    mesh.add(mesh2);
    scene.add(mesh);

    camera.position.y = 3;
    camera.position.z = 5;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    function animate() {
        requestAnimationFrame(animate);
        //mesh.rotation.x += 0.005;
        //mesh.rotation.y += 0.01;
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
}

run();
