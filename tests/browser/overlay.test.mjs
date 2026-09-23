/**
 * Browser tests for things that only misbehave in a real, rendering page.
 *
 * The loading overlay is one of them: whether it clears depends on model-viewer's
 * lifecycle events and on requestAnimationFrame, neither of which behaves normally in a
 * backgrounded tab. Playwright's Chromium runs the page as visible, so these assertions
 * mean something.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../..', import.meta.url));
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

let server;
let browser;
let origin;

before(async () => {
  server = createServer(async (request, response) => {
    const path = decodeURIComponent(request.url.split('?')[0]);
    const file = join(root, normalize(path === '/' ? '/index.html' : path));

    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
});

async function openViewer(url) {
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });

  return { page, errors };
}

/** Is the status overlay actually on screen, as a user would see it? */
function overlayVisible(page) {
  return page.evaluate(() => {
    const status = document.querySelector('.ar-status');

    if (!status || status.hidden) {
      return false;
    }

    const style = getComputedStyle(status);

    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01;
  });
}

test('the page really is visible, so these assertions are meaningful', async () => {
  const { page } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  const environment = await page.evaluate(async () => {
    const ran = await new Promise((resolve) => {
      let fired = 0;
      requestAnimationFrame(() => { fired += 1; });
      setTimeout(() => resolve(fired), 400);
    });

    return { visibility: document.visibilityState, rafRan: ran };
  });

  assert.equal(environment.visibility, 'visible');
  assert.ok(environment.rafRan > 0, 'requestAnimationFrame must run for this suite to prove anything');
  await page.close();
});

test('the loading overlay clears once a URL model has loaded', async () => {
  const { page, errors } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  // Give any trailing progress event a chance to repaint the overlay.
  await page.waitForTimeout(1500);
  const visible = await overlayVisible(page);
  const text = await page.evaluate(() => document.querySelector('.ar-status')?.textContent || '');

  assert.deepEqual(errors, []);
  assert.equal(visible, false, `overlay should be gone but still reads: ${text.trim()}`);
  await page.close();
});

test('the loading overlay clears after loading a model from the device', async () => {
  const { page } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', join(root, 'assets', 'ar', 'fallback.glb'));
  await page.waitForTimeout(3000);

  const visible = await overlayVisible(page);
  const text = await page.evaluate(() => document.querySelector('.ar-status')?.textContent || '');

  assert.equal(visible, false, `overlay should be gone but still reads: ${text.trim()}`);
  await page.close();
});

test('a textured OBJ loads with its companions and clears the overlay', async () => {
  const { page, errors } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', [
    join(root, 'tests', 'fixtures', 'quad.obj'),
    join(root, 'tests', 'fixtures', 'quad.mtl'),
    join(root, 'tests', 'fixtures', 'quad_texture.png'),
  ]);
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
  await page.waitForTimeout(1500);

  assert.deepEqual(errors, [], 'converting an OBJ must not raise');
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

test('a PLY with per-vertex colour loads and clears the overlay', async () => {
  const { page, errors } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', join(root, 'tests', 'fixtures', 'tetra.ply'));
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
  await page.waitForTimeout(1500);

  assert.deepEqual(errors, []);
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

test('a 3MF archive loads and clears the overlay', async () => {
  const { page, errors } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', join(root, 'tests', 'fixtures', 'pyramid.3mf'));
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
  await page.waitForTimeout(1500);

  assert.deepEqual(errors, []);
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

test('a corrupt model reports a failure instead of hanging or crashing', async () => {
  const { page } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', join(root, 'tests', 'fixtures', 'broken.ply'));
  await page.waitForTimeout(2500);

  const message = await page.evaluate(() => document.querySelector('.ar-status')?.textContent || '');

  assert.ok(await overlayVisible(page), 'a failure must be shown, not swallowed');
  assert.match(message, /could not be loaded|無法載入|読み込めません/);
  await page.close();
});

test('an OBJ chosen without its .mtl still loads', async () => {
  const { page, errors } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', join(root, 'tests', 'fixtures', 'quad.obj'));
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  assert.deepEqual(errors, [], 'a missing companion is not an error, just no texture');
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

test('a local selection shows one model, not several', async () => {
  // Extra files in a local selection are an OBJ's companions, not more models. Lists of
  // several models are a URL feature, where they can also come from another host.
  const { page } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.setInputFiles('#model-file-input', [
    join(root, 'tests', 'fixtures', 'quad.obj'),
    join(root, 'tests', 'fixtures', 'tetra.ply'),
  ]);
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 40000 });
  await page.waitForTimeout(1200);

  const choices = await page.evaluate(() => document.querySelectorAll('select.ar-variants option').length);

  assert.ok(choices <= 1, `a local load should show one model, found ${choices}`);
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

test('object URLs do not accumulate across repeated loads', async () => {
  const { page } = await openViewer(`${origin}/index.html?model=./assets/ar/fallback.glb`);

  await page.evaluate(() => {
    window.__live = new Set();
    const make = URL.createObjectURL.bind(URL);
    const drop = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { const url = make(blob); window.__live.add(url); return url; };
    URL.revokeObjectURL = (url) => { window.__live.delete(url); return drop(url); };
  });

  for (let round = 0; round < 3; round += 1) {
    await page.setInputFiles('#model-file-input', join(root, 'tests', 'fixtures', 'tetra.ply'));
    await page.waitForTimeout(2500);
  }

  const live = await page.evaluate(() => window.__live.size);

  // One model is on screen, so a small number is expected; growth per load is not.
  assert.ok(live <= 3, `object URLs should not pile up, ${live} still held after three loads`);
  await page.close();
});

test('an OBJ given by URL resolves its .mtl and texture from the same folder', async () => {
  // 3DGEN's viewer fetches a model's companions by URL. This viewer should too:
  // the .obj names its .mtl, which names its texture, and both sit beside it.
  const page = await browser.newPage();
  const errors = [];
  const fetched = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));

  await page.goto(`${origin}/index.html?model=./tests/fixtures/quad.obj`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  assert.deepEqual(errors, []);
  assert.ok(fetched.some((path) => path.endsWith('quad.obj')), 'the model itself was fetched');
  assert.ok(fetched.some((path) => path.endsWith('quad.mtl')), 'the .mtl named by the obj was fetched');
  assert.ok(fetched.some((path) => path.endsWith('quad_texture.png')), 'the texture named by the mtl was fetched');
  assert.equal(await overlayVisible(page), false);
  await page.close();
});

/** A second origin, so cross-domain model hosting can be exercised for real. */
async function startOtherOrigin({ cors }) {
  const other = createServer(async (request, response) => {
    const file = join(root, decodeURIComponent(request.url.split('?')[0]));
    const headers = { 'content-type': 'application/octet-stream' };

    if (cors) {
      headers['access-control-allow-origin'] = '*';
    }

    try {
      response.writeHead(200, headers).end(await readFile(file));
    } catch {
      response.writeHead(404).end('no');
    }
  });

  await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));

  return { other, base: `http://127.0.0.1:${other.address().port}` };
}

test('an OBJ hosted on another domain loads when that domain allows it', async () => {
  const { other, base } = await startOtherOrigin({ cors: true });

  try {
    const page = await browser.newPage();
    const errors = [];

    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/index.html?model=${encodeURIComponent(`${base}/tests/fixtures/quad.obj`)}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });
    await page.waitForTimeout(1200);

    assert.deepEqual(errors, []);
    assert.equal(await overlayVisible(page), false);
    await page.close();
  } finally {
    await new Promise((resolve) => other.close(resolve));
  }
});

test('a cross-domain model without CORS fails visibly instead of hanging', async () => {
  const { other, base } = await startOtherOrigin({ cors: false });

  try {
    const page = await browser.newPage();

    await page.goto(`${origin}/index.html?model=${encodeURIComponent(`${base}/tests/fixtures/quad.obj`)}`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);

    const message = await page.evaluate(() => document.querySelector('.ar-status')?.textContent || '');

    // Naming the cause matters: the fix is on the host serving the model, not here.
    assert.match(
      message,
      /does not allow|不允許|許可していません/,
      `a blocked cross-domain model should name the cause, got: ${message.trim()}`,
    );
    await page.close();
  } finally {
    await new Promise((resolve) => other.close(resolve));
  }
});
