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
renderer.xr.enabled = true; // enable WebXR (AR) support

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

// ---- AR (WebXR) ----
const arBtn   = document.getElementById('arBtn');
const arHint  = document.getElementById('arHint');
const arExit  = document.getElementById('arExit');

// Placement reticle (a ring that snaps to detected surfaces)
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x4f9dff })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let hitTestSource = null;
let hitTestRequested = false;
let modelPlaced = false;
const savedModelState = { pos: new THREE.Vector3(), scale: new THREE.Vector3(), had: false };

// Show the AR button only if the device actually supports immersive AR
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    arBtn.hidden = !supported;
  }).catch(() => { arBtn.hidden = true; });
}

async function startAR() {
  if (!currentModel) {
    alert('Load a model first, then tap AR to place it in your space.');
    return;
  }
  try {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    await renderer.xr.setSession(session);
    session.addEventListener('end', onAREnd);
    onARStart();
  } catch (err) {
    console.error(err);
    alert('Could not start AR. Make sure you granted camera permission and your device supports ARCore.');
  }
}

function onARStart() {
  document.body.classList.add('in-ar');
  arHint.classList.remove('hidden');
  scene.background = null;   // let the camera feed show through
  grid.visible = false;
  modelPlaced = false;

  // Remember how the model looked in the normal viewer so we can restore later
  savedModelState.had = true;
  savedModelState.pos.copy(currentModel.position);
  savedModelState.scale.copy(currentModel.scale);

  // Hide the model until the user taps a surface to place it
  currentModel.visible = false;
}

function onAREnd() {
  document.body.classList.remove('in-ar');
  arHint.classList.add('hidden');
  scene.background = new THREE.Color(0x0e1116);
  grid.visible = true;
  reticle.visible = false;
  hitTestSource = null;
  hitTestRequested = false;

  if (currentModel && savedModelState.had) {
    currentModel.visible = true;
    currentModel.position.copy(savedModelState.pos);
    currentModel.scale.copy(savedModelState.scale);
  }
  resize();
}

// Tap in AR -> place / move the model onto the reticle
const arController = renderer.xr.getController(0);
arController.addEventListener('select', () => {
  if (!reticle.visible || !currentModel) return;
  currentModel.visible = true;
  currentModel.position.setFromMatrixPosition(reticle.matrix);
  modelPlaced = true;
});
scene.add(arController);

function updateHitTest(frame) {
  const session = renderer.xr.getSession();
  const refSpace = renderer.xr.getReferenceSpace();

  if (!hitTestRequested) {
    session.requestReferenceSpace('viewer').then((viewerSpace) => {
      session.requestHitTestSource({ space: viewerSpace }).then((source) => {
        hitTestSource = source;
      });
    });
    hitTestRequested = true;
  }

  if (hitTestSource) {
    const results = frame.getHitTestResults(hitTestSource);
    if (results.length > 0) {
      const pose = results[0].getPose(refSpace);
      reticle.visible = !modelPlaced; // hide reticle once placed
      reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      reticle.visible = false;
    }
  }
}

arBtn.addEventListener('click', startAR);
arExit.addEventListener('click', () => {
  const session = renderer.xr.getSession();
  if (session) session.end();
});

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
// setAnimationLoop drives both the normal viewer and the WebXR (AR) session.
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) updateHitTest(frame);   // frame is only present during an XR session
  if (!renderer.xr.isPresenting) controls.update();
  renderer.render(scene, camera);
});
