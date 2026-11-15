# mixo AR standalone viewer

Static GitHub Pages viewer for 3D models: no framework, no bundler, plain ES modules, with
`model-viewer` and three.js vendored rather than loaded from a CDN.

## This repository is upstream of the shop's viewer

It began as the static version of the mixoweb AR page, and the two then drifted for months with a
copy of the same file each. Since 2026-11-15 the direction is settled: **the viewer is maintained
here and mixoweb pulls it in.**

| | |
| --- | --- |
| the shared part | [`assets/js/core/`](assets/js/core/README.md) — handed a list of models, it renders them |
| how mixoweb gets it | vendors `assets/js/core/viewer.js` byte for byte at a pinned commit of this repository, with its own `tools\dev\sync-viewer-core.cmd`; a test there fails if the copy and the pin drift |
| so a viewer fix | is made **here**, and pushed — a commit that is not pushed is a commit mixoweb cannot pin |

What is *not* shared is each page's own half, on purpose: this page takes models from `?src=`,
`?model=` and `?models=` and converts STL, OBJ, PLY and 3MF in the browser; mixoweb loads only what
its product feed says a product has, because that origin carries an admin session and a
content-security-policy. `assets/js/core/README.md` is where that boundary is written down.

## Local files

Use the `+` button on iPhone, Android, and desktop to choose local model files. Desktop browsers
can also drag files onto the viewer.

Supported local formats:

- `.glb`
- `.gltf`
- `.stl`
- `.obj`
- `.3mf` (with colours and textures)

STL and OBJ files are converted in the browser to temporary GLB blobs before loading. The original
file is not uploaded.

## URL parameters

Single model:

```text
https://USER.github.io/REPO/?src=https%3A%2F%2Fexample.com%2Fmodel.glb&name=Desk
```

Repeated model list:

```text
?model=one.glb&name=One&model=two.glb&name=Two
```

JSON model list:

```json
[
  { "url": "one.glb", "name": "One", "size": "2 MB" },
  { "url": "https://example.com/two.glb", "name": "Two" }
]
```

URL-encode that JSON and pass it as `?models=...`.

Remote models need to be served with CORS headers that allow GitHub Pages to fetch them.

## Mobile AR

The page keeps `model-viewer`'s mobile AR modes enabled: WebXR, Android Scene Viewer, and iOS
Quick Look. Hosted GLB/GLTF URLs are the most reliable path for AR. Local picked STL/OBJ files
are supported for in-page 3D preview on iPhone and Android after browser-side conversion, but
external OS AR viewers may reject temporary local blob URLs on some devices.
