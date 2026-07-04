// Shared list of Gaussian-splat scans, used by splat.html (picker)
// and splatview.html (mobile/AR viewer). Files live in SPLATS_BASE.
// Scans are stored as compressed .ksplat (converted from the Scaniverse
// .ply exports — ~10x smaller, much faster to load).
window.SPLATS_BASE = "./public/assets/splats/";

window.SPLATS = {
  asahigaoka:        { file: "asahigaoka.ksplat",      label: "Asahigaoka",              mb: 5 },
  koremasa:          { file: "koremasa.ksplat",        label: "Koremasa",                mb: 9 },
  "thickline-whole": { file: "thickline-whole.ksplat", label: "Thick line — whole",      mb: 8 },
  "thickline-left":  { file: "thickline-left.ksplat",  label: "Thick line — left side",  mb: 8 },
  "thickline-right": { file: "thickline-right.ksplat", label: "Thick line — right side", mb: 6 },
  "thinline-left":   { file: "thinline-left.ksplat",   label: "Thin line — left side",   mb: 8 },
  "thinline-wire":   { file: "thinline-wire.ksplat",   label: "Thin line — wire number", mb: 3 },
};

// Back-compat aliases used by older links/README
window.SPLAT_ALIASES = { main: "asahigaoka" };
