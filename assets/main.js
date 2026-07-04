import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

// ---- DOM ----
const canvas    = document.getElementById('scene');
const viewer    = document.getElementById('viewer');
const fileInput = document.getElementById('fileInput');
const dropHint  = document.getElementById('dropHint');
const loader    = document.getElementById('loader');
const modelName = document.getElementById('modelName');

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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
let currentEnvRT = pmrem.fromScene(new RoomEnvironment(), 0.04); // PMREM render target (lighting)
let currentBgTexture = null;                                     // equirect texture used as backdrop
let activeBackground = new THREE.Color(0x0e1116);               // background to restore after AR
scene.environment = currentEnvRT.texture;

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
      prepareUSDZ(); // pre-build USDZ for iOS AR Quick Look (no-op elsewhere)
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

// ---- Project model list (assets/glb-list.js) ----
const modelSelect = document.getElementById('modelSelect');
if (window.GLB_MODELS) {
  for (const [key, m] of Object.entries(window.GLB_MODELS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = m.label + ' (' + m.mb + ' MB)';
    modelSelect.appendChild(opt);
  }
}
function loadModelById(key) {
  const m = window.GLB_MODELS && window.GLB_MODELS[key];
  if (!m) return false;
  loadFromURL(window.GLB_BASE + encodeURIComponent(m.file), m.label);
  modelSelect.value = key;
  return true;
}
modelSelect.addEventListener('change', () => loadModelById(modelSelect.value));

// Deep link: index.html?model=asahigaoka
const startModel = new URL(window.location.href).searchParams.get('model');
if (startModel) loadModelById(startModel);

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

// ---- AR support detection ----
const camFeed    = document.getElementById('camFeed');
const arHintText = document.getElementById('arHintText');
const arAnchor   = document.getElementById('arAnchor');

// iPhone/iPad: no WebXR, but ARKit "AR Quick Look" gives true world-anchored AR
const isIOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let webxrARSupported = false;
// Camera + motion-sensor fallback: rotation-only "look around" for other phones
const canFallbackAR =
  window.isSecureContext &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  window.matchMedia('(pointer: coarse)').matches;

function refreshARButton() {
  arBtn.hidden = !(webxrARSupported || isIOS || canFallbackAR);
}

if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-ar')
    .then((supported) => { webxrARSupported = supported; refreshARButton(); })
    .catch(() => { refreshARButton(); });
} else {
  refreshARButton();
}

// ---- iOS AR Quick Look: export the current model to USDZ ahead of time ----
let usdzUrl = null;
let usdzBusy = false;

async function prepareUSDZ() {
  if (!isIOS || !currentModel) return;
  usdzBusy = true;
  try {
    currentModel.updateWorldMatrix(true, true);
    const exporter = new USDZExporter();
    const data = await exporter.parse(currentModel);
    if (usdzUrl) URL.revokeObjectURL(usdzUrl);
    const blob = new Blob([data], { type: 'model/vnd.usdz+zip' });
    usdzUrl = URL.createObjectURL(blob);
    arAnchor.setAttribute('href', usdzUrl);
  } catch (err) {
    console.error('USDZ export failed:', err);
    usdzUrl = null;
  } finally {
    usdzBusy = false;
  }
}

function startQuickLook() {
  if (usdzUrl) {
    arAnchor.click(); // launches ARKit Quick Look (system handles camera + tracking)
  } else if (usdzBusy) {
    alert('Preparing the AR model… please tap AR again in a moment.');
  } else {
    prepareUSDZ().then(() => {
      if (usdzUrl) arAnchor.click();
      else alert('Could not prepare this model for AR Quick Look.');
    });
  }
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
  scene.background = activeBackground;
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

// =====================================================================
//  Fallback AR: rear camera as background + device orientation (IMU)
//  Used when the device has no WebXR immersive-ar (e.g. iPhone/Safari).
// =====================================================================
let fallbackActive = false;
let camStream = null;
let deviceOrientation = null;
let screenOrient = 0;

// --- device-orientation → quaternion helper (standard three.js math) ---
const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

function setCameraFromSensors(quaternion, alpha, beta, gamma, orient) {
  _euler.set(beta, alpha, -gamma, 'YXZ');           // device euler
  quaternion.setFromEuler(_euler);
  quaternion.multiply(_q1);                          // camera looks out the back
  quaternion.multiply(_q0.setFromAxisAngle(_zee, -orient)); // adjust for screen rotation
}

function onDeviceOrientation(e) {
  deviceOrientation = e;
}
function onScreenOrientation() {
  screenOrient = THREE.MathUtils.degToRad(
    (screen.orientation && screen.orientation.angle) || window.orientation || 0
  );
}

// Place the model a comfortable distance in front of the viewer
function placeModelInFront() {
  const box = new THREE.Box3().setFromObject(currentModel);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const dist = (maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360))) * 1.6;
  currentModel.position.set(0, 0, -dist);
  currentModel.rotation.set(0, 0, 0);
}

async function startFallbackAR() {
  // 1) Motion-sensor permission FIRST — on iOS this must run inside the
  //    button's user gesture, before any other await, or it is rejected.
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') {
        alert('Motion-sensor permission was denied. You can still see the model, but it will not follow your phone. Enable Motion & Orientation Access in Safari settings to fix this.');
      }
    }
  } catch (e) {
    // Not fatal — continue with the camera even if motion permission fails.
    console.warn('Motion-sensor permission error:', e);
  }

  // 2) Rear camera
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch (err) {
    console.error('getUserMedia failed:', err);
    alert(
      'Could not access the camera (' + (err && err.name ? err.name : 'unknown error') + ').\n\n' +
      'Make sure camera permission is allowed for this site, that no other app is using the camera, ' +
      'and that the page is opened over HTTPS.'
    );
    stopFallbackAR();
    return;
  }

  camFeed.srcObject = camStream;
  try { await camFeed.play(); } catch (e) { /* iOS may defer play; ignore */ }

  // 3) Start listening to the motion sensors
  window.addEventListener('deviceorientation', onDeviceOrientation, true);
  onScreenOrientation();
  window.addEventListener('orientationchange', onScreenOrientation);

  // 4) Switch scene into AR mode
  fallbackActive = true;
  document.body.classList.add('in-ar', 'in-fallback-ar');
  arHintText.textContent = 'Move your phone around to view the model';
  arHint.classList.remove('hidden');
  scene.background = null;
  renderer.setClearAlpha(0);
  grid.visible = false;
  controls.enabled = false;

  savedModelState.had = true;
  savedModelState.pos.copy(currentModel.position);
  savedModelState.scale.copy(currentModel.scale);
  savedModelState.rot = currentModel.rotation.clone();
  placeModelInFront();
}

function stopFallbackAR() {
  fallbackActive = false;
  document.body.classList.remove('in-ar', 'in-fallback-ar');
  arHint.classList.add('hidden');

  window.removeEventListener('deviceorientation', onDeviceOrientation, true);
  window.removeEventListener('orientationchange', onScreenOrientation);
  deviceOrientation = null;

  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
  camFeed.srcObject = null;

  scene.background = activeBackground;
  renderer.setClearAlpha(1);
  grid.visible = true;
  controls.enabled = true;
  camera.quaternion.set(0, 0, 0, 1);

  if (currentModel && savedModelState.had) {
    currentModel.position.copy(savedModelState.pos);
    currentModel.scale.copy(savedModelState.scale);
    if (savedModelState.rot) currentModel.rotation.copy(savedModelState.rot);
    frameModel(currentModel);
  }
}

// Pinch to scale the model while in fallback AR
let pinchStart = 0;
let pinchBaseScale = 1;
viewer.addEventListener('touchstart', (e) => {
  if (fallbackActive && e.touches.length === 2 && currentModel) {
    pinchStart = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchBaseScale = currentModel.scale.x;
  }
}, { passive: true });
viewer.addEventListener('touchmove', (e) => {
  if (fallbackActive && e.touches.length === 2 && currentModel && pinchStart) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const s = THREE.MathUtils.clamp(pinchBaseScale * (d / pinchStart), 0.05, 50);
    currentModel.scale.setScalar(s);
  }
}, { passive: true });

// --- AR button routes to the best available mode ---
arBtn.addEventListener('click', () => {
  if (!currentModel) {
    alert('Load a model first, then tap AR.');
    return;
  }
  if (webxrARSupported) startAR();          // Android + ARCore: full WebXR AR
  else if (isIOS) startQuickLook();         // iPhone/iPad: ARKit AR Quick Look
  else startFallbackAR();                   // others: rotation-only look-around
});
arExit.addEventListener('click', () => {
  const session = renderer.xr.getSession();
  if (session) session.end();
  if (fallbackActive) stopFallbackAR();
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

// =====================================================================
//  Environment / lighting presets (HDRI) + custom HDR upload
// =====================================================================
const envSelect = document.getElementById('envSelect');
const hdrInput  = document.getElementById('hdrInput');
const rgbeLoader = new RGBELoader();

// Poly Haven HDRIs hosted via the pmndrs/drei-assets CDN (same set drei uses)
const HDRI_BASE = 'https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/';
const HDRI_FILES = {
  sunset:    'venice_sunset_1k.hdr',
  dawn:      'kiara_1_dawn_1k.hdr',
  night:     'dikhololo_night_1k.hdr',
  warehouse: 'empty_warehouse_01_1k.hdr',
  forest:    'forest_slope_1k.hdr',
  apartment: 'lebombo_1k.hdr',
  park:      'rooitou_park_1k.hdr',
  city:      'potsdamer_platz_1k.hdr',
  lobby:     'st_fagans_interior_1k.hdr',
};

function inAR() {
  return renderer.xr.isPresenting || fallbackActive;
}

function disposeEnv() {
  if (currentEnvRT) { currentEnvRT.dispose(); currentEnvRT = null; }
  if (currentBgTexture) { currentBgTexture.dispose(); currentBgTexture = null; }
}

// Built-in studio lighting (instant, no download), clean dark background
function setStudioEnv() {
  const rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
  disposeEnv();
  currentEnvRT = rt;
  scene.environment = rt.texture;
  activeBackground = new THREE.Color(0x0e1116);
  if (!inAR()) scene.background = activeBackground;
  envSelect.disabled = false;
}

// Load an equirectangular .hdr and use it for both lighting and backdrop
function setHDREnv(url, { revoke = false } = {}) {
  envSelect.disabled = true;
  loader.classList.remove('hidden');
  rgbeLoader.load(
    url,
    (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const rt = pmrem.fromEquirectangular(tex);
      disposeEnv();
      currentEnvRT = rt;
      currentBgTexture = tex;
      scene.environment = rt.texture;
      activeBackground = tex;              // show the HDRI as the background
      if (!inAR()) scene.background = activeBackground;
      loader.classList.add('hidden');
      envSelect.disabled = false;
      if (revoke) URL.revokeObjectURL(url);
    },
    undefined,
    (err) => {
      console.error('HDR load failed:', err);
      loader.classList.add('hidden');
      envSelect.disabled = false;
      alert('Failed to load the HDR environment (check your connection or the file).');
    }
  );
}

let lastEnvValue = 'studio';
envSelect.addEventListener('change', () => {
  const val = envSelect.value;
  if (val === '__upload') {
    envSelect.value = lastEnvValue; // revert; real choice happens after file picked
    hdrInput.click();
    return;
  }
  lastEnvValue = val;
  if (val === 'studio') setStudioEnv();
  else if (HDRI_FILES[val]) setHDREnv(HDRI_BASE + HDRI_FILES[val]);
});

hdrInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  setHDREnv(url, { revoke: true });
  // Reflect the custom choice in the dropdown
  let opt = envSelect.querySelector('option[value="__custom"]');
  if (!opt) {
    opt = document.createElement('option');
    opt.value = '__custom';
    envSelect.insertBefore(opt, envSelect.querySelector('option[value="__upload"]'));
  }
  opt.textContent = 'Custom: ' + file.name;
  envSelect.value = '__custom';
  lastEnvValue = '__custom';
  hdrInput.value = ''; // allow re-selecting the same file later
});

// ---- Render loop ----
// setAnimationLoop drives the normal viewer, the WebXR session, and fallback AR.
const _sensorTarget = new THREE.Quaternion();
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) updateHitTest(frame);   // frame is only present during a WebXR session

  if (fallbackActive) {
    // Drive the camera from the phone's motion sensors (IMU), smoothed:
    // a small deadband plus slerp low-pass damps gyro jitter so the
    // scene holds still when the phone isn't moving.
    if (deviceOrientation) {
      const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha || 0);
      const beta  = THREE.MathUtils.degToRad(deviceOrientation.beta  || 0);
      const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma || 0);
      setCameraFromSensors(_sensorTarget, alpha, beta, gamma, screenOrient);
      const angle = camera.quaternion.angleTo(_sensorTarget);
      if (angle > 0.002) {
        camera.quaternion.slerp(_sensorTarget, Math.min(1, 0.12 + angle * 2));
      }
    }
  } else if (!renderer.xr.isPresenting) {
    controls.update();
  }

  renderer.render(scene, camera);
});
