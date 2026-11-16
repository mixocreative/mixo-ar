// Reading a PLY, ASCII or binary, keeping per-vertex colour when the file carries it.
//
// Written by hand rather than taken from a loader because the common PLY handler treats the
// extension as gaussian-splat data, which misreads an ordinary mesh. Most exporters default to
// binary, so both encodings are read.

import { maybeYield, now } from './progress.js?v=2026111615';

/** Read the `format` line of a PLY header. */
export function plyFormatOf(source) {
  const head = typeof source === 'string'
    ? source.slice(0, 2048)
    : new TextDecoder().decode(new Uint8Array(source, 0, Math.min(2048, source.byteLength)));

  const match = /^\s*format\s+(\S+)/m.exec(head);

  return match ? match[1].toLowerCase() : 'ascii';
}

/**
 * Parse a PLY, ASCII or binary, keeping per-vertex colour when the file carries it.
 *
 * Written by hand rather than taken from a loader because the common PLY handler treats
 * the extension as gaussian-splat data, which misreads an ordinary mesh. Most exporters
 * default to binary, so both encodings are read.
 */
export async function parsePlyMesh(source, options = {}) {
  const onProgress = options.onProgress || null;
  const buffer = typeof source === 'string' ? null : source;
  const text = typeof source === 'string'
    ? source
    : new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(source));

  const headerEnd = text.indexOf('end_header');

  if (headerEnd === -1) {
    throw new Error('PLY header is missing end_header');
  }

  const header = parsePlyHeader(text.slice(0, headerEnd));
  const format = plyFormatOf(text);

  if (format !== 'ascii') {
    if (!buffer) {
      throw new Error('A binary PLY must be read as bytes, not text');
    }

    const headerBytes = new TextEncoder().encode(text.slice(0, headerEnd)).length;
    const bodyStart = skipNewline(new Uint8Array(buffer), headerBytes + 'end_header'.length);

    return await parseBinaryPly(buffer, bodyStart, header, format === 'binary_big_endian', onProgress);
  }

  const lines = text.slice(headerEnd).split(/\r?\n/).slice(1).filter((line) => line.trim() !== '');

  return await parseAsciiPly(lines, header, onProgress);
}

function parsePlyHeader(headerText) {
  let element = '';
  const header = { vertexCount: 0, faceCount: 0, properties: [], listProperty: null };

  for (const raw of headerText.split(/\r?\n/)) {
    const parts = raw.trim().split(/\s+/);

    if (parts[0] === 'element') {
      element = parts[1];

      if (element === 'vertex') {
        header.vertexCount = Number(parts[2]);
      }

      if (element === 'face') {
        header.faceCount = Number(parts[2]);
      }
    }

    if (parts[0] === 'property' && element === 'vertex' && parts[1] !== 'list') {
      header.properties.push({ type: parts[1], name: parts[2] });
    }

    if (parts[0] === 'property' && element === 'face' && parts[1] === 'list') {
      header.listProperty = { countType: parts[2], indexType: parts[3] };
    }
  }

  return header;
}

async function parseAsciiPly(lines, header, onProgress) {
  const { vertexCount, faceCount, properties } = header;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const names = properties.map((property) => property.name);
  let hasColour = false;
  let lastYield = now();

  for (let index = 0; index < vertexCount; index += 1) {
    const values = lines[index].trim().split(/\s+/).map(Number);
    const row = {};

    names.forEach((name, at) => {
      row[name] = values[at];
    });

    positions.set([row.x || 0, row.y || 0, row.z || 0], index * 3);

    if (typeof row.red === 'number') {
      hasColour = true;
      colors.set([row.red / 255, row.green / 255, row.blue / 255], index * 3);
    } else {
      colors.set([1, 1, 1], index * 3);
    }

    lastYield = await maybeYield(lastYield, onProgress, index / Math.max(1, vertexCount + faceCount));
  }

  const indices = [];

  for (let index = 0; index < faceCount; index += 1) {
    const values = lines[vertexCount + index].trim().split(/\s+/).map(Number);
    const corners = values.slice(1, values[0] + 1);

    for (let corner = 1; corner + 1 < corners.length; corner += 1) {
      indices.push(corners[0], corners[corner], corners[corner + 1]);
    }

    lastYield = await maybeYield(lastYield, onProgress, (vertexCount + index) / Math.max(1, vertexCount + faceCount));
  }

  if (onProgress) {
    onProgress(1);
  }

  return { positions, indices: new Uint32Array(indices), colors: hasColour ? colors : null };
}

const PLY_TYPE_SIZES = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4,
  double: 8, float64: 8,
};

function readPlyValue(view, at, type, bigEndian) {
  const little = !bigEndian;

  switch (type) {
    case 'char': case 'int8': return view.getInt8(at);
    case 'uchar': case 'uint8': return view.getUint8(at);
    case 'short': case 'int16': return view.getInt16(at, little);
    case 'ushort': case 'uint16': return view.getUint16(at, little);
    case 'int': case 'int32': return view.getInt32(at, little);
    case 'uint': case 'uint32': return view.getUint32(at, little);
    case 'double': case 'float64': return view.getFloat64(at, little);
    default: return view.getFloat32(at, little);
  }
}

async function parseBinaryPly(buffer, start, header, bigEndian, onProgress) {
  const { vertexCount, faceCount, properties, listProperty } = header;
  const view = new DataView(buffer);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  let hasColour = false;
  let at = start;
  let lastYield = now();

  for (let index = 0; index < vertexCount; index += 1) {
    const row = {};

    for (const property of properties) {
      row[property.name] = readPlyValue(view, at, property.type, bigEndian);
      at += PLY_TYPE_SIZES[property.type] || 4;
    }

    positions.set([row.x || 0, row.y || 0, row.z || 0], index * 3);

    if (typeof row.red === 'number') {
      hasColour = true;
      colors.set([row.red / 255, row.green / 255, row.blue / 255], index * 3);
    } else {
      colors.set([1, 1, 1], index * 3);
    }

    lastYield = await maybeYield(lastYield, onProgress, index / Math.max(1, vertexCount + faceCount));
  }

  const countType = listProperty ? listProperty.countType : 'uchar';
  const indexType = listProperty ? listProperty.indexType : 'int';
  const indices = [];

  for (let index = 0; index < faceCount; index += 1) {
    const corners = readPlyValue(view, at, countType, bigEndian);
    at += PLY_TYPE_SIZES[countType] || 1;

    const face = [];

    for (let corner = 0; corner < corners; corner += 1) {
      face.push(readPlyValue(view, at, indexType, bigEndian));
      at += PLY_TYPE_SIZES[indexType] || 4;
    }

    for (let corner = 1; corner + 1 < face.length; corner += 1) {
      indices.push(face[0], face[corner], face[corner + 1]);
    }

    lastYield = await maybeYield(lastYield, onProgress, (vertexCount + index) / Math.max(1, vertexCount + faceCount));
  }

  if (onProgress) {
    onProgress(1);
  }

  return { positions, indices: new Uint32Array(indices), colors: hasColour ? colors : null };
}

function skipNewline(bytes, at) {
  let index = at;

  while (index < bytes.length && (bytes[index] === 0x0d || bytes[index] === 0x0a)) {
    index += 1;
  }

  return index;
}
