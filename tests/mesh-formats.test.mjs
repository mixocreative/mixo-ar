import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  modelKindFromName,
  parse3mfModelXml,
  parsePlyMesh,
  readZipEntry,
} from '../assets/js/mixo-ar.js';

const PLY = [
  'ply',
  'format ascii 1.0',
  'element vertex 4',
  'property float x',
  'property float y',
  'property float z',
  'property uchar red',
  'property uchar green',
  'property uchar blue',
  'element face 2',
  'property list uchar int vertex_indices',
  'end_header',
  '0 0 0 255 0 0',
  '1 0 0 0 255 0',
  '1 1 0 0 0 255',
  '0 1 0 255 255 0',
  '3 0 1 2',
  '3 0 2 3',
].join('\n');

test('PLY and 3MF are recognised as meshes', () => {
  assert.equal(modelKindFromName('model.ply'), 'mesh');
  assert.equal(modelKindFromName('model.3mf'), 'mesh');
});

test('parses an ASCII PLY with per-vertex colour', async () => {
  const mesh = await parsePlyMesh(PLY);

  assert.equal(mesh.positions.length, 12);
  assert.deepEqual([...mesh.indices], [0, 1, 2, 0, 2, 3]);
  assert.equal(mesh.colors.length, 12, 'three colour channels per vertex');
  assert.ok(Math.abs(mesh.colors[0] - 1) < 1e-6, 'first vertex is red');
  assert.ok(Math.abs(mesh.colors[1]) < 1e-6);
});

test('a PLY without colour still parses', async () => {
  const plain = PLY
    .replace(/property uchar (red|green|blue)\n/g, '')
    .split('\n')
    .map((line) => (/^-?\d+ -?\d+ -?\d+ /.test(line) ? line.split(' ').slice(0, 3).join(' ') : line))
    .join('\n');

  const mesh = await parsePlyMesh(plain);

  assert.equal(mesh.positions.length, 12);
  assert.equal(mesh.colors, null);
});

test('triangulates PLY faces with more than three corners', async () => {
  const quad = PLY
    .replace('element face 2', 'element face 1')
    .replace('3 0 1 2\n3 0 2 3', '4 0 1 2 3');

  const mesh = await parsePlyMesh(quad);

  assert.deepEqual([...mesh.indices], [0, 1, 2, 0, 2, 3]);
});

test('parses the mesh out of a 3MF model document', async () => {
  const xml = `<?xml version="1.0"?><model><resources><object><mesh>
    <vertices>
      <vertex x="0" y="0" z="0" /><vertex x="1" y="0" z="0" /><vertex x="0" y="1" z="0" />
    </vertices>
    <triangles><triangle v1="0" v2="1" v3="2" /></triangles>
  </mesh></object></resources></model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.deepEqual([...mesh.positions], [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual([...mesh.indices], [0, 1, 2]);
});

test('reads the model document out of a real 3MF archive', async () => {
  const buffer = await readFile(new URL('./fixtures/pyramid.3mf', import.meta.url));
  const xml = await readZipEntry(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '3D/3dmodel.model');

  assert.ok(xml.includes('<vertex'), 'the archive entry was inflated');

  const mesh = await parse3mfModelXml(xml);

  assert.equal(mesh.positions.length, 15, 'five vertices');
  assert.equal(mesh.indices.length, 18, 'six triangles');
});

test('returns null for an archive entry that is not there', async () => {
  const buffer = await readFile(new URL('./fixtures/pyramid.3mf', import.meta.url));
  const missing = await readZipEntry(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), 'nope.xml');

  assert.equal(missing, null);
});
