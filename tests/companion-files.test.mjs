import assert from 'node:assert/strict';
import test from 'node:test';

import { groupDroppedFiles, modelsFromDroppedFiles } from '../assets/js/mixo-ar.js';

const file = (name) => ({ name });

test('groups an OBJ with the MTL and texture dropped alongside it', () => {
  const groups = groupDroppedFiles([
    file('dragon.obj'),
    file('dragon.mtl'),
    file('dragon_texture.png'),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].model.name, 'dragon.obj');
  assert.deepEqual([...groups[0].companions.keys()].sort(), ['dragon.mtl', 'dragon_texture.png']);
});

test('keeps companion files out of the model list', () => {
  const groups = groupDroppedFiles([file('a.mtl'), file('a.obj'), file('a.png')]);

  assert.equal(groups.length, 1, 'an .mtl is not a model of its own');
});

test('matches companions to the model sharing their name when several are dropped', () => {
  const groups = groupDroppedFiles([
    file('chair.obj'),
    file('chair.mtl'),
    file('table.obj'),
    file('table.mtl'),
  ]);

  const byModel = Object.fromEntries(groups.map((group) => [group.model.name, [...group.companions.keys()]]));

  assert.deepEqual(byModel['chair.obj'], ['chair.mtl']);
  assert.deepEqual(byModel['table.obj'], ['table.mtl']);
});

test('still loads a lone OBJ with no companions', () => {
  const groups = groupDroppedFiles([file('solo.obj')]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].companions.size, 0);
});

test('hands companions to the mesh converter', async () => {
  const seen = [];
  const models = await modelsFromDroppedFiles(
    [file('dragon.obj'), file('dragon.mtl'), file('dragon_texture.png')],
    {
      createObjectURL: () => 'blob:viewer',
      convertMeshToGlbUrl: async (source, extension, companions) => {
        seen.push({ name: source.name, extension, companions: [...companions.keys()].sort() });
        return 'blob:converted';
      },
    },
  );

  assert.equal(models.length, 1);
  assert.deepEqual(seen, [{
    name: 'dragon.obj',
    extension: 'obj',
    companions: ['dragon.mtl', 'dragon_texture.png'],
  }]);
});

test('a GLB dropped with unrelated files is still shown on its own', async () => {
  const models = await modelsFromDroppedFiles([file('scene.glb'), file('notes.txt')], {
    createObjectURL: () => 'blob:viewer',
    convertMeshToGlbUrl: async () => 'blob:converted',
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].url, 'blob:viewer');
});

test('a local selection yields one model even when several are picked', async () => {
  const models = await modelsFromDroppedFiles(
    [file('first.obj'), file('first.mtl'), file('second.ply')],
    { createObjectURL: () => 'blob:v', convertMeshToGlbUrl: async () => 'blob:c' },
  );

  assert.equal(models.length, 1, 'one model at a time from the device');
  assert.equal(models[0].filename, 'first.obj');
});

test('a zip is expanded into the files it holds', async () => {
  const { expandArchives } = await import('../assets/js/mixo-ar.js');
  const zip = { name: 'bundle.zip', arrayBuffer: async () => new ArrayBuffer(8) };

  const expanded = await expandArchives([zip], {
    listZipEntries: async () => ([
      { name: 'quad/quad.obj', data: new Uint8Array([1]) },
      { name: 'quad/quad.mtl', data: new Uint8Array([2]) },
    ]),
  });

  assert.deepEqual(expanded.map((file) => file.name), ['quad.obj', 'quad.mtl']);
});

test('files that are not archives pass through untouched', async () => {
  const { expandArchives } = await import('../assets/js/mixo-ar.js');
  const plain = { name: 'model.obj' };

  assert.deepEqual(await expandArchives([plain], {}), [plain]);
});

test('a zip can carry any supported model, not only an obj', async () => {
  const { expandArchives, groupDroppedFiles } = await import('../assets/js/mixo-ar.js');
  const zip = { name: 'bundle.zip', arrayBuffer: async () => new ArrayBuffer(8) };

  const expanded = await expandArchives([zip], {
    listZipEntries: async () => ([
      { name: 'scan/tetra.ply', data: new Uint8Array([1]) },
      { name: 'scan/readme.txt', data: new Uint8Array([2]) },
    ]),
  });
  const groups = groupDroppedFiles(expanded);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].model.name, 'tetra.ply');
});

test('an archive that holds no model yields nothing to show', async () => {
  const { expandArchives, groupDroppedFiles } = await import('../assets/js/mixo-ar.js');
  const zip = { name: 'empty.zip', arrayBuffer: async () => new ArrayBuffer(8) };

  const expanded = await expandArchives([zip], {
    listZipEntries: async () => ([{ name: 'notes.txt', data: new Uint8Array([1]) }]),
  });

  assert.deepEqual(groupDroppedFiles(expanded), [], 'nothing is treated as a model');
});

// A dropped folder: `dataTransfer.files` cannot see inside one, so the page used to do nothing at
// all when somebody dragged the folder holding an OBJ, its .mtl and its texture - the first thing
// a person tries. These fakes stand in for the entries API, which exists only in a browser.
const fileEntry = (name) => ({
  isFile: true,
  isDirectory: false,
  name,
  file: (resolve) => resolve({ name, size: name.length }),
});

const dirEntry = (name, children) => ({
  isFile: false,
  isDirectory: true,
  name,
  createReader() {
    // Chromium hands back at most 100 per call and an empty batch means the end. Reading once is
    // the trap this models: a folder of 150 files would arrive as 100.
    let at = 0;

    return {
      readEntries(resolve) {
        const batch = children.slice(at, at + 2);
        at += batch.length;
        resolve(batch);
      },
    };
  },
});

const drop = (entries, files = []) => ({
  files,
  items: entries.map((entry) => ({ kind: 'file', webkitGetAsEntry: () => entry })),
});

test('a dropped folder is read, not ignored', async () => {
  const { filesFromDataTransfer } = await import('../assets/js/mixo-ar.js');
  const files = await filesFromDataTransfer(drop([
    dirEntry('quad_folder', [fileEntry('quad.obj'), fileEntry('quad.mtl'), fileEntry('quad_texture.png')]),
  ]));

  assert.deepEqual(files.map((file) => file.name).sort(), ['quad.mtl', 'quad.obj', 'quad_texture.png']);
});

test('a folder is read past the first batch', async () => {
  const { filesFromDataTransfer } = await import('../assets/js/mixo-ar.js');
  const many = Array.from({ length: 7 }, (unused, index) => fileEntry(`part${index}.stl`));
  const files = await filesFromDataTransfer(drop([dirEntry('many', many)]));

  assert.equal(files.length, 7, 'readEntries must be called until it returns nothing');
});

test('a plain file drop still works, and a browser without the entries API falls back', async () => {
  const { filesFromDataTransfer } = await import('../assets/js/mixo-ar.js');

  const viaEntries = await filesFromDataTransfer(drop([fileEntry('one.glb')]));
  assert.deepEqual(viaEntries.map((file) => file.name), ['one.glb']);

  const noEntriesApi = await filesFromDataTransfer({ files: [{ name: 'one.glb' }], items: [] });
  assert.deepEqual(noEntriesApi.map((file) => file.name), ['one.glb']);

  assert.deepEqual(await filesFromDataTransfer(null), []);
});

test('an unreadable file does not lose the rest of the folder', async () => {
  const { filesFromDataTransfer } = await import('../assets/js/mixo-ar.js');
  const broken = { isFile: true, isDirectory: false, name: 'locked.obj', file: (resolve, reject) => reject(new Error('denied')) };
  const files = await filesFromDataTransfer(drop([dirEntry('mixed', [broken, fileEntry('good.glb')])]));

  assert.deepEqual(files.map((file) => file.name), ['good.glb']);
});

test('a folder nested deeper than the limit stops rather than recursing forever', async () => {
  const { filesFromDataTransfer } = await import('../assets/js/mixo-ar.js');
  let deepest = fileEntry('buried.glb');

  for (let level = 0; level < 4; level++) {
    deepest = dirEntry(`level${level}`, [deepest]);
  }

  assert.equal((await filesFromDataTransfer(drop([deepest]))).length, 1, 'within the limit it is found');
  assert.equal((await filesFromDataTransfer(drop([deepest]), { maxDepth: 2 })).length, 0, 'beyond it, the walk stops');
});
