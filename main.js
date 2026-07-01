import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---- DOM ----
const canvas    = document.getElementById('scene');
const viewer    = document.getElementById('viewer');
const fileInput = document.getElementById('fileInput');
const dropHint  = document.getElementById('dropHint');
const loader    = document.getElementById('loader');
const modelName = document.getElementById('modelName');

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);

// Environment lighting (soft, studio-like) so models look good without manual lights
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// A subtle grid floor for spatial reference
const grid = new THREE.GridHelper(20, 20, 0x2a3340, 0x1b2029);
grid.material.transparent = true;
grid.material.opacity = 0.4;
scene.add(grid);

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
camera.position.set(3, 2, 4);

// ---- Controls ----
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.1;
controls.maxDistance = 100;
controls.target.set(0, 0, 0);

// ---- Loader ----
const gltfLoader = new GLTFLoader();
let currentModel = null;

function clearModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    currentModel = null;
  }
}

// Frame the loaded model: center it and place the camera at a good distance
function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Recenter model on origin
  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fitDist = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
  const dist = fitDist * 1.6;

  camera.position.set(dist * 0.7, dist * 0.5, dist);
  camera.near = maxDim / 100;
  camera.far  = maxDim * 100;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = maxDim * 0.1;
  controls.maxDistance = maxDim * 10;
  controls.update();

  // Move grid to the bottom of the model
  grid.position.y = -size.y / 2;
}

function loadFromURL(url, name) {
  loader.classList.remove('hidden');
  dropHint.classList.add('hidden');

  gltfLoader.load(
    url,
    (gltf) => {
      clearModel();
      currentModel = gltf.scene;
      scene.add(currentModel);
      frameModel(currentModel);
      modelName.textContent = name || 'model.glb';
      loader.classList.add('hidden');
      URL.revokeObjectURL(url);
    },
    undefined,
    (err) => {
      console.error(err);
      loader.classList.add('hidden');
      alert('Failed to load model. Make sure it is a valid .glb / .gltf file.');
    }
  );
}

function loadFromFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  loadFromURL(url, file.name);
}

// ---- File input ----
fileInput.addEventListener('change', (e) => {
  loadFromFile(e.target.files[0]);
});

// ---- Drag & drop ----
['dragenter', 'dragover'].forEach((ev) =>
  viewer.addEventListener(ev, (e) => {
    e.preventDefault();
    viewer.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  viewer.addEventListener(ev, (e) => {
    e.preventDefault();
    viewer.classList.remove('dragover');
  })
);
viewer.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && /\.(glb|gltf)$/i.test(file.name)) loadFromFile(file);
});

// ---- Zoom buttons ----
function dolly(scale) {
  // Move camera toward/away from the target
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  const newDist = THREE.MathUtils.clamp(
    dir.length() * scale,
    controls.minDistance,
    controls.maxDistance
  );
  dir.setLength(newDist);
  camera.position.copy(controls.target).add(dir);
  controls.update();
}

document.getElementById('zoomIn').addEventListener('click', () => dolly(0.8));
document.getElementById('zoomOut').addEventListener('click', () => dolly(1.25));
document.getElementById('reset').addEventListener('click', () => {
  if (currentModel) frameModel(currentModel);
});

// ---- Fullscreen ----
const appEl = document.getElementById('app');

function isFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

// Running as an installed PWA (home-screen app)? Then there are no browser bars.
const isStandalone =
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function toggleFullscreen() {
  if (isFullscreen()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }
  const req = appEl.requestFullscreen || appEl.webkitRequestFullscreen;
  if (req) {
    req.call(appEl);
  } else if (!isStandalone) {
    // Mainly iOS Safari: web pages can't force-hide the browser bars.
    alert(
      'Your browser (likely iOS Safari) does not support forced fullscreen.\n\n' +
      'For a true full-screen experience, tap the Share button and choose ' +
      '"Add to Home Screen", then open the app from your home screen.'
    );
  }
}

function updateFullscreenUI() {
  const on = !!isFullscreen();
  document.body.classList.toggle('is-fullscreen', on);
  const label = document.querySelector('.fs-label');
  if (label) label.textContent = on ? 'Exit' : 'Fullscreen';
}

const fsButton = document.getElementById('fullscreen');
if (isStandalone) fsButton.style.display = 'none';
fsButton.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => { updateFullscreenUI(); resize(); });
document.addEventListener('webkitfullscreenchange', () => { updateFullscreenUI(); resize(); });

// ---- Resize ----
function resize() {
  const w = viewer.clientWidth;
  const h = viewer.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---- Render loop ----
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
