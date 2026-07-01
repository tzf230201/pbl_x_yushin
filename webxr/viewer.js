const urlParams = new URLSearchParams(window.location.search);
const requestedScanId = urlParams.get("scan");

// Add project scans here.
// A-Frame uses meters. Rotation is in degrees: X Y Z.
const PROJECT_SCANS = [
  {
    id: "asahigaoka",
    name: "Asahigaoka GLB",
    file: "../public/assets/scans/Asahigaoka.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
    viewDistance: 1.7,
    cameraHeight: 0.85,
  },
];

const SAMPLE_SCANS = [
  {
    id: "main",
    name: "Example main",
    file: "../public/assets/scan.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "duck",
    name: "Example duck",
    file: "../public/assets/scans/duck.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "box",
    name: "Example box",
    file: "../public/assets/scans/box.glb",
    position: "0 0.5 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
  {
    id: "cesium-man",
    name: "Example Cesium man",
    file: "../public/assets/scans/cesium-man.glb",
    position: "0 0 0",
    rotation: "0 180 0",
    scale: "1 1 1",
  },
];

const showSampleModels =
  urlParams.has("samples") || SAMPLE_SCANS.some((scan) => scan.id === requestedScanId);
const SCANS = showSampleModels ? [...PROJECT_SCANS, ...SAMPLE_SCANS] : PROJECT_SCANS;

const loadingScreen = document.querySelector("#loading-screen");
const loadingMessage = document.querySelector("#loading-message");
const scanSelect = document.querySelector("#scan-select");
const scanModel = document.querySelector("#scan-model");
const cameraRig = document.querySelector("#rig");
const camera = document.querySelector("#camera");
const navButtons = document.querySelectorAll("[data-nav-action]");

const MOVEMENT_SPEED = 0.22;
const VERTICAL_SPEED = 0.4;
const TURN_SPEED = 0.75;
const GAMEPAD_DEADZONE = 0.18;
const PINCH_MOVE_SPEED = 0.006;

const pressedKeys = new Set();
const activeNavActions = new Set();
let currentScan = SCANS[0];
let lastFrameTime = 0;
let lastPinchDistance = 0;

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
  currentScan = scan;
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
currentScan = firstScan;

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

function getKeyAction(event) {
  const key = event.key.toLowerCase();

  if (key === "w" || event.key === "ArrowUp") return "forward";
  if (key === "s" || event.key === "ArrowDown") return "backward";
  if (key === "a" || event.key === "ArrowLeft") return "left";
  if (key === "d" || event.key === "ArrowRight") return "right";
  if (key === "e" || key === " " || event.key === "PageUp") return "up";
  if (key === "q" || key === "shift" || event.key === "PageDown") return "down";
  if (key === "r") return "reset";

  return "";
}

function shouldIgnoreKeyboardEvent(event) {
  const tagName = event.target?.tagName?.toLowerCase();
  return tagName === "input" || tagName === "select" || tagName === "textarea";
}

function addNavAction(action) {
  if (action === "reset") {
    frameCameraToModel(currentScan);
    return;
  }

  activeNavActions.add(action);
  document
    .querySelectorAll(`[data-nav-action="${action}"]`)
    .forEach((button) => button.classList.add("is-active"));
}

function removeNavAction(action) {
  activeNavActions.delete(action);
  document
    .querySelectorAll(`[data-nav-action="${action}"]`)
    .forEach((button) => button.classList.remove("is-active"));
}

function readDigitalInput() {
  const input = { forward: 0, right: 0, up: 0, turn: 0 };
  const actions = new Set([...pressedKeys, ...activeNavActions]);

  if (actions.has("forward")) input.forward += 1;
  if (actions.has("backward")) input.forward -= 1;
  if (actions.has("right")) input.right += 1;
  if (actions.has("left")) input.right -= 1;
  if (actions.has("up")) input.up += 1;
  if (actions.has("down")) input.up -= 1;

  return input;
}

function applyDeadzone(value) {
  return Math.abs(value) > GAMEPAD_DEADZONE ? value : 0;
}

function readGamepadInput(input) {
  const gamepads = navigator.getGamepads?.() || [];
  let activePadIndex = 0;

  gamepads.forEach((gamepad) => {
    if (!gamepad || !gamepad.connected) return;

    const axes = gamepad.axes || [];
    const id = gamepad.id.toLowerCase();
    const x = applyDeadzone(axes.length >= 4 ? axes[2] : axes[0] || 0);
    const y = applyDeadzone(axes.length >= 4 ? axes[3] : axes[1] || 0);
    const isRightHand = id.includes("right") || (!id.includes("left") && activePadIndex % 2 === 1);

    if (isRightHand) {
      input.up += -y;
      input.turn += x;
    } else {
      input.right += x;
      input.forward += -y;
    }

    activePadIndex += 1;
  });
}

function clampInput(input) {
  input.forward = Math.max(-1, Math.min(1, input.forward));
  input.right = Math.max(-1, Math.min(1, input.right));
  input.up = Math.max(-1, Math.min(1, input.up));
  input.turn = Math.max(-1, Math.min(1, input.turn));
}

function turnCamera(amount, deltaSeconds) {
  if (!amount) return;

  const lookControls = camera.components["look-controls"];
  const yawDelta = -amount * TURN_SPEED * deltaSeconds;

  if (lookControls) {
    lookControls.yawObject.rotation.y += yawDelta;
  } else {
    camera.object3D.rotation.y += yawDelta;
  }
}

function getCameraForward() {
  const forward = new AFRAME.THREE.Vector3();

  camera.object3D.getWorldDirection(forward);

  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1);
  } else {
    forward.normalize();
  }

  return forward;
}

function moveAlongView(distance) {
  cameraRig.object3D.position.addScaledVector(getCameraForward(), distance);
}

function moveCameraRig(input, deltaSeconds) {
  const forward = getCameraForward();
  const cameraQuaternion = new AFRAME.THREE.Quaternion();

  camera.object3D.getWorldQuaternion(cameraQuaternion);

  const right = new AFRAME.THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
  right.y = 0;

  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }

  const movement = new AFRAME.THREE.Vector3();

  movement.addScaledVector(forward, input.forward * MOVEMENT_SPEED * deltaSeconds);
  movement.addScaledVector(right, input.right * MOVEMENT_SPEED * deltaSeconds);
  movement.y += input.up * VERTICAL_SPEED * deltaSeconds;

  cameraRig.object3D.position.add(movement);
}

function navigationLoop(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000 || 0, 0.05);
  lastFrameTime = timestamp;

  if (camera?.object3D && cameraRig?.object3D) {
    const input = readDigitalInput();
    readGamepadInput(input);
    clampInput(input);
    turnCamera(input.turn, deltaSeconds);
    moveCameraRig(input, deltaSeconds);
  }

  window.requestAnimationFrame(navigationLoop);
}

navButtons.forEach((button) => {
  const action = button.dataset.navAction;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    addNavAction(action);
  });

  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    button.releasePointerCapture?.(event.pointerId);
    removeNavAction(action);
  });

  button.addEventListener("pointercancel", () => removeNavAction(action));
  button.addEventListener("pointerleave", () => removeNavAction(action));
});

function getTouchDistance(touches) {
  const [firstTouch, secondTouch] = touches;
  const deltaX = secondTouch.clientX - firstTouch.clientX;
  const deltaY = secondTouch.clientY - firstTouch.clientY;

  return Math.hypot(deltaX, deltaY);
}

window.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      lastPinchDistance = getTouchDistance(event.touches);
    }
  },
  { passive: false },
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length !== 2) return;

    event.preventDefault();

    const nextDistance = getTouchDistance(event.touches);
    const distanceDelta = nextDistance - lastPinchDistance;
    lastPinchDistance = nextDistance;

    moveAlongView(distanceDelta * PINCH_MOVE_SPEED);
  },
  { passive: false },
);

window.addEventListener("touchend", (event) => {
  if (event.touches.length < 2) {
    lastPinchDistance = 0;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.exitPointerLock?.();
    return;
  }

  if (shouldIgnoreKeyboardEvent(event)) {
    return;
  }

  const action = getKeyAction(event);

  if (action) {
    event.preventDefault();

    if (action === "reset") {
      frameCameraToModel(currentScan);
      return;
    }

    pressedKeys.add(action);
  }
});

window.addEventListener("keyup", (event) => {
  const action = getKeyAction(event);

  if (action) {
    pressedKeys.delete(action);
  }
});

window.requestAnimationFrame(navigationLoop);
