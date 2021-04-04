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

const ZOOM = 16;

function generateRailGeometry(leftRail, rightRail, loops) {
    const geometry = new THREE.BufferGeometry();

    const rails = [leftRail, rightRail];

    const waySize = leftRail.length;

    if (rightRail.length !== waySize) { throw new Error('rails should be sized the same!'); }

    const crossSectionSize = 2;

    //const indicesSize = waySize * crossSectionSize;
    //const trisSize = (waySize - (loops ? 2 : 1)) * (crossSectionSize - 1) * 2;

    const vertices = [];
    const indices = [];

    const S = 1 / 40;

    // vertices
    for (let wi = 0; wi < waySize; ++wi) {
        const p0 = rails[0][wi];
        const p1 = rails[1][wi];
        const crossSize = [ // TODO: injecting Y for now
            [p0[0] * S, 0, p0[1] * S],
            [p1[0] * S, 0, p1[1] * S]
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

    //console.log('vertices', vertices);
    //console.log('indices', indices);

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
}

// -COLOR -SIZE
const VERTEX_SHADER = `attribute float size;
varying vec3 vColor;
void main() {
    vColor = vec3(1.0, 1.0, 1.0); // was color
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_PointSize = 1.0 * ( 300.0 / -mvPosition.z ); // size ~ 10
    gl_Position = projectionMatrix * mvPosition;
}`;

const FRAGMENT_SHADER = `uniform sampler2D pointTexture;
varying vec3 vColor;
void main() {
    gl_FragColor = vec4( vColor, 1.0 );
    gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
}`;

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

    const geometry = generateRailGeometry(data.track.left, data.track.right, true);

    /* const uniforms = {
        pointTexture: { value: new THREE.TextureLoader().load('./assets/textures/spark1.png') }
    };

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    });

    const mesh = new THREE.Points(geometry, shaderMaterial);
    scene.add(mesh);*/

    const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
    const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, wireframe: true, transparent: true });

    const mesh = new THREE.Mesh(geometry, material);
    const mesh2 = new THREE.Mesh(geometry, material2);

    mesh.add(mesh2);
    scene.add(mesh);

    /* const oe = new OBJExporter();
    const obj = oe.parse(mesh);
    console.log(obj); */

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
