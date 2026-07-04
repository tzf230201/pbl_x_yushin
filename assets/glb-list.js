// Shared list of GLB models for the main viewer (index.html).
// Files live in GLB_BASE. To add a model: drop the .glb there and add an
// entry here (then bump the ?v= on the glb-list.js script tag in index.html).
window.GLB_BASE = "./public/assets/scans/";

window.GLB_MODELS = {
  asahigaoka: { file: "Asahigaoka.glb", label: "Asahigaoka (mesh scan)", mb: 2 },
};
