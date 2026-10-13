/**
 * Browser tests that a 3MF's colours and textures survive the whole trip: parse, three
 * mesh, GLB export, model-viewer's own renderer. Node cannot prove the texture is the
 * right way up or the colour the right shade; only the rendered pixels can.
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

/** Open a fixture the way a shared link does, and wait for the viewer to show it. */
async function openFixture(name, cameraOrbit = null) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/index.html?src=${encodeURIComponent(`${origin}/tests/fixtures/${name}`)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 30000 });

  if (cameraOrbit) {
    await page.evaluate((orbit) => {
      const viewer = document.querySelector('model-viewer');

      viewer.cameraOrbit = orbit;
      viewer.jumpCameraToGoal();
    }, cameraOrbit);
  }

  // Let the camera settle and the frame render before reading pixels.
  await page.waitForTimeout(2500);

  return { page, errors };
}

/** The viewer's pixels as { width, height, data }, read back from a screenshot. */
async function pixelsOf(page) {
  const png = await page.locator('model-viewer').screenshot();

  return page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');

    context.drawImage(bitmap, 0, 0);

    const { width, height, data } = context.getImageData(0, 0, bitmap.width, bitmap.height);

    return { width, height, data: Array.from(data) };
  }, png.toString('base64'));
}

/** Hue in degrees, saturation and value (0..1) of an sRGB pixel. */
function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta + 6) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  return { hue: hue * 60, saturation: max === 0 ? 0 : delta / max, value: max / 255 };
}

/** Where, and how many, pixels matching a test sit in the image. */
function find({ width, height, data }, matches) {
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;

      if (matches(hsv(data[at], data[at + 1], data[at + 2]))) {
        count += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { count, x: sumX / Math.max(1, count), y: sumY / Math.max(1, count), minX, maxX, minY, maxY };
}

const nearHue = (target, spread = 18) => ({ hue, saturation, value }) =>
  saturation > 0.6 && value > 0.25 && Math.min(Math.abs(hue - target), 360 - Math.abs(hue - target)) < spread;

test('a textured 3MF shows its image the right way up', async () => {
  // The quad lies on the build plate (3MF is Z-up), so look straight down at it.
  const { page, errors } = await openFixture('textured_quad.3mf', '0deg 0.001deg auto');
  const image = await pixelsOf(page);
  const red = find(image, nearHue(0));
  const green = find(image, nearHue(120));
  const blue = find(image, nearHue(240));

  await page.close();

  assert.deepEqual(errors, []);

  for (const [name, found] of Object.entries({ red, green, blue })) {
    assert.ok(found.count > 400, `${name} quadrant is visible (${found.count} pixels)`);
  }

  // Image rows are red|green over blue|white, so with the square seen from above:
  assert.ok(red.x < green.x - 20, 'red is left of green');
  assert.ok(red.y < blue.y - 20, 'red is above blue');
  assert.ok(Math.abs(red.y - green.y) < 10, 'red and green share the top row');
  assert.ok(Math.abs(red.x - blue.x) < 10, 'red and blue share the left column');

  // The white quadrant has no hue, so find it from where the other three put it.
  const square = { left: red.minX, right: green.maxX, top: red.minY, bottom: blue.maxY };
  const at = (Math.round((square.top + square.bottom) / 2 + (square.bottom - square.top) / 4) * image.width
    + Math.round((square.left + square.right) / 2 + (square.right - square.left) / 4)) * 4;
  const white = hsv(image.data[at], image.data[at + 1], image.data[at + 2]);

  assert.ok(white.saturation < 0.25 && white.value > 0.5, `bottom-right is white, got ${JSON.stringify(white)}`);
});

test('a solid base material renders in its own colour, and vertex colours blend', async () => {
  const { page, errors } = await openFixture('colors.3mf');
  const image = await pixelsOf(page);
  const orange = find(image, nearHue(35, 12));
  const red = find(image, nearHue(0, 12));
  const green = find(image, nearHue(120, 12));
  const blue = find(image, nearHue(240, 12));

  await page.close();

  assert.deepEqual(errors, []);
  assert.ok(orange.count > 1500, `the #FF9500 box is orange (${orange.count} pixels)`);
  assert.ok(red.count > 20 && green.count > 20 && blue.count > 20, 'the painted triangle shows all three corner colours');
  assert.ok(orange.x < red.x, 'the box is left of the triangle, as the file places them');
});

for (const fixture of ['tower.3mf', 'tower.stl']) {
  test(`a Z-up ${fixture.split('.').pop().toUpperCase()} stands upright rather than lying on its back`, async () => {
    // A 10 x 10 x 40 tower along Z. Seen from the default front camera it must be tall.
    const { page, errors } = await openFixture(fixture);
    const image = await pixelsOf(page);

    await page.close();

    // The grey tower is close to the page's own grey, so measure it against that grey,
    // below the toolbar and away from the edges where the controls sit.
    const { width, height, data } = image;
    const background = data.slice(((height - 5) * width + 5) * 4, ((height - 5) * width + 5) * 4 + 3);
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 90; y < height - 20; y += 1) {
      for (let x = 80; x < width - 80; x += 1) {
        const at = (y * width + x) * 4;
        const differs = Math.abs(data[at] - background[0]) + Math.abs(data[at + 1] - background[1])
          + Math.abs(data[at + 2] - background[2]) > 18;

        if (differs) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    assert.deepEqual(errors, []);
    assert.ok(maxX > minX && maxY > minY, 'the tower is visible');
    const tall = maxY - minY;
    const wide = maxX - minX;

    assert.ok(tall > 2 * wide, `taller than wide on screen (${tall} x ${wide})`);
  });
}
