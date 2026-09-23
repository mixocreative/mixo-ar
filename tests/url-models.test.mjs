import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  arPreviewMode,
  detectLocale,
  modelKindFromName,
  modelsFromDroppedFiles,
  modelsFromSearch,
  normalizeLocale,
  selectInitialLocale,
} from '../assets/js/mixo-ar.js';

test('reads a JSON models parameter with names and sizes', () => {
  const payload = encodeURIComponent(JSON.stringify([
    { url: './assets/ar/fallback.glb', name: 'Small logo', size: '1 KB' },
    { src: 'https://example.com/model.glb', displayName: 'Remote model' }
  ]));

  assert.deepEqual(modelsFromSearch(`?models=${payload}`, 'https://mixo.github.io/ar/'), [
    { url: 'https://mixo.github.io/ar/assets/ar/fallback.glb', displayName: 'Small logo', filename: 'Small logo', size: '1 KB' },
    { url: 'https://example.com/model.glb', displayName: 'Remote model', filename: 'Remote model', size: '' }
  ]);
});

test('pairs repeated model and name parameters by position', () => {
  const search = '?model=one.glb&name=One&model=two.glb&name=Two';

  assert.deepEqual(modelsFromSearch(search, 'https://mixo.github.io/ar/'), [
    { url: 'https://mixo.github.io/ar/one.glb', displayName: 'One', filename: 'One', size: '' },
    { url: 'https://mixo.github.io/ar/two.glb', displayName: 'Two', filename: 'Two', size: '' }
  ]);
});

test('supports a single src and name pair', () => {
  assert.deepEqual(modelsFromSearch('?src=desk.glb&name=Desk', 'https://mixo.github.io/ar/'), [
    { url: 'https://mixo.github.io/ar/desk.glb', displayName: 'Desk', filename: 'Desk', size: '' }
  ]);
});

test('drops unsafe URL schemes from model parameters', () => {
  assert.deepEqual(modelsFromSearch('?src=javascript:alert(1)&name=Bad', 'https://mixo.github.io/ar/'), []);
});

test('classifies dropped model files by extension', () => {
  assert.equal(modelKindFromName('part.GLB'), 'viewer');
  assert.equal(modelKindFromName('part.gltf'), 'viewer');
  assert.equal(modelKindFromName('scan.stl'), 'mesh');
  assert.equal(modelKindFromName('shape.obj'), 'mesh');
  assert.equal(modelKindFromName('notes.txt'), null);
});

test('turns dropped glb files into viewer models', async () => {
  const files = [new File(['glb'], 'part.glb', { type: 'model/gltf-binary' })];
  const urls = [];

  const models = await modelsFromDroppedFiles(files, {
    createObjectURL(file) {
      urls.push(file.name);
      return 'blob:part';
    },
  });

  assert.deepEqual(urls, ['part.glb']);
  assert.deepEqual(models, [
    { url: 'blob:part', displayName: 'part.glb', filename: 'part.glb', size: '3 B', objectUrl: true }
  ]);
});

test('converts dropped stl and obj files before they become viewer models', async () => {
  const files = [
    new File(['solid x endsolid x'], 'scan.stl'),
    new File(['o Box'], 'mesh.obj')
  ];
  const converted = [];

  const models = await modelsFromDroppedFiles(files, {
    async convertMeshToGlbUrl(file, extension) {
      converted.push([file.name, extension]);
      return `blob:${file.name}.glb`;
    },
  });

  assert.deepEqual(converted, [['scan.stl', 'stl'], ['mesh.obj', 'obj']]);
  assert.deepEqual(models, [
    { url: 'blob:scan.stl.glb', displayName: 'scan.stl', filename: 'scan.stl', size: '18 B', objectUrl: true },
    { url: 'blob:mesh.obj.glb', displayName: 'mesh.obj', filename: 'mesh.obj', size: '5 B', objectUrl: true }
  ]);
});

test('standalone page uses relative local assets for GitHub Pages', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<main class="ar-stage" data-mixo-ar/);
  assert.match(html, /href="\.\/assets\/css\/mixo-ar\.css\?v=\d+"/);
  assert.match(html, /src="\.\/assets\/js\/mixo-ar\.js\?v=\d+"/);
  assert.match(html, /data-fallback="\.\/assets\/ar\/fallback\.glb"/);
  assert.match(html, /type="importmap"/);
  assert.doesNotMatch(html, /data-feed=/);
});

test('standalone page links generated favicon assets', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /href="\.\/favicon\.ico"/);
  assert.match(html, /href="\.\/assets\/favicon\/favicon-32x32\.png"/);
  assert.match(html, /href="\.\/assets\/favicon\/favicon-16x16\.png"/);
  assert.match(html, /href="\.\/assets\/favicon\/apple-touch-icon\.png"/);
  assert.match(html, /href="\.\/site\.webmanifest"/);
});

test('standalone page has a mobile file picker for local model loading', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const input = /<input\b[^>]*id="model-file-input"[^>]*>/.exec(html);

  assert.ok(input, 'the file input is on the page');
  assert.match(html, /for="model-file-input"/);

  // Several files at once, because an OBJ needs its .mtl and texture with it.
  assert.match(input[0], /\bmultiple\b/, 'the picker takes more than one file');

  // Read the attribute itself rather than searching the whole document: ".png" also
  // appears in the favicon links, so a substring check would pass for the wrong reason.
  const accept = /accept="([^"]*)"/.exec(input[0]);

  assert.ok(accept, 'the file input declares which types it accepts');

  const accepted = new Set(accept[1].split(',').map((entry) => entry.trim().toLowerCase()));

  for (const model of ['.glb', '.gltf', '.obj', '.ply', '.3mf', '.stl']) {
    assert.ok(accepted.has(model), `the picker should accept ${model}`);
  }

  for (const companion of ['.mtl', '.png', '.jpg']) {
    assert.ok(accepted.has(companion), `an OBJ's ${companion} companion should be selectable`);
  }
});

test('standalone page uses only the plus tool for local loading', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /class="ar-empty-panel"/);
  assert.doesNotMatch(html, /class="ar-file-input"/);
  assert.match(html, /<input id="model-file-input" class="ar-hidden" type="file"/);
  assert.match(html, /<label class="ar-tool" for="model-file-input" role="button" tabindex="0">/);
  assert.match(html, /aria-label="Load a model"/);
  assert.doesNotMatch(html, /<p class="ar-status" role="status">Loading the model/);
});

test('standalone page includes language and about icon controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /data-lang-toggle/);
  assert.match(html, /data-lang-menu/);
  assert.match(html, /data-lang-option="en"/);
  assert.match(html, /data-lang-option="zh-Hant"/);
  assert.match(html, /data-lang-option="ja"/);
  assert.match(html, /<a class="ar-brand" href="\.\/">[\s\S]*<\/a>\s*<span class="ar-lang" data-lang-control>/);
  assert.match(html, /data-i18n-aria="languageLabel"/);
  assert.match(html, /href="https:\/\/mixocreative\.com\/"/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/mixo+creative\/"/);
  assert.match(html, /class="ar-icon-link"/);
});

test('language detection prefers saved locale and maps all Chinese to Traditional Chinese', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh-Hant');
  assert.equal(normalizeLocale('zh-Hans'), 'zh-Hant');
  assert.equal(normalizeLocale('zh-TW'), 'zh-Hant');
  assert.equal(detectLocale(['fr-FR', 'ja-JP']), 'ja');
  assert.equal(detectLocale(['ko-KR']), 'en');
  assert.equal(selectInitialLocale('ja', ['zh-TW']), 'ja');
  assert.equal(selectInitialLocale(null, ['zh-CN']), 'zh-Hant');
});

test('ar preview URL parameter chooses iPhone, Android, or both buttons', () => {
  assert.equal(arPreviewMode('?arPreview=ios'), 'ios');
  assert.equal(arPreviewMode('?arPreview=iphone'), 'ios');
  assert.equal(arPreviewMode('?arPreview=android'), 'android');
  assert.equal(arPreviewMode('?arPreview=1'), 'both');
  assert.equal(arPreviewMode('?previewAr=true'), 'both');
  assert.equal(arPreviewMode('?src=model.glb'), null);
});

test('controls keep readable colors and centered glyphs', async () => {
  const css = await readFile(new URL('../assets/css/mixo-ar.css', import.meta.url), 'utf8');

  assert.match(css, /\.ar-tool[\s\S]*background: var\(--ar-card\)/);
  assert.match(css, /\.ar-tool[\s\S]*color: var\(--ar-ink\)/);
  assert.match(css, /\.ar-tool[\s\S]*align-items: center/);
  assert.match(css, /\.ar-tool[\s\S]*justify-content: center/);
  assert.match(css, /\.ar-tool > span\[aria-hidden="true"\][\s\S]*line-height: 22px/);
  assert.match(css, /\.ar-close[\s\S]*background: var\(--ar-close-bg\)/);
  assert.match(css, /\.ar-close[\s\S]*color: var\(--ar-close-ink\)/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-card: #262626/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-ink: #f2f2f2/);
  assert.match(css, /--ar-close-bg: #dddddd/);
  assert.match(css, /--ar-close-ink: #000000/);
  assert.match(css, /--ar-close-line: #9e9e9e/);
  assert.match(css, /\.ar-close[\s\S]*border: 1px solid var\(--ar-close-line\)/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-close-bg: #dddddd/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-close-ink: #000000/);
});

test('modal cards use semi-transparent glass surfaces', async () => {
  const css = await readFile(new URL('../assets/css/mixo-ar.css', import.meta.url), 'utf8');

  assert.match(css, /--ar-sheet-ink: #1f1f1f/);
  assert.match(css, /--ar-sheet-card-ink: #695A42/);
  assert.match(css, /--ar-glass-bg: rgba\(255, 255, 255, 0\.7\)/);
  assert.match(css, /--ar-glass-card: rgba\(255, 255, 255, 0\.52\)/);
  assert.match(css, /--ar-glass-blur: 20px/);
  assert.match(css, /\.ar-sheet[\s\S]*background: var\(--ar-glass-bg\)/);
  assert.match(css, /\.ar-sheet[\s\S]*color: var\(--ar-sheet-ink\)/);
  assert.match(css, /\.ar-sheet[\s\S]*inset 0 0 20px 10px rgba\(255, 255, 255, 0\.42\)/);
  assert.match(css, /\.ar-sheet[\s\S]*backdrop-filter: blur\(var\(--ar-glass-blur\)\) saturate\(1\.28\)/);
  assert.match(css, /\.ar-sheet::before[\s\S]*linear-gradient\(90deg, transparent, rgba\(255, 255, 255, 0\.9\), transparent\)/);
  assert.match(css, /\.ar-sheet::after[\s\S]*linear-gradient\(180deg, rgba\(255, 255, 255, 0\.85\), transparent, rgba\(255, 255, 255, 0\.36\)\)/);
  assert.match(css, /\.ar-icon-link[\s\S]*background: var\(--ar-glass-card\)/);
  assert.match(css, /\.ar-icon-link[\s\S]*color: var\(--ar-sheet-card-ink\)/);
  assert.match(css, /\.ar-caveat[\s\S]*background: var\(--ar-glass-card\)/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-glass-bg: rgba\(255, 255, 255, 0\.7\)/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--ar-sheet-ink: #1c1c1c/);
});

test('ar button preview has iPhone and Android visual treatments', async () => {
  const [html, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/mixo-ar.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /class="ar-glyph ar-scan-glyph"/);
  assert.match(html, /<span aria-hidden="true">AR<\/span>/);
  assert.doesNotMatch(html, /<text x="8" y="11\.2"[\s\S]*>AR<\/text>/);
  assert.match(css, /\.ar-preview-buttons[\s\S]*position: absolute/);
  assert.match(css, /\.ar-preview-button[\s\S]*min-width: 98px/);
  assert.match(css, /\.ar-preview-ios,\s*\n\.ar-preview-android[\s\S]*background: var\(--ar-blue\)/);
  assert.match(css, /\.ar-preview-ios,\s*\n\.ar-preview-android[\s\S]*color: #ffffff/);
  assert.match(css, /\.ar-preview-android[\s\S]*background: var\(--ar-blue\)/);
  assert.match(css, /\.ar-ar-button[\s\S]*animation: ar-breathe 3\.4s ease-in-out infinite/);
  assert.match(css, /@keyframes ar-breathe/);
  assert.match(css, /\.ar-scan-corner[\s\S]*stroke: currentColor/);
  assert.match(css, /\.ar-scan-cube[\s\S]*fill: currentColor/);
});

test('the asset cache token is bumped whenever the scripts change', async () => {
  // Assets are pinned by a ?v= token. Shipping a JS or CSS change without bumping it
  // leaves every returning visitor on the previously cached copy.
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const tokens = [...html.matchAll(/(?:mixo-ar\.(?:js|css))\?v=(\d+)/g)].map((match) => match[1]);

  assert.ok(tokens.length >= 2, 'both the script and the stylesheet are pinned');
  assert.equal(new Set(tokens).size, 1, 'they share one token');
  assert.ok(Number(tokens[0]) >= 2026092401, 'the token must be bumped past the last shipped build');
});
