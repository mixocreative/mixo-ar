// Reading a 3MF: its objects, transforms, units, colours and textures.
//
// A 3MF is a zip holding an XML model, so this parses the XML the add-on's own writer produces -
// resources, objects with meshes and components, and the build list - and resolves the transform
// tree down to triangles. Units are converted to millimetres, which is what the viewer treats a
// mesh file as.

import { maybeYield, now } from './progress.js?v=2026111601';

/** Millimetres per 3MF model unit. The viewer treats mesh files as millimetres, as STL is. */
const THREE_MF_UNIT_MM = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

const THREE_MF_IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

const THREE_MF_MAX_DEPTH = 32;

/**
 * Pull the geometry out of a 3MF model document.
 *
 * Read with a small tag scanner rather than DOMParser so the same code runs in the
 * browser and under `node --test`. Every <object> keeps its own vertex numbering; the
 * build items and components place them with their 3MF transforms (3x4, row-major,
 * translation last) and the model's unit is folded in, so the result is one mesh in
 * millimetres. Materials from the Materials & Properties extension come back as
 * `groups`, one per texture, solid colour or vertex-colour set; a file with none keeps
 * `groups: null` and the flat `positions` and `indices`.
 */
export async function parse3mfModelXml(xml, options = {}) {
  const onProgress = options.onProgress || null;
  const progress = { lastYield: now(), onProgress };
  const model = await scan3mfDocument(String(xml), progress);
  const roots = threeMfRoots(model);
  const scale = THREE_MF_UNIT_MM[model.unit] || 1;
  const positions = [];
  const indices = [];
  const corners = { pid: [], p: [] };
  const total = Math.max(1, model.vertexCount + model.triangleCount);
  let done = 0;

  const place = async (object, matrix) => {
    const base = positions.length / 3;
    const flip = threeMfDeterminant(matrix) < 0;

    for (let at = 0; at < object.vertices.length; at += 3) {
      const x = object.vertices[at];
      const y = object.vertices[at + 1];
      const z = object.vertices[at + 2];

      positions.push(
        x * matrix[0] + y * matrix[3] + z * matrix[6] + matrix[9],
        x * matrix[1] + y * matrix[4] + z * matrix[7] + matrix[10],
        x * matrix[2] + y * matrix[5] + z * matrix[8] + matrix[11],
      );
    }

    for (let tri = 0; tri < object.triangles.length / 3; tri += 1) {
      const [pid, p1, p2, p3] = threeMfTriangleProperty(object, tri);
      const second = flip ? 2 : 1;
      const third = flip ? 1 : 2;

      // A mirroring transform turns the triangle inside out, so swap two corners back.
      indices.push(
        base + object.triangles[tri * 3],
        base + object.triangles[tri * 3 + second],
        base + object.triangles[tri * 3 + third],
      );
      corners.pid.push(pid);
      corners.p.push(p1, flip ? p3 : p2, flip ? p2 : p3);

      if (tri % 1024 === 1023) {
        progress.lastYield = await maybeYield(
          progress.lastYield,
          onProgress,
          0.5 + 0.5 * ((model.vertexCount + done + tri) / total),
        );
      }
    }

    done += object.triangles.length / 3;
  };

  const walk = async (id, matrix, trail) => {
    const object = model.objects.get(id);

    // A component that points back at one of its own parents would never end.
    if (!object || trail.includes(id) || trail.length >= THREE_MF_MAX_DEPTH) {
      return;
    }

    await place(object, matrix);

    for (const component of object.components) {
      await walk(component.id, threeMfMultiply(component.transform, matrix), [...trail, id]);
    }
  };

  for (const root of roots) {
    await walk(root.id, threeMfMultiply(root.transform, threeMfScale(scale)), []);
  }

  if (positions.length === 0) {
    throw new Error('3MF document contains no vertices');
  }

  if (onProgress) {
    onProgress(1);
  }

  const mesh = {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    colors: null,
    groups: null,
  };

  mesh.groups = threeMfGroups(model, mesh, corners);

  return mesh;
}

/** One pass over the tags: resources, objects (with meshes and components) and the build list. */
async function scan3mfDocument(source, progress) {
  const model = {
    unit: 'millimeter',
    textures: new Map(),
    properties: new Map(),
    objects: new Map(),
    build: [],
    vertexCount: 0,
    triangleCount: 0,
  };
  const text = source.replace(/<!--[\s\S]*?-->/g, '');
  const tags = /<(\/?)(?:[\w.-]+:)?([\w.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let object = null;
  let group = null;
  let count = 0;

  for (const tag of text.matchAll(tags)) {
    const closing = tag[1] === '/';
    const name = tag[2];

    count += 1;

    if (count % 2048 === 0) {
      progress.lastYield = await maybeYield(progress.lastYield, progress.onProgress, 0.5 * (tag.index / text.length));
    }

    if (closing || tag[4] === '/') {
      if (name === 'object') {
        object = null;
      } else if (name === 'basematerials' || name === 'colorgroup' || name === 'texture2dgroup') {
        group = null;
      }

      if (closing) {
        continue;
      }
    }

    const attributes = threeMfAttributes(tag[3]);

    if (name === 'model') {
      model.unit = (attributes.unit || 'millimeter').toLowerCase();
    } else if (name === 'texture2d') {
      model.textures.set(attributes.id, { path: String(attributes.path || '').replace(/^\/+/, '') });
    } else if (name === 'basematerials' || name === 'colorgroup' || name === 'texture2dgroup') {
      group = { kind: name, texture: attributes.texid, items: [] };
      model.properties.set(attributes.id, group);
    } else if (name === 'base' && group?.kind === 'basematerials') {
      group.items.push(attributes.displaycolor || '');
    } else if (name === 'color' && group?.kind === 'colorgroup') {
      group.items.push(attributes.color || '');
    } else if (name === 'tex2coord' && group?.kind === 'texture2dgroup') {
      group.items.push([Number(attributes.u) || 0, Number(attributes.v) || 0]);
    } else if (name === 'object') {
      object = {
        id: attributes.id ?? `#${model.objects.size}`,
        pid: threeMfIndex(attributes.pid),
        pindex: threeMfIndex(attributes.pindex),
        vertices: [],
        triangles: [],
        properties: [],
        components: [],
      };
      model.objects.set(object.id, object);
    } else if (name === 'vertex' && object) {
      object.vertices.push(Number(attributes.x) || 0, Number(attributes.y) || 0, Number(attributes.z) || 0);
      model.vertexCount += 1;
    } else if (name === 'triangle' && object) {
      object.triangles.push(Number(attributes.v1) || 0, Number(attributes.v2) || 0, Number(attributes.v3) || 0);
      object.properties.push(
        threeMfIndex(attributes.pid),
        threeMfIndex(attributes.p1),
        threeMfIndex(attributes.p2),
        threeMfIndex(attributes.p3),
      );
      model.triangleCount += 1;
    } else if (name === 'component' && object) {
      object.components.push({ id: attributes.objectid, transform: threeMfTransform(attributes.transform) });
    } else if (name === 'item') {
      model.build.push({ id: attributes.objectid, transform: threeMfTransform(attributes.transform) });
    }
  }

  return model;
}

function threeMfAttributes(source) {
  const attributes = {};

  for (const match of source.matchAll(/([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].split(':').pop()] = (match[2] ?? match[3])
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  return attributes;
}

/** An optional index attribute: -1 when it is absent, so 0 stays a real index. */
function threeMfIndex(value) {
  const number = Number(value);

  return value === undefined || value === '' || !Number.isInteger(number) || number < 0 ? -1 : number;
}

/** What gets placed: the build items, or every object nothing else uses as a component. */
function threeMfRoots(model) {
  const built = model.build.filter((item) => model.objects.has(item.id));

  if (built.length > 0) {
    return built;
  }

  const used = new Set();

  for (const object of model.objects.values()) {
    object.components.forEach((component) => used.add(component.id));
  }

  const free = [...model.objects.values()].filter((object) => !used.has(object.id));

  return (free.length > 0 ? free : [...model.objects.values()])
    .map((object) => ({ id: object.id, transform: THREE_MF_IDENTITY }));
}

function threeMfTransform(value) {
  const numbers = String(value || '').trim().split(/\s+/).map(Number);

  return numbers.length === 12 && numbers.every(Number.isFinite) ? numbers : THREE_MF_IDENTITY;
}

function threeMfScale(factor) {
  return [factor, 0, 0, 0, factor, 0, 0, 0, factor, 0, 0, 0];
}

/** Apply `first`, then `second`: both are row-vector transforms with the translation last. */
function threeMfMultiply(first, second) {
  const result = new Array(12);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      result[row * 3 + column] =
        first[row * 3] * second[column] +
        first[row * 3 + 1] * second[3 + column] +
        first[row * 3 + 2] * second[6 + column];
    }
  }

  for (let column = 0; column < 3; column += 1) {
    result[9 + column] =
      first[9] * second[column] +
      first[10] * second[3 + column] +
      first[11] * second[6 + column] +
      second[9 + column];
  }

  return result;
}

function threeMfDeterminant(m) {
  return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
}

/** A triangle's [pid, p1, p2, p3], falling back to the object's pid and pindex. */
function threeMfTriangleProperty(object, tri) {
  const [pid, p1, p2, p3] = object.properties.slice(tri * 4, tri * 4 + 4);
  const first = p1 >= 0 ? p1 : Math.max(0, object.pindex);

  return [
    pid >= 0 ? pid : object.pid,
    first,
    p2 >= 0 ? p2 : first,
    p3 >= 0 ? p3 : first,
  ];
}

/** "#RRGGBB" or "#RRGGBBAA" in sRGB, as linear [r, g, b] and an alpha, or null. */
export function parse3mfColor(value) {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(value || '').trim());

  if (!match) {
    return null;
  }

  const channel = (at) => {
    const encoded = parseInt(match[1].slice(at, at + 2), 16) / 255;

    return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
  };

  return {
    rgb: [channel(0), channel(2), channel(4)],
    alpha: match[2] ? parseInt(match[2], 16) / 255 : 1,
  };
}

/**
 * Sort the placed triangles into one group per texture, solid colour and vertex-colour
 * set. Solid and plain groups stay indexed so they shade smoothly; textured and
 * vertex-coloured ones are written per corner, since each corner has its own value.
 * Returns null when nothing in the file carries a material.
 */
function threeMfGroups(model, mesh, corners) {
  const groups = new Map();
  let painted = false;

  const groupFor = (key, make) => {
    if (!groups.has(key)) {
      groups.set(key, { ...make(), triangles: [] });
    }

    return groups.get(key);
  };

  for (let tri = 0; tri < corners.pid.length; tri += 1) {
    const property = model.properties.get(String(corners.pid[tri]));
    const p = corners.p.slice(tri * 3, tri * 3 + 3);
    let group = null;

    if (property?.kind === 'basematerials') {
      const color = parse3mfColor(property.items[p[0]]);

      if (color) {
        group = groupFor(`solid:${property.items[p[0]]}`, () => ({ kind: 'solid', color: color.rgb, opacity: color.alpha }));
        group.triangles.push({ tri });
      }
    } else if (property?.kind === 'colorgroup') {
      const colors = p.map((index) => parse3mfColor(property.items[index]));

      if (colors.every(Boolean)) {
        group = groupFor('vertex', () => ({ kind: 'vertex' }));
        group.triangles.push({ tri, colors: colors.map((color) => color.rgb) });
      }
    } else if (property?.kind === 'texture2dgroup') {
      const texture = model.textures.get(property.texture);
      const uvs = p.map((index) => property.items[index]);

      if (texture?.path && uvs.every(Boolean)) {
        group = groupFor(`texture:${texture.path}`, () => ({ kind: 'texture', texture: texture.path }));
        group.triangles.push({ tri, uvs });
      }
    }

    if (!group) {
      groupFor('plain', () => ({ kind: 'plain' })).triangles.push({ tri });
    } else {
      painted = true;
    }
  }

  if (!painted) {
    return null;
  }

  return [...groups.values()].map((group) => threeMfBuildGroup(group, mesh));
}

function threeMfBuildGroup(group, mesh) {
  const { kind, triangles } = group;
  const out = { kind };

  if (kind === 'solid' || kind === 'plain') {
    const local = new Map();
    const positions = [];
    const indices = [];

    for (const { tri } of triangles) {
      for (let corner = 0; corner < 3; corner += 1) {
        const global = mesh.indices[tri * 3 + corner];

        if (!local.has(global)) {
          local.set(global, positions.length / 3);
          positions.push(mesh.positions[global * 3], mesh.positions[global * 3 + 1], mesh.positions[global * 3 + 2]);
        }

        indices.push(local.get(global));
      }
    }

    out.positions = new Float32Array(positions);
    out.indices = new Uint32Array(indices);
  } else {
    const positions = new Float32Array(triangles.length * 9);
    const colors = kind === 'vertex' ? new Float32Array(triangles.length * 9) : null;
    const uvs = kind === 'texture' ? new Float32Array(triangles.length * 6) : null;

    triangles.forEach((entry, at) => {
      for (let corner = 0; corner < 3; corner += 1) {
        const global = mesh.indices[entry.tri * 3 + corner];

        positions.set(mesh.positions.subarray(global * 3, global * 3 + 3), at * 9 + corner * 3);
        colors?.set(entry.colors[corner], at * 9 + corner * 3);
        uvs?.set(entry.uvs[corner], at * 6 + corner * 2);
      }
    });

    out.positions = positions;
    out.indices = null;

    if (colors) {
      out.colors = colors;
    }

    if (uvs) {
      out.uvs = uvs;
    }
  }

  if (group.color) {
    out.color = group.color;
    out.opacity = group.opacity;
  }

  if (group.texture) {
    out.texture = group.texture;
  }

  return out;
}
