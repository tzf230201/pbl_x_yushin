# Scaniverse WebXR Viewer

A small static WebXR/VR viewer for 3D scans exported from Scaniverse on iPhone.

It supports two workflows:

- Mesh / GLB scans through the main A-Frame viewer.
- Gaussian Splat / PLY scans through the included SuperSplat Viewer.

## Which Scaniverse Export to Use

If Scaniverse gives you `GLB`, use the main viewer:

```text
index.html
```

If Scaniverse only gives you `PLY` or `SPZ`, that scan is a Gaussian Splat. Use the splat viewer:

```text
splat.html
```

For the easiest GitHub Pages workflow, export `PLY` from Scaniverse.

GitHub blocks normal Git pushes for files over 100 MB. If your `PLY` is too large, export `SPZ` from Scaniverse and convert it to `SOG` locally before pushing.

## Where to Put the GLB File

Export your main Scaniverse model as a GLB file and place it here:

```text
public/assets/scan.glb
```

The viewer already includes this as `Example main`.

For multiple scans, put additional GLB files in:

```text
public/assets/scans/
```

Example:

```text
public/assets/scans/room-a.glb
public/assets/scans/machine.glb
public/assets/scans/table.glb
```

If a model appears too large, too small, rotated, or away from the camera, edit the matching entry in `SCANS` near the top of `viewer.js`:

```js
const SCANS = [
  {
    id: "main",
    name: "Example main",
    file: "./public/assets/scan.glb",
    position: "0 0 0",
    rotation: "0 0 0",
    scale: "1 1 1",
  },
];
```

A-Frame positions and scales are in meters. Rotation values are degrees in `X Y Z` order.

Each scan needs a unique `id`. The page can open directly to a scan using a URL like:

```text
https://your-site.example/?scan=main
https://your-site.example/?scan=machine
```

This is useful for QR codes.

## Where to Put the PLY Splat File

Export your Scaniverse Gaussian Splat as `PLY` and place it here:

```text
public/assets/splats/main.ply
```

Open the splat viewer:

```text
https://your-site.example/splat.html?splat=main
```

For this repository on GitHub Pages, the URL will be:

```text
https://tzf230201.github.io/pbl_x_yuushin/splat.html?splat=main
```

The current Asahigaoka files are:

```text
public/assets/scans/Asahigaoka.glb
public/assets/splats/Asahigaoka.ply
```

Direct Asahigaoka links:

```text
https://tzf230201.github.io/pbl_x_yuushin/?scan=asahigaoka
https://tzf230201.github.io/pbl_x_yuushin/splat.html?splat=asahigaoka
```

The splat viewer uses WebGL mode because WebXR / VR needs WebGL in the bundled SuperSplat Viewer.

## If You Only Have SPZ

You can convert `SPZ` to `PLY` locally.

Put the file here:

```text
public/assets/splats/main.spz
```

Run:

```bash
npm run convert:spz
```

This creates:

```text
public/assets/splats/main.ply
```

Then commit and push the new `main.ply` file.

If the generated `main.ply` is too large for GitHub, convert to the web-friendly `SOG` format instead:

```bash
npm run convert:spz:sog
```

Then open:

```text
https://your-site.example/splat.html?splat=main-sog
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start a local static server:

```bash
npm start
```

Open:

```text
http://localhost:5173
```

You can also run it without installing dependencies:

```bash
npx http-server . -p 5173 -c-1
```

Do not open `index.html` directly from the file system. Browsers usually block GLB loading from `file://` URLs.

## Desktop Controls

- Drag the mouse to look around.
- Use `W`, `A`, `S`, and `D` or arrow keys to fly.
- `W` moves toward where the camera is looking.
- Use `Space` or `E` to move up.
- Use `Shift` or `Q` to move down.
- Press `R` to reset the view.
- Press `Esc` to release pointer lock if needed.
- You can also use the on-screen arrow buttons.

## Meta Quest / Oculus Controls

- Move your head to look around.
- Use the left thumbstick to fly forward, backward, left, and right.
- Forward follows where the headset is looking.
- Use the right thumbstick up/down to move vertically.
- Use the right thumbstick left/right to turn.
- Select the VR button in the bottom-right corner to enter VR mode.

## Open on Meta Quest / Oculus Browser

1. Deploy the project online using HTTPS.
2. Put `public/assets/scan.glb` in the deployed project before publishing.
3. On the headset, open Meta Quest / Oculus Browser.
4. Visit the deployed URL.
5. Select the VR button in the bottom-right corner of the page.

To open a specific scan directly, use a link with the scan ID:

```text
https://your-site.example/?scan=main
```

For a PLY splat, open:

```text
https://your-site.example/splat.html?splat=main
```

WebXR requires a secure context. Online deployments must use `https://`. Local `http://localhost` works for desktop testing, but a Quest headset normally needs an HTTPS public URL or a properly configured local network setup.

## Deploy Online

This project has no backend and no build step. Deploy the whole folder as a static site.

### GitHub Pages

This repository includes a GitHub Actions workflow at:

```text
.github/workflows/pages.yml
```

To publish:

1. Commit and push the files to the `main` branch.
2. Open the repository on GitHub:

```text
https://github.com/tzf230201/pbl_x_yuushin
```

3. Go to Settings > Pages.
4. Under Build and deployment, set Source to `GitHub Actions`.
5. Open the Actions tab.
6. Wait for `Deploy static site to GitHub Pages` to finish.

The site should be available at:

```text
https://tzf230201.github.io/pbl_x_yuushin/
```

Direct scan links will look like:

```text
https://tzf230201.github.io/pbl_x_yuushin/?scan=asahigaoka
https://tzf230201.github.io/pbl_x_yuushin/?scan=main
https://tzf230201.github.io/pbl_x_yuushin/?scan=duck
https://tzf230201.github.io/pbl_x_yuushin/?scan=box
https://tzf230201.github.io/pbl_x_yuushin/?scan=cesium-man
```

PLY splat link:

```text
https://tzf230201.github.io/pbl_x_yuushin/splat.html?splat=asahigaoka
https://tzf230201.github.io/pbl_x_yuushin/splat.html?splat=main
```

### Netlify

1. Create a new Netlify site.
2. Drag and drop this project folder into Netlify, or connect a Git repository.
3. Leave the build command empty.
4. Set the publish directory to the project root.

### Vercel

1. Import the project repository in Vercel.
2. Choose "Other" as the framework if asked.
3. Leave the build command empty.
4. Set the output directory to `.` if Vercel asks for one.

### Cloudflare Pages

1. Create a new Cloudflare Pages project.
2. Connect the Git repository.
3. Leave the build command empty.
4. Set the output directory to `.`.

## Files

- `index.html` - A-Frame scene, camera, lights, sky, ground, VR button, and GLB entity.
- `viewer.js` - scan list, model path and transform settings, URL scan selection, plus loading/error handling.
- `splat.html` - redirects PLY splats into the bundled SuperSplat Viewer.
- `splat-viewer/` - static SuperSplat Viewer files for Gaussian Splat PLY files.
- `styles.css` - loading screen and scan selector styles.
- `package.json` - optional local static server scripts.
