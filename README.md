# mixo AR standalone viewer

Static GitHub Pages version of the mixoweb AR page.

## Local files

Use the `+` button on iPhone, Android, and desktop to choose local model files. Desktop browsers
can also drag files onto the viewer.

Supported local formats:

- `.glb`
- `.gltf`
- `.stl`
- `.obj`

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
