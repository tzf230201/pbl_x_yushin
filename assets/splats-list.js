// Shared list of Gaussian-splat scans, used by splat.html (picker)
// and splatview.html (mobile/AR viewer). Files live in SPLATS_BASE.
window.SPLATS_BASE = "./public/assets/splats/";

window.SPLATS = {
  asahigaoka:        { file: "Asahigaoka.ply",                   label: "Asahigaoka",              mb: 50 },
  koremasa:          { file: "Koremasa.ply",                     label: "Koremasa",                mb: 87 },
  "scaniverse-0702": { file: "Scaniverse 2026-07-02 111133.ply", label: "Scaniverse 2026-07-02",   mb: 6 },
  "thickline-whole": { file: "scan_thickline_whole.ply",         label: "Thick line — whole",      mb: 81 },
  "thickline-left":  { file: "scan_thickline_leftside (1).ply",  label: "Thick line — left side",  mb: 77 },
  "thickline-right": { file: "scan_thickline_rightside.ply",     label: "Thick line — right side", mb: 61 },
  "thinline-left":   { file: "scan_thinline_leftside.ply",       label: "Thin line — left side",   mb: 74 },
  "thinline-wire":   { file: "scan_thinline_wirenumber.ply",     label: "Thin line — wire number", mb: 28 },
};

// Back-compat aliases used by older links/README
window.SPLAT_ALIASES = { main: "asahigaoka" };
