import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse3mfColor, parse3mfModelXml, readZipEntry } from '../assets/js/mixo-ar.js';

const CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const MATERIAL = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';
const NS = `xmlns="${CORE}" xmlns:m="${MATERIAL}"`;

async function archive(name) {
  const buffer = await readFile(new URL(`./fixtures/${name}`, import.meta.url));

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function parseFixture(name) {
  return parse3mfModelXml(await readZipEntry(await archive(name), '3D/3dmodel.model'));
}

function bounds(positions) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];

  for (let at = 0; at < positions.length; at += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      low[axis] = Math.min(low[axis], positions[at + axis]);
      high[axis] = Math.max(high[axis], positions[at + axis]);
    }
  }

  return { low, high };
}

const TRIANGLE = (id, extra = '') => `<object id="${id}" ${extra}><mesh>
  <vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices>
  <triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object>`;

test('each object keeps its own vertex numbering', async () => {
  const xml = `<model ${NS}><resources>${TRIANGLE(1)}${TRIANGLE(2)}</resources>
    <build><item objectid="1"/><item objectid="2" transform="1 0 0 0 1 0 0 0 1 5 0 0"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.equal(mesh.positions.length, 18);
  assert.deepEqual([...mesh.indices], [0, 1, 2, 3, 4, 5], 'the second triangle points at its own vertices');
  assert.equal(mesh.positions[9], 5, 'and its build transform moved it');
});

test('an object that is not in the build is left out', async () => {
  const xml = `<model ${NS}><resources>${TRIANGLE(1)}${TRIANGLE(2)}</resources>
    <build><item objectid="2"/></build></model>`;

  assert.equal((await parse3mfModelXml(xml)).positions.length, 9);
});

test('places a model and a support body by their build transforms', async () => {
  const mesh = await parseFixture('two_parts.3mf');

  assert.equal(mesh.positions.length, 16 * 3, 'two boxes of eight corners');
  assert.deepEqual([...mesh.indices.slice(36, 39)], [8, 10, 9], 'the second box is numbered from 8');

  // 4 x 4 x 2 box, turned a quarter about Z (x -> y, y -> -x), then moved to (30, 5, 0).
  assert.deepEqual(bounds(mesh.positions.slice(24)), { low: [26, 5, 0], high: [30, 9, 2] });
  assert.deepEqual(bounds(mesh.positions.slice(0, 24)), { low: [0, 0, 0], high: [10, 10, 10] });
});

test('components are flattened with their own transforms, and a cycle ends', async () => {
  const xml = `<model ${NS}><resources>${TRIANGLE(1)}
    <object id="2"><components>
      <component objectid="1" transform="1 0 0 0 1 0 0 0 1 10 0 0"/>
      <component objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/>
      <component objectid="2"/>
    </components></object></resources>
    <build><item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 100 0"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.equal(mesh.positions.length, 18, 'the part is used twice; the self-reference adds nothing');
  assert.deepEqual([mesh.positions[0], mesh.positions[1]], [10, 100]);
  assert.deepEqual([mesh.positions[9], mesh.positions[10]], [20, 100]);
});

test('a parent transform is applied after the component transform', async () => {
  const xml = `<model ${NS}><resources>${TRIANGLE(1)}
    <object id="2"><components><component objectid="1" transform="2 0 0 0 2 0 0 0 2 1 0 0"/></components></object>
    </resources><build><item objectid="2" transform="0 1 0 -1 0 0 0 0 1 0 0 0"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);

  // (1,0,0) -> scale and move -> (3,0,0) -> quarter turn about Z -> (0,3,0)
  assert.equal(Math.abs(mesh.positions[3]), 0);
  assert.equal(mesh.positions[4], 3);
});

test('a mirroring transform keeps the triangle facing outward', async () => {
  const xml = `<model ${NS}><resources>${TRIANGLE(1)}</resources>
    <build><item objectid="1" transform="-1 0 0 0 1 0 0 0 1 0 0 0"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.deepEqual([...mesh.indices], [0, 2, 1]);
});

test('the model unit scales the result to millimetres, like an STL', async () => {
  const inch = await parseFixture('inch_unit.3mf');

  assert.deepEqual(bounds(inch.positions).high.map((v) => Number(v.toFixed(3))), [25.4, 25.4, 25.4]);

  for (const [unit, factor] of [['micron', 0.001], ['millimeter', 1], ['centimeter', 10], ['foot', 304.8], ['meter', 1000]]) {
    const mesh = await parse3mfModelXml(`<model unit="${unit}" ${NS}><resources>${TRIANGLE(1)}</resources></model>`);

    assert.ok(Math.abs(mesh.positions[3] - factor) < 1e-4, unit);
  }

  const unknown = await parse3mfModelXml(`<model unit="parsec" ${NS}><resources>${TRIANGLE(1)}</resources></model>`);

  assert.equal(unknown.positions[3], 1, 'an unknown unit is left alone');
});

test('a file without materials has no groups', async () => {
  assert.equal((await parseFixture('pyramid.3mf')).groups, null);

  const grey = (await parseFixture('two_parts.3mf')).groups;

  assert.deepEqual(grey.map((group) => group.kind), ['solid'], 'both bodies share one grey base material');
});

test('reads sRGB hex colours as linear values', () => {
  const orange = parse3mfColor('#FF9500');

  assert.equal(orange.rgb[0], 1);
  assert.equal(orange.rgb[2], 0);
  assert.ok(Math.abs(orange.rgb[1] - 0.3005) < 1e-3, 'sRGB 149 is about 0.301 linear');
  assert.equal(orange.alpha, 1);
  assert.ok(Math.abs(parse3mfColor('#80808040').alpha - 64 / 255) < 1e-9);
  assert.equal(parse3mfColor('orange'), null);
});

test('base materials become one solid group per colour', async () => {
  const mesh = await parseFixture('colors.3mf');
  const solid = mesh.groups.find((group) => group.kind === 'solid');

  assert.equal(mesh.groups.length, 2);
  assert.equal(solid.indices.length, 36);
  assert.equal(solid.positions.length, 8 * 3, 'indexed, so it shades smoothly');
  assert.deepEqual(solid.color.map((v) => Number(v.toFixed(3))), [1, 0.301, 0]);
  assert.equal(solid.opacity, 1);
});

test('a colour group gives each corner its own colour', async () => {
  const mesh = await parseFixture('colors.3mf');
  const painted = mesh.groups.find((group) => group.kind === 'vertex');

  assert.equal(painted.indices, null);
  assert.deepEqual([...painted.colors], [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual([...painted.positions.slice(0, 3)], [30, 0, 0]);
});

test('a texture group carries the image path and the UVs untouched', async () => {
  const mesh = await parseFixture('textured_quad.3mf');
  const [quad] = mesh.groups;

  assert.equal(mesh.groups.length, 1);
  assert.equal(quad.kind, 'texture');
  assert.match(quad.texture, /^3D\/Textures\/quad_[0-9a-f]+\.png$/, 'the leading slash is gone, so the zip reader finds it');
  assert.equal(quad.positions.length, 2 * 9);
  // Corner (20, 20) is the top-right of the square: u = 1, v = 1 (v = 1 is the image top).
  assert.deepEqual([...quad.uvs.slice(0, 6)], [0, 0, 1, 0, 1, 1]);
  assert.deepEqual([...quad.positions.slice(6, 9)], [20, 20, 0]);

  const png = await readZipEntry(await archive('textured_quad.3mf'), quad.texture, { binary: true });

  assert.deepEqual([...png.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'the image reads back as raw PNG bytes');
});

test('a triangle falls back to its object for pid and pindex, and p2 and p3 to p1', async () => {
  const xml = `<model ${NS}><resources>
    <basematerials id="1"><base name="a" displaycolor="#FF0000"/><base name="b" displaycolor="#0000FF"/></basematerials>
    <object id="2" pid="1" pindex="1"><mesh>
      <vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices>
      <triangles>
        <triangle v1="0" v2="1" v3="2"/>
        <triangle v1="0" v2="1" v3="2" p1="0"/>
        <triangle v1="0" v2="1" v3="2" pid="1" p1="1"/>
      </triangles></mesh></object></resources><build><item objectid="2"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);
  const byRed = Object.fromEntries(mesh.groups.map((group) => [Math.round(group.color[0]), group.indices.length / 3]));

  assert.deepEqual(byRed, { 0: 2, 1: 1 }, 'two blue triangles (object pindex 1 and p1 = 1), one red (p1 = 0)');
});

test('a triangle pid overrides the object, and an unknown pid is plain', async () => {
  const xml = `<model ${NS}><resources>
    <basematerials id="1"><base name="a" displaycolor="#00FF00"/></basematerials>
    <object id="2"><mesh>
      <vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices>
      <triangles>
        <triangle v1="0" v2="1" v3="2" pid="1" p1="0"/>
        <triangle v1="0" v2="1" v3="2" pid="99" p1="0"/>
        <triangle v1="0" v2="1" v3="2"/>
      </triangles></mesh></object></resources><build><item objectid="2"/></build></model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.deepEqual(mesh.groups.map((group) => [group.kind, group.indices.length / 3]), [['solid', 1], ['plain', 2]]);
});

test('matches elements whatever their namespace prefix, and survives comments', async () => {
  const xml = `<?xml version="1.0"?><!-- <vertex x="9" y="9" z="9"/> --><mat:model xmlns:mat="${CORE}"
      xmlns:t="${MATERIAL}"><mat:resources>
    <t:texture2d id="1" path="/3D/Texture/a.png" contenttype="image/png"/>
    <t:texture2dgroup id="2" texid="1"><t:tex2coord u="0" v="0"/><t:tex2coord u="1" v="0"/><t:tex2coord u="0" v="1"/></t:texture2dgroup>
    <mat:object id="3" pid="2" pindex="0"><mat:mesh>
      <mat:vertices><mat:vertex x="0" y="0" z="0"/><mat:vertex x="1" y="0" z="0"/><mat:vertex x="0" y="1" z="0"/></mat:vertices>
      <mat:triangles><mat:triangle v1="0" v2="1" v3="2" p1="0" p2="1" p3="2"/></mat:triangles>
    </mat:mesh></mat:object></mat:resources></mat:model>`;

  const mesh = await parse3mfModelXml(xml);

  assert.equal(mesh.positions.length, 9, 'the commented-out vertex is ignored');
  assert.equal(mesh.groups[0].texture, '3D/Texture/a.png');
  assert.deepEqual([...mesh.groups[0].uvs], [0, 0, 1, 0, 0, 1]);
});

test('colour group corners keep their colours when a mirror flips the triangle', async () => {
  const xml = `<model ${NS}><resources>
    <m:colorgroup id="1"><m:color color="#FF0000"/><m:color color="#00FF00"/><m:color color="#0000FF"/></m:colorgroup>
    <object id="2" pid="1"><mesh>
      <vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices>
      <triangles><triangle v1="0" v2="1" v3="2" p1="0" p2="1" p3="2"/></triangles></mesh></object></resources>
    <build><item objectid="2" transform="-1 0 0 0 1 0 0 0 1 0 0 0"/></build></model>`;

  const [group] = (await parse3mfModelXml(xml)).groups;

  // The mirror swaps corners 2 and 3, and each takes its colour with it.
  assert.deepEqual([...group.colors], [1, 0, 0, 0, 0, 1, 0, 1, 0]);
  assert.deepEqual([...group.positions.slice(3, 6)], [0, 1, 0]);
});
