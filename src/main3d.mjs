import * as THREE from '../external/three.mjs';
import { OrbitControls } from '../external/OrbitControls.mjs';

// https://threejs.org/docs/

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const helper = new THREE.GridHelper(16, 10);
scene.add(helper);

const light = new THREE.PointLight(0xff0000, 1, 100);
light.position.set(20, 30, 0);
scene.add(light);

const geometry = new THREE.BoxGeometry();

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

const animate = function () {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;
    controls.update();
    renderer.render(scene, camera);
};

animate();
