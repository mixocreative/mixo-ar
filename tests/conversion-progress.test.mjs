import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  conversionPhases,
  groupDroppedFiles,
  parse3mfModelXml,
  parsePlyMesh,
  phaseProgress,
  plyFormatOf,
} from '../assets/js/mixo-ar.js';

const ASCII_PLY = [
  'ply',
  'format ascii 1.0',
  'element vertex 3',
  'property float x',
  'property float y',
  'property float z',
  'element face 1',
  'property list uchar int vertex_indices',
  'end_header',
  '0 0 0',
  '1 0 0',
  '0 1 0',
  '3 0 1 2',
].join('\n');

test('progress runs from 0 to 1 and never goes backwards', () => {
  const seen = conversionPhases.map((phase) => phaseProgress(phase.key, 0));
  const ends = conversionPhases.map((phase) => phaseProgress(phase.key, 1));

  assert.ok(seen[0] === 0, 'the first phase starts at zero');
  assert.equal(ends[ends.length - 1], 1, 'the last phase finishes at one');

  for (let index = 1; index < seen.length; index += 1) {
    assert.ok(seen[index] >= ends[index - 1] - 1e-9, `phase ${index} starts after the one before`);
  }
});

test('progress inside a phase moves with the fraction given', () => {
  const key = conversionPhases[1].key;

  assert.ok(phaseProgress(key, 0.5) > phaseProgress(key, 0));
  assert.ok(phaseProgress(key, 1) > phaseProgress(key, 0.5));
});

test('a fraction outside 0..1 is clamped rather than overshooting', () => {
  const key = conversionPhases[0].key;

  assert.equal(phaseProgress(key, -5), phaseProgress(key, 0));
  assert.equal(phaseProgress(key, 5), phaseProgress(key, 1));
});

test('parsing reports progress as it walks the file', async () => {
  const updates = [];
  await parsePlyMesh(ASCII_PLY, { onProgress: (fraction) => updates.push(fraction) });

  assert.ok(updates.length > 0, 'the parser reported at least once');
  assert.ok(updates.every((value) => value >= 0 && value <= 1));
  assert.deepEqual([...updates].sort((a, b) => a - b), updates, 'progress never goes backwards');
});

test('detects ASCII and binary PLY from the header', () => {
  assert.equal(plyFormatOf('ply\nformat ascii 1.0\nend_header\n'), 'ascii');
  assert.equal(plyFormatOf('ply\nformat binary_little_endian 1.0\nend_header\n'), 'binary_little_endian');
  assert.equal(plyFormatOf('ply\nformat binary_big_endian 1.0\nend_header\n'), 'binary_big_endian');
});

test('reads a binary little-endian PLY', async () => {
  // Three vertices with colour, one triangle, written the way exporters default to.
  const header = [
    'ply',
    'format binary_little_endian 1.0',
    'element vertex 3',
    'property float x',
    'property float y',
    'property float z',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    'element face 1',
    'property list uchar int vertex_indices',
    'end_header',
    '',
  ].join('\n');

  const vertices = [
    [0, 0, 0, 255, 0, 0],
    [1, 0, 0, 0, 255, 0],
    [0, 1, 0, 0, 0, 255],
  ];
  const body = new Uint8Array(3 * 15 + 1 + 12);
  const view = new DataView(body.buffer);
  let at = 0;

  for (const [x, y, z, r, g, b] of vertices) {
    view.setFloat32(at, x, true); at += 4;
    view.setFloat32(at, y, true); at += 4;
    view.setFloat32(at, z, true); at += 4;
    view.setUint8(at, r); at += 1;
    view.setUint8(at, g); at += 1;
    view.setUint8(at, b); at += 1;
  }

  view.setUint8(at, 3); at += 1;
  for (const index of [0, 1, 2]) {
    view.setInt32(at, index, true);
    at += 4;
  }

  const headerBytes = new TextEncoder().encode(header);
  const file = new Uint8Array(headerBytes.length + body.length);
  file.set(headerBytes, 0);
  file.set(body, headerBytes.length);

  const mesh = await parsePlyMesh(file.buffer);

  assert.deepEqual([...mesh.positions], [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual([...mesh.indices], [0, 1, 2]);
  assert.ok(Math.abs(mesh.colors[0] - 1) < 1e-6, 'first vertex is red');
});

test('an exact name match beats a prefix match when attaching companions', () => {
  const groups = groupDroppedFiles([
    { name: 'chair.obj' },
    { name: 'chair.mtl' },
    { name: 'chair_v2.obj' },
    { name: 'chair_v2.mtl' },
  ]);

  const byModel = Object.fromEntries(groups.map((group) => [group.model.name, [...group.companions.keys()]]));

  assert.deepEqual(byModel['chair.obj'], ['chair.mtl'], 'chair.obj must not claim chair_v2.mtl');
  assert.deepEqual(byModel['chair_v2.obj'], ['chair_v2.mtl']);
});

test('3MF parsing reports progress too', async () => {
  const buffer = await readFile(new URL('./fixtures/pyramid.3mf', import.meta.url));
  const xml = await (await import('../assets/js/mixo-ar.js')).readZipEntry(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    '3D/3dmodel.model',
  );

  const updates = [];
  const mesh = await parse3mfModelXml(xml, { onProgress: (fraction) => updates.push(fraction) });

  assert.equal(mesh.positions.length, 15);
  assert.ok(updates.length > 0);
});
