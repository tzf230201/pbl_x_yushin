# PBL x Yushin — 3D Viewers

Static 3D viewers deployed on GitHub Pages. No build step, no backend.

Live site: **https://tzf230201.github.io/pbl_x_yushin/**

| Page | What it does |
|---|---|
| `index.html` | **GLB viewer** — upload a `.glb`/`.gltf`, orbit/zoom, environment (HDRI) presets + custom HDR upload, fullscreen/PWA, AR mode |
| `splat.html` | **Splat scan picker** — lists the project's Gaussian-splat scans, plus local `.ply` upload |
| `splatview.html` | **Splat viewer** — renders `.ksplat`/`.ply` Gaussian splats with touch controls, zoom, and AR mode |

## AR support

| Platform | GLB | Gaussian splat |
|---|---|---|
| Android + Chrome (ARCore) | WebXR: reticle, tap-to-place, pinch scale — fully world-anchored | Same (WebXR) |
| iPhone / iPad | AR Quick Look (ARKit) via automatic GLB→USDZ export — fully world-anchored | Camera + gyroscope look-around (rotation only; iOS Safari has no WebXR and Quick Look cannot render splats) |

## Project scans

Splat scans live in `public/assets/splats/` as compressed **`.ksplat`** files
(converted from Scaniverse `.ply` exports — roughly 10× smaller and much faster to parse).
They are registered in `assets/splats-list.js`.

Direct links (good for QR codes):

```text
https://tzf230201.github.io/pbl_x_yushin/splat.html?splat=asahigaoka
https://tzf230201.github.io/pbl_x_yushin/splat.html?splat=koremasa
```

`splat.html?file=URL` opens any hosted splat file.

### Adding a new scan

1. In Scaniverse, capture in **Splat** mode and export as **PLY**.
2. Convert to `.ksplat` (about 10× smaller). Using the
   [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) util:

   ```bash
   node util/create-ksplat.js input.ply output.ksplat 1 1
   ```

3. Put the `.ksplat` in `public/assets/splats/` and add an entry in
   `assets/splats-list.js` (bump the `?v=` query on the `splats-list.js`
   script tags in `splat.html` and `splatview.html` so caches refresh).

> A plain point-cloud PLY (only `x y z r g b` properties) is **not** a
> Gaussian splat and will not render — re-export from Scaniverse in Splat mode.

## Run locally

```bash
npm install
npm start        # http://localhost:5173
```

or without npm:

```bash
python -m http.server 5173
```

Don't open the HTML files via `file://` — module imports and model loading need a web server.

## Deploy

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the
whole repo to GitHub Pages. Keep the total site size modest (large binaries
make the `syncing_files` step flaky); Pages also rate-limits to roughly ten
deployments per hour, so a failed deploy usually just needs a retry after a
short wait (Actions → failed run → Re-run jobs).

## Tech

- [three.js](https://threejs.org/) — rendering, OrbitControls, WebXR, USDZ export
- [@mkkellogg/gaussian-splats-3d](https://github.com/mkkellogg/GaussianSplats3D) — splat rendering (`DropInViewer`, SharedArrayBuffer disabled for GitHub Pages)
- Poly Haven HDRIs via the drei-assets CDN for the GLB viewer's lighting presets
