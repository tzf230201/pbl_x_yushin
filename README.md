# Scaniverse WebXR Viewer

A small static WebXR/VR viewer for a 3D scan exported from Scaniverse on iPhone.

It uses [A-Frame](https://aframe.io/) so the scene can run in normal desktop browsers and in Meta Quest / Oculus Browser.

## Where to Put the GLB File

Export your main Scaniverse model as a GLB file and place it here:

```text
public/assets/scan.glb
```

The viewer already includes this as `Main scan`.

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
    name: "Main scan",
    file: "public/assets/scan.glb",
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
- Use `W`, `A`, `S`, and `D` to move.
- Press `Esc` to release pointer lock if needed.

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

WebXR requires a secure context. Online deployments must use `https://`. Local `http://localhost` works for desktop testing, but a Quest headset normally needs an HTTPS public URL or a properly configured local network setup.

## Deploy Online

This project has no backend and no build step. Deploy the whole folder as a static site.

### GitHub Pages

This project is a plain static site, so the easiest GitHub Pages setup is `Deploy from a branch`.

1. Commit and push the files to the `main` branch.
2. Open the repository on GitHub:

```text
https://github.com/tzf230201/pbl_x_yuushin
```

3. Go to Settings > Pages.
4. Under Build and deployment, set Source to `Deploy from a branch`.
5. Set Branch to `main`.
6. Set Folder to `/ (root)`.
7. Click Save.

The site should be available at:

```text
https://tzf230201.github.io/pbl_x_yuushin/
```

Direct scan links will look like:

```text
https://tzf230201.github.io/pbl_x_yuushin/?scan=main
https://tzf230201.github.io/pbl_x_yuushin/?scan=duck
https://tzf230201.github.io/pbl_x_yuushin/?scan=box
https://tzf230201.github.io/pbl_x_yuushin/?scan=cesium-man
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
- `styles.css` - loading screen and scan selector styles.
- `package.json` - optional local static server scripts.
