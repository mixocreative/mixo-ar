// Turning a mesh file into a GLB the viewer and AR can display.
//
// Both a hand-picked file and a model fetched from a URL end up in `glbFromBuffer`, so the two
// paths cannot drift apart in how they handle materials, colour or progress. three.js is loaded
// through the page's import map and is never imported at the top level here: a page that only ever
// shows GLB pays nothing for it.

import { readZipEntry } from '../../zip-entries.js?v=2026111605';
import { parsePlyMesh } from './ply.js?v=2026111605';
import { parse3mfModelXml } from './threemf.js?v=2026111605';

export function modelKindFromName(name) {
  const extension = modelExtensionFromName(name);

  if (extension === 'glb' || extension === 'gltf') {
    return 'viewer';
  }

  if (extension === 'stl' || extension === 'obj' || extension === 'ply' || extension === '3mf') {
    return 'mesh';
  }

  return null;
}

export function modelExtensionFromName(name) {
  return String(name || '').toLowerCase().split('.').pop();
}

/**
 * Fetch the files an OBJ depends on, from the folder it was served out of.
 *
 * An OBJ names its .mtl, and the .mtl names its texture. When the model comes from a
 * URL those files sit beside it, so they can be fetched rather than asked for. This is
 * what lets a link to an .obj display with its material on any device - nothing is
 * selected by hand, so it behaves the same on a phone as on a desktop.
 *
 * They are returned as File objects so the same code path that handles hand-picked
 * companions can be reused unchanged.
 */
async function companionsFromUrl(objText, modelUrl) {
  const companions = new Map();
  const folder = modelUrl.split('?')[0].replace(/[^/]*$/, '');

  const named = (line, tag) => {
    const trimmed = line.trim();

    return trimmed.startsWith(tag) ? trimmed.slice(tag.length).trim() : null;
  };

  const grab = async (name) => {
    const leaf = String(name).split(/[\\/]/).pop();

    try {
      const response = await fetch(folder + encodeURIComponent(leaf));

      if (!response.ok) {
        return null;
      }

      const file = new File([await response.blob()], leaf);

      companions.set(leaf.toLowerCase(), file);

      return file;
    } catch {
      return null;
    }
  };

  const materialName = objText.split(/\r?\n/).map((line) => named(line, 'mtllib')).find(Boolean);

  if (!materialName) {
    return companions;
  }

  const materialFile = await grab(materialName);

  if (!materialFile) {
    return companions;
  }

  const textureName = (await materialFile.text())
    .split(/\r?\n/)
    .map((line) => named(line, 'map_Kd'))
    .find(Boolean);

  if (textureName) {
    await grab(textureName);
  }

  return companions;
}

/** Convert a mesh served from a URL into a GLB the viewer and AR can use. */
async function convertUrlMeshToGlbUrl(modelUrl, report = () => {}) {
  report('reading', 0);

  let response;

  try {
    response = await fetch(modelUrl);
  } catch {
    // A host that does not allow cross-origin reads rejects before any status exists,
    // so this is indistinguishable from being offline - but the usual cause is CORS,
    // and the fix is on the server holding the model rather than here.
    throw new Error('MODEL_FETCH_BLOCKED');
  }

  if (!response.ok) {
    throw new Error(`Could not fetch the model (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const extension = modelExtensionFromName(modelUrl.split('?')[0]);
  const companions = extension === 'obj'
    ? await companionsFromUrl(new TextDecoder().decode(buffer), modelUrl)
    : new Map();

  report('reading', 1);

  return await glbFromBuffer(extension, buffer, companions, report);
}

/**
 * A model URL the viewer can actually display: glTF passes through, anything else is
 * converted first. Used for links and for the model switcher alike.
 */
export async function viewableModelUrl(url, report = () => {}) {
  if (typeof url !== 'string' || url.startsWith('blob:')) {
    return url;
  }

  if (modelKindFromName(url.split('?')[0]) !== 'mesh') {
    return url;
  }

  return await convertUrlMeshToGlbUrl(url, report);
}

export async function convertLocalMeshToGlbUrl(file, _extension, companions = new Map(), report = () => {}) {
  // `report(phase, fraction, warningKey)` - a warning is shown without stopping the load.
  report('reading', 0);

  const buffer = await file.arrayBuffer();

  report('reading', 1);

  return await glbFromBuffer(modelExtensionFromName(file.name), buffer, companions, report);
}

/**
 * Shared conversion: build the mesh, centre it, and serialise it to a GLB blob URL.
 *
 * Both a hand-picked file and a model fetched from a URL end up here, so the two paths
 * cannot drift apart in how they handle materials, colour or progress.
 */
async function glbFromBuffer(extension, buffer, companions, report = () => {}) {
  const [
    three,
    { STLLoader },
    { OBJLoader },
    { MTLLoader },
    { GLTFExporter },
  ] = await Promise.all([
    import('three'),
    import('three/addons/loaders/STLLoader.js'),
    import('three/addons/loaders/OBJLoader.js'),
    import('three/addons/loaders/MTLLoader.js'),
    import('three/addons/exporters/GLTFExporter.js'),
  ]);

  report('parsing', 0);
  // Let the label paint before a synchronous loader takes the thread.
  await new Promise((resolve) => setTimeout(resolve, 0));

  const root = await meshObjectFor(extension, buffer, {
    three,
    STLLoader,
    OBJLoader,
    MTLLoader,
    companions,
    onParseProgress: (fraction) => report('parsing', fraction),
    onMaterialProgress: (fraction) => report('materials', fraction),
    onTextureTimeout: () => report('materials', 1, 'textureSlow'),
    onMissingMaterial: () => report('materials', 1, 'missingMaterial'),
  });

  report('parsing', 1);

  const scene = new three.Scene();

  standUpright(root, extension, three);
  centerObject(root, three);
  scene.add(root);

  // The GLTF exporter has no progress hook, so this step is honestly indeterminate.
  report('exporting', null);

  const glb = await exportGlb(scene, new GLTFExporter());

  report('exporting', 1);

  return URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
}

function stlToObject(buffer, three, STLLoader) {
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();

  return new three.Mesh(
    geometry,
    new three.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.75, metalness: 0.05 })
  );
}

async function objToObject(buffer, three, OBJLoader, MTLLoader, companions = new Map(), hooks = {}) {
  const onMaterialProgress = hooks.onMaterialProgress || (() => {});
  const onTextureTimeout = hooks.onTextureTimeout || (() => {});
  const text = new TextDecoder().decode(buffer);
  const loader = new OBJLoader();
  const blobUrls = [];

  // An OBJ names its .mtl, and the .mtl names its textures. Both were dropped alongside
  // the model, so a LoadingManager rewrites those relative names onto the blobs we hold.
  const declaredMaterial = text.match(/^\s*mtllib\s+(.+)$/m)?.[1] || null;
  const materialFile = findCompanion(companions, declaredMaterial, 'mtl');

  // The OBJ asked for a material that was not in the selection. Say so, because the
  // model will look untextured and the cause is not obvious - especially on iOS, where
  // choosing several files at once is hidden behind Browse, then the "..." menu, then
  // Select.
  if (declaredMaterial && !materialFile) {
    hooks.onMissingMaterial?.();
  }

  let texturesReady = Promise.resolve({ timedOut: false });

  if (materialFile) {
    const manager = new three.LoadingManager();
    let startedLoading = false;

    manager.onStart = () => {
      startedLoading = true;
      onMaterialProgress(0.05);
    };

    // Real texture counts, so the bar moves while images download rather than sitting
    // still through the slowest part of a textured load.
    manager.onProgress = (_url, loaded, total) => {
      onMaterialProgress(total > 0 ? loaded / total : 0.5);
    };

    manager.setURLModifier((url) => {
      const companion = findCompanion(companions, url);

      if (!companion) {
        return url;
      }

      const blobUrl = URL.createObjectURL(companion);
      blobUrls.push(blobUrl);

      return blobUrl;
    });

    const settled = new Promise((resolve) => {
      manager.onLoad = resolve;
      manager.onError = resolve;
    });

    try {
      const materials = new MTLLoader(manager).parse(await materialFile.text(), '');

      // preload() kicks off the texture requests synchronously.
      materials.preload();
      loader.setMaterials(materials);

      // The GLTF exporter reads pixels out of the texture images, so exporting before
      // they finish decoding fails with "No valid image data found".
      if (startedLoading) {
        // A slow or missing texture must not hang the load, but it must not fail
        // silently either: the caller is told so it can say what happened.
        texturesReady = Promise.race([
          settled.then(() => ({ timedOut: false })),
          delay(TEXTURE_LOAD_TIMEOUT_MS).then(() => ({ timedOut: true })),
        ]);
      }
    } catch (failure) {
      console.warn('The .mtl file could not be applied', failure);
    }
  }

  const object = loader.parse(text);
  const outcome = (await texturesReady) || { timedOut: false };

  onMaterialProgress(1);

  if (outcome.timedOut) {
    onTextureTimeout();
  }
  const fallback = new three.MeshStandardMaterial({
    color: 0xb8b8b8,
    roughness: 0.75,
    metalness: 0.05,
    side: three.DoubleSide,
  });

  object.traverse((child) => {
    if (child.isMesh && !child.material) {
      child.material = fallback;
    }
  });

  // The exporter reads the textures back, so the blobs must outlive this function.
  if (blobUrls.length > 0) {
    setTimeout(() => blobUrls.forEach((url) => URL.revokeObjectURL(url)), 60000);
  }

  return object;
}

const TEXTURE_LOAD_TIMEOUT_MS = 10000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findCompanion(companions, name, extension) {
  if (!companions || companions.size === 0) {
    return null;
  }

  if (name) {
    const base = String(name).trim().split(/[\\/]/).pop().toLowerCase();
    const direct = companions.get(base);

    if (direct) {
      return direct;
    }
  }

  if (extension) {
    for (const [key, companion] of companions) {
      if (key.endsWith(`.${extension}`)) {
        return companion;
      }
    }
  }

  return null;
}

/**
 * Turn a Z-up file so it stands the right way in the Y-up viewer.
 *
 * 3MF is Z-up by definition, so without this a model arrives lying on its back: what
 * should face the sky faces the camera instead. STL carries no axis of its own, but the
 * slicers and CAD tools that write it all treat Z as up, so it is turned the same way.
 */
const Z_UP_FORMATS = new Set(['3mf', 'stl']);

function standUpright(object, extension, three) {
  if (!Z_UP_FORMATS.has(extension)) {
    return;
  }

  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
}

function centerObject(object, three) {
  const box = new three.Box3().setFromObject(object);
  const center = box.getCenter(new three.Vector3());

  object.position.sub(center);
}

function exportGlb(scene, exporter) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result),
      (error) => reject(error),
      { binary: true, onlyVisible: true }
    );
  });
}

async function meshObjectFor(extension, buffer, deps) {
  const { three, STLLoader, OBJLoader, MTLLoader, companions } = deps;

  if (extension === 'stl') {
    return stlToObject(buffer, three, STLLoader);
  }

  if (extension === 'ply') {
    return parsedMeshToObject(await parsePlyMesh(buffer, { onProgress: deps.onParseProgress }), three);
  }

  if (extension === '3mf') {
    const document = await readZipEntry(buffer, '3D/3dmodel.model');

    if (!document) {
      throw new Error('3MF archive has no 3D/3dmodel.model');
    }

    const parsed = await parse3mfModelXml(document, { onProgress: deps.onParseProgress });

    if (parsed.groups) {
      return materialsToObject(parsed.groups, three, (path) => readZipEntry(buffer, path, { binary: true }));
    }

    return parsedMeshToObject(parsed, three);
  }

  return objToObject(buffer, three, OBJLoader, MTLLoader, companions, {
    onMaterialProgress: deps.onMaterialProgress,
    onTextureTimeout: deps.onTextureTimeout,
    onMissingMaterial: deps.onMissingMaterial,
  });
}

/** Build a three mesh from parsed geometry, keeping per-vertex colour when present. */
function parsedMeshToObject(parsed, three) {
  const geometry = new three.BufferGeometry();

  geometry.setAttribute('position', new three.BufferAttribute(parsed.positions, 3));
  geometry.setIndex(new three.BufferAttribute(parsed.indices, 1));

  if (parsed.colors) {
    geometry.setAttribute('color', new three.BufferAttribute(parsed.colors, 3));
  }

  // These formats carry no normals, and without them the model renders unlit.
  geometry.computeVertexNormals();

  const material = new three.MeshStandardMaterial({
    color: parsed.colors ? 0xffffff : 0xb8b8b8,
    vertexColors: Boolean(parsed.colors),
    roughness: 0.75,
    metalness: 0.05,
    side: three.DoubleSide,
  });

  return new three.Mesh(geometry, material);
}

/**
 * Build a 3MF's coloured and textured groups: one mesh each, with a texture, a solid
 * colour or vertex colours on a MeshStandardMaterial like the plain meshes use.
 */
async function materialsToObject(groups, three, readTexture) {
  const root = new three.Group();
  const textures = new Map();

  for (const group of groups) {
    const geometry = new three.BufferGeometry();

    geometry.setAttribute('position', new three.BufferAttribute(group.positions, 3));

    if (group.indices) {
      geometry.setIndex(new three.BufferAttribute(group.indices, 1));
    }

    const material = new three.MeshStandardMaterial({
      color: 0xb8b8b8,
      roughness: 0.75,
      metalness: 0.05,
      side: three.DoubleSide,
    });

    if (group.kind === 'solid') {
      material.color.setRGB(...group.color);

      if (group.opacity < 1) {
        material.transparent = true;
        material.opacity = group.opacity;
      }
    } else if (group.kind === 'vertex') {
      geometry.setAttribute('color', new three.BufferAttribute(group.colors, 3));
      material.color.set(0xffffff);
      material.vertexColors = true;
    } else if (group.kind === 'texture') {
      if (!textures.has(group.texture)) {
        textures.set(group.texture, texture3mf(group.texture, three, readTexture));
      }

      const map = await textures.get(group.texture);

      if (map) {
        geometry.setAttribute('uv', new three.BufferAttribute(group.uvs, 2));
        material.color.set(0xffffff);
        material.map = map;
      }
    }

    // These formats carry no normals, and without them the model renders unlit.
    geometry.computeVertexNormals();
    root.add(new three.Mesh(geometry, material));
  }

  return root;
}

/**
 * A 3MF texture as an sRGB map. 3MF puts UV (0,0) at the image's bottom-left, which is
 * three's own convention, so the image keeps flipY and the exporter writes it the way
 * glTF expects.
 */
async function texture3mf(path, three, readTexture) {
  try {
    const bytes = await readTexture(path);

    if (!bytes) {
      throw new Error(`3MF archive has no ${path}`);
    }

    const type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
    const texture = new three.Texture(await createImageBitmap(new Blob([bytes], { type })));

    texture.colorSpace = three.SRGBColorSpace;
    texture.flipY = true;
    texture.wrapS = three.RepeatWrapping;
    texture.wrapT = three.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  } catch (failure) {
    console.warn('A 3MF texture could not be read', failure);

    return null;
  }
}
