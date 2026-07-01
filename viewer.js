// Add more scans here.
// A-Frame uses meters. Rotation is in degrees: X Y Z.
const SCANS = [
  {
    id: "main",
    name: "Example main",
    file: "./public/assets/scan.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "0.01 0.01 0.01",
  },
  {
    id: "duck",
    name: "Example duck",
    file: "./public/assets/scans/duck.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "0.01 0.01 0.01",
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
  scanModel.object3D.visible = true;
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
