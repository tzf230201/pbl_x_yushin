// Add more scans here.
// A-Frame uses meters. Rotation is in degrees: X Y Z.
const SCANS = [
  {
    id: "asahigaoka",
    name: "Asahigaoka GLB",
    file: "./public/assets/scans/Asahigaoka.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
    viewDistance: 1.7,
    cameraHeight: 0.85,
  },
  {
    id: "main",
    name: "Example main",
    file: "./public/assets/scan.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "duck",
    name: "Example duck",
    file: "./public/assets/scans/duck.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "box",
    name: "Example box",
    file: "./public/assets/scans/box.glb",
    position: "0 0.5 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "cesium-man",
    name: "Example Cesium man",
    file: "./public/assets/scans/cesium-man.glb",
    position: "0 0 0",
    rotation: "0 180 0",
    scale: "1 1 1",
  },
];

const loadingScreen = document.querySelector("#loading-screen");
const loadingMessage = document.querySelector("#loading-message");
const scanSelect = document.querySelector("#scan-select");
const scanModel = document.querySelector("#scan-model");
const cameraRig = document.querySelector("#rig");
const camera = document.querySelector("#camera");

function showLoadingScreen(scan) {
  loadingScreen.classList.remove("is-hidden");
  loadingMessage.textContent = `Loading ${scan.name}...`;
}

function hideLoadingScreen() {
  loadingScreen.classList.add("is-hidden");
}

function showLoadingError(scan) {
  const modelUrl = resolveModelUrl(scan.file);

  loadingMessage.textContent =
    `Could not load ${modelUrl}. Check that the GLB file exists and the page is served from a local or online web server.`;
}

function resolveModelUrl(file) {
  return new URL(file, document.baseURI).href;
}

function getScanFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const scanId = params.get("scan");

  return SCANS.find((scan) => scan.id === scanId) || SCANS[0];
}

function updateUrl(scan) {
  const url = new URL(window.location.href);
  url.searchParams.set("scan", scan.id);
  window.history.replaceState({}, "", url);
}

function applyScanTransform(scan) {
  scanModel.setAttribute("position", scan.position);
  scanModel.setAttribute("rotation", scan.rotation);
  scanModel.setAttribute("scale", scan.scale);
}

function setCameraAngle(pitchDeg, yawDeg = 0) {
  const lookControls = camera.components["look-controls"];
  const pitchRad = AFRAME.THREE.MathUtils.degToRad(pitchDeg);
  const yawRad = AFRAME.THREE.MathUtils.degToRad(yawDeg);

  if (lookControls) {
    lookControls.pitchObject.rotation.x = pitchRad;
    lookControls.yawObject.rotation.y = yawRad;
  }

  camera.object3D.rotation.set(pitchRad, yawRad, 0);
}

function frameCameraToModel(scan) {
  const box = new AFRAME.THREE.Box3().setFromObject(scanModel.object3D);

  if (box.isEmpty()) {
    cameraRig.setAttribute("position", "0 0 3");
    camera.setAttribute("position", "0 1.2 0");
    setCameraAngle(-18);
    return;
  }

  const size = new AFRAME.THREE.Vector3();
  const center = new AFRAME.THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxSize = Math.max(size.x, size.y, size.z, 0.25);
  const distance = scan.viewDistance || Math.max(maxSize * 1.45, 1.6);
  const cameraHeight = scan.cameraHeight || Math.max(center.y + maxSize * 0.25, 0.9);
  const targetHeight = center.y;
  const pitchDeg = AFRAME.THREE.MathUtils.radToDeg(
    Math.atan2(targetHeight - cameraHeight, distance),
  );

  cameraRig.setAttribute("position", `${center.x} 0 ${center.z + distance}`);
  camera.setAttribute("position", `0 ${cameraHeight} 0`);
  setCameraAngle(pitchDeg);
}

function loadScan(scan) {
  showLoadingScreen(scan);
  updateUrl(scan);
  applyScanTransform(scan);

  scanModel.object3D.visible = false;
  scanModel.removeAttribute("gltf-model");

  window.requestAnimationFrame(() => {
    scanModel.setAttribute("gltf-model", `url(${resolveModelUrl(scan.file)})`);
  });
}

function fillScanSelect() {
  SCANS.forEach((scan) => {
    const option = document.createElement("option");
    option.value = scan.id;
    option.textContent = scan.name;
    scanSelect.appendChild(option);
  });
}

fillScanSelect();

const firstScan = getScanFromUrl();
scanSelect.value = firstScan.id;

scanModel.addEventListener("model-loaded", () => {
  const scan = SCANS.find((item) => item.id === scanSelect.value) || SCANS[0];

  scanModel.object3D.visible = true;
  frameCameraToModel(scan);
  loadingMessage.textContent = "Scan loaded.";
  window.setTimeout(hideLoadingScreen, 250);
});

scanModel.addEventListener("model-error", () => {
  const scan = SCANS.find((item) => item.id === scanSelect.value) || SCANS[0];
  showLoadingError(scan);
});

scanSelect.addEventListener("change", () => {
  const scan = SCANS.find((item) => item.id === scanSelect.value) || SCANS[0];
  loadScan(scan);
});

loadScan(firstScan);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.exitPointerLock?.();
  }
});
