const stage = typeof document === 'undefined' ? null : document.querySelector('[data-mixo-ar]');
const LANGUAGE_STORAGE_KEY = 'mixo-ar-language';
const LOCALE_ORDER = ['en', 'zh-Hant', 'ja'];
const I18N = {
  en: {
    title: 'mixocreative · 3D/AR',
    languageLabel: 'Switch language',
    helpLabel: 'How to use this',
    aboutLabel: 'About',
    loadLocalLabel: 'Load a local model',
    helpTitle: 'How to use this',
    diagramAlt: 'Where the controls are on the screen',
    stepModels: 'If the URL or a local load includes more than one model, they are listed here.',
    stepArBefore: 'On a phone that supports it,',
    stepArAfter: 'places the model in the room in front of you.',
    stepInfo: 'Load models, view descriptions, and see creator info.',
    caveat: 'AR does not start inside the browsers built into LINE, Facebook and other apps. Copy the link and open it in Chrome or Safari.',
    aboutTitle: 'About',
    aboutBody: 'mixocreative 3D/AR viewer.',
    companyLink: 'Open mixocreative website',
    instagramLink: 'Open mixocreative Instagram',
    close: 'Close',
    loading: 'Loading the model...',
    noProduct: 'Choose a GLB, GLTF, OBJ, PLY, 3MF, or STL file to preview it here.',
    failed: 'That model could not be loaded.',
    fallback: 'Showing a placeholder model instead.',
    compressed: 'This model uses compression this viewer does not carry. Re-export it without Draco or KTX2.',
    arButton: 'View in your room',
    alt: 'A 3D model. Drag to turn it.',
    models: 'Which model',
    localLoading: 'Loading local model...',
    unsupported: 'Drop or choose a GLB, GLTF, OBJ, PLY, 3MF, or STL file. Include the .mtl and texture with an OBJ to keep its material.',
  },
  'zh-Hant': {
    title: 'mixocreative · 3D/AR',
    languageLabel: '切換語言',
    helpLabel: '使用說明',
    aboutLabel: '關於',
    loadLocalLabel: '載入本機模型',
    helpTitle: '使用說明',
    diagramAlt: '畫面控制位置',
    stepModels: '如果網址或本機載入包含多個模型，會在這裡列出。',
    stepArBefore: '在支援 AR 的手機上，',
    stepArAfter: '可以把模型放到你面前的空間中。',
    stepInfo: '這裡可以載入3D模型、查看說明與製作者資訊。',
    caveat: 'LINE、Facebook 等 App 內建瀏覽器無法啟動 AR。請複製連結，改用 Chrome 或 Safari 開啟。',
    aboutTitle: '關於',
    aboutBody: 'mixocreative  3D/AR 檢視器。',
    companyLink: '開啟 mixocreative 官網',
    instagramLink: '開啟 mixocreative Instagram',
    close: '關閉',
    loading: '模型載入中...',
    noProduct: '選擇 GLB、GLTF、OBJ、PLY、3MF 或 STL 檔案即可在這裡預覽。',
    failed: '無法載入這個模型。',
    fallback: '目前顯示替代模型。',
    compressed: '這個模型使用了此檢視器未內建的壓縮格式。請重新匯出為不含 Draco 或 KTX2 的檔案。',
    arButton: '放到你的空間',
    alt: '3D 模型。拖曳即可旋轉。',
    models: '選擇模型',
    localLoading: '本機模型載入中...',
    unsupported: '請拖放或選擇 GLB、GLTF、OBJ、PLY、3MF 或 STL 檔案。OBJ 請連同 .mtl 與貼圖一起選取，才能保留材質。',
  },
  ja: {
    title: 'mixocreative · 3D/AR',
    languageLabel: '言語を切り替える',
    helpLabel: '使い方',
    aboutLabel: 'About',
    loadLocalLabel: 'ローカルモデルを読み込む',
    helpTitle: '使い方',
    diagramAlt: '画面上の操作ボタンの位置',
    stepModels: 'URL またはローカル読み込みに複数のモデルがある場合、ここに一覧表示されます。',
    stepArBefore: '対応しているスマートフォンでは、',
    stepArAfter: 'モデルを目の前の空間に配置できます。',
    stepInfo: 'ここでは3Dモデルの読み込み、説明の閲覧、製作者情報の確認ができます。',
    caveat: 'LINE、Facebook などのアプリ内ブラウザでは AR が開始できません。リンクをコピーして Chrome または Safari で開いてください。',
    aboutTitle: 'About',
    aboutBody: 'mixocreative の 3D/AR ビューアーです。',
    companyLink: 'mixocreative のサイトを開く',
    instagramLink: 'mixocreative Instagram を開く',
    close: '閉じる',
    loading: 'モデルを読み込んでいます...',
    noProduct: 'GLB、GLTF、OBJ、PLY、3MF、STL ファイルを選択すると、ここでプレビューできます。',
    failed: 'このモデルを読み込めませんでした。',
    fallback: '代替モデルを表示しています。',
    compressed: 'このモデルは、このビューアーに含まれていない圧縮形式を使用しています。Draco または KTX2 なしで再書き出ししてください。',
    arButton: '部屋に表示',
    alt: '3D モデル。ドラッグして回転できます。',
    models: 'モデルを選択',
    localLoading: 'ローカルモデルを読み込んでいます...',
    unsupported: 'GLB、GLTF、OBJ、PLY、3MF、STL ファイルをドロップまたは選択してください。OBJ は .mtl とテクスチャも一緒に選ぶとマテリアルが保持されます。',
  },
};

if (stage) {
  start(stage);
}

async function start(stage) {
  const strings = localizedStrings(stage, selectInitialLocale(readStoredLocale(), navigator.languages || [navigator.language]));
  const status = stage.querySelector('.ar-status');
  const models = modelsFromSearch(window.location.search, window.location.href);
  const state = {
    viewer: null,
    variants: null,
    objectUrls: [],
  };

  applyTranslations(strings);
  openSheets();
  enableLanguageSwitching(stage, strings);
  enableLocalModelLoading(stage, state, strings, status);
  showArButtonPreview(stage, strings, window.location.search);

  const { ModelViewerElement } = await import('../vendor/model-viewer/model-viewer.min.js');
  const decoderBase = new URL('../vendor/model-viewer/decoders/', import.meta.url).href;
  ModelViewerElement.dracoDecoderLocation = decoderBase + 'draco/';
  ModelViewerElement.ktx2TranscoderLocation = decoderBase + 'ktx2/';

  if (models.length === 0) {
    say(status, strings.noProduct);
    status.hidden = true;

    return;
  }

  showModels(stage, state, strings, status, models, false, strings.loading);
}

function enableLanguageSwitching(stage, strings) {
  const closeMenus = () => {
    for (const control of document.querySelectorAll('[data-lang-control]')) {
      const toggle = control.querySelector('[data-lang-toggle]');
      const menu = control.querySelector('[data-lang-menu]');

      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }

      if (menu) {
        menu.hidden = true;
      }
    }
  };

  const setLanguage = (locale) => {
    const nextStrings = localizedStrings(stage, locale);

    Object.assign(strings, nextStrings);
    writeStoredLocale(strings.locale);
    applyTranslations(strings);
    updateArButtonPreview(strings);
  };

  for (const button of document.querySelectorAll('[data-lang-toggle]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();

      const control = button.closest('[data-lang-control]');
      const menu = control ? control.querySelector('[data-lang-menu]') : null;

      if (!menu) {
        return;
      }

      const willOpen = menu.hidden;

      closeMenus();
      menu.hidden = !willOpen;
      button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  for (const option of document.querySelectorAll('[data-lang-option]')) {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      setLanguage(option.dataset.langOption);
      closeMenus();
    });
  }

  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus();
    }
  });
}

function showArButtonPreview(stage, strings, search) {
  const platform = arPreviewMode(search);

  if (platform === null) {
    return;
  }

  const preview = document.createElement('aside');
  preview.className = 'ar-preview-buttons';
  preview.setAttribute('aria-label', 'AR button preview');

  if (platform === 'ios' || platform === 'both') {
    preview.append(arPreviewButton('ios', strings.arButton));
  }

  if (platform === 'android' || platform === 'both') {
    preview.append(arPreviewButton('android', strings.arButton));
  }

  stage.append(preview);
}

function updateArButtonPreview(strings) {
  for (const label of document.querySelectorAll('[data-ar-preview-label]')) {
    label.textContent = 'AR';
  }
}

function arPreviewButton(platform, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ar-ar-button ar-preview-button ar-preview-' + platform;
  button.tabIndex = -1;
  button.setAttribute('aria-disabled', 'true');
  button.setAttribute('aria-label', label);

  button.append(arPreviewIcon(), previewLabel(platform));

  return button;
}

function arPreviewIcon() {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.classList.add('ar-glyph', 'ar-scan-glyph');
  svg.setAttribute('viewBox', '0 0 32 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = '<path class="ar-scan-corner" d="M2 7V2h5M25 2h5v5M30 17v5h-5M7 22H2v-5"/><path class="ar-scan-cube" d="M16 4 23 8 16 12 9 8zM9 9.5l7 4v7l-7-4zM23 9.5l-7 4v7l7-4z"/>';

  return svg;
}

function previewLabel(platform) {
  const label = document.createElement('span');
  label.dataset.arPreviewLabel = platform;
  label.setAttribute('aria-hidden', 'true');
  label.textContent = 'AR';

  return label;
}

export function arPreviewMode(search) {
  const params = new URLSearchParams(search || '');
  const value = (params.get('arPreview') || params.get('previewAr') || '').toLowerCase();

  if (value === 'ios' || value === 'iphone') {
    return 'ios';
  }

  if (value === 'android') {
    return 'android';
  }

  if (value === '1' || value === 'true' || value === 'both') {
    return 'both';
  }

  return null;
}

function applyTranslations(strings) {
  document.documentElement.lang = strings.locale;
  document.title = strings.title;

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = strings[element.dataset.i18n] || '';
  }

  for (const element of document.querySelectorAll('[data-i18n-aria]')) {
    element.setAttribute('aria-label', strings[element.dataset.i18nAria] || '');
  }

  for (const element of document.querySelectorAll('[data-i18n-alt]')) {
    element.setAttribute('alt', strings[element.dataset.i18nAlt] || '');
  }

  updateLanguageMenu(strings.locale);
}

function updateLanguageMenu(locale) {
  const normalized = normalizeLocale(locale) || 'en';

  for (const option of document.querySelectorAll('[data-lang-option]')) {
    const isCurrent = normalizeLocale(option.dataset.langOption) === normalized;

    option.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
  }
}

function localizedStrings(stage, locale) {
  const normalized = normalizeLocale(locale) || 'en';
  const pageStrings = normalizePageStrings(readStrings(stage));

  return {
    ...I18N.en,
    ...pageStrings,
    ...I18N[normalized],
    locale: normalized,
  };
}

function normalizePageStrings(strings) {
  const normalized = { ...strings };

  if (strings['no-product'] && !strings.noProduct) {
    normalized.noProduct = strings['no-product'];
  }

  if (strings['ar-button'] && !strings.arButton) {
    normalized.arButton = strings['ar-button'];
  }

  return normalized;
}

export function selectInitialLocale(savedLocale, browserLanguages = []) {
  return normalizeLocale(savedLocale) || detectLocale(browserLanguages) || 'en';
}

export function detectLocale(browserLanguages = []) {
  for (const language of browserLanguages) {
    const normalized = normalizeLocale(language);

    if (normalized) {
      return normalized;
    }
  }

  return 'en';
}

export function normalizeLocale(value) {
  const language = String(value || '').toLowerCase();

  if (language.startsWith('zh')) {
    return 'zh-Hant';
  }

  if (language.startsWith('ja')) {
    return 'ja';
  }

  if (language.startsWith('en')) {
    return 'en';
  }

  if (LOCALE_ORDER.includes(value)) {
    return value;
  }

  return null;
}

function readStoredLocale() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (failure) {
    return null;
  }
}

function writeStoredLocale(locale) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch (failure) {
    // Language switching still works for the current page when storage is unavailable.
  }
}

function placeholder(stage, baseUrl) {
  return {
    url: resolveModelUrl(stage.dataset.fallback, baseUrl),
    displayName: 'Placeholder',
    filename: 'Placeholder',
    size: '',
  };
}

function showModels(stage, state, strings, status, models, isFallback, message) {
  clearMountedModels(stage, state);

  const mounted = mount(stage, status, strings, models, isFallback, message);

  state.viewer = mounted.viewer;
  state.variants = mounted.variants;
  state.objectUrls = models.filter((model) => model.objectUrl).map((model) => model.url);
}

function clearMountedModels(stage, state) {
  const arButton = document.getElementById('ar-button');

  if (arButton) {
    arButton.hidden = true;
    stage.append(arButton);
  }

  if (state.viewer) {
    state.viewer.remove();
  }

  if (state.variants) {
    state.variants.remove();
  }

  for (const url of state.objectUrls) {
    URL.revokeObjectURL(url);
  }

  state.viewer = null;
  state.variants = null;
  state.objectUrls = [];
}

function mount(stage, status, strings, models, isFallback, message) {
  const first = modelSource(models[0], window.location.href);

  if (first === null) {
    say(status, strings.failed);

    return { viewer: null, variants: null };
  }

  let standing = message;
  say(status, standing, isFallback ? strings.fallback : '');

  const viewer = document.createElement('model-viewer');
  const attributes = {
    'camera-controls': '',
    'touch-action': 'pan-y',
    'auto-rotate': '',
    ar: '',
    'ar-modes': 'webxr scene-viewer quick-look',
    'ar-placement': 'floor',
    'shadow-intensity': '1',
    'shadow-softness': '1',
    'environment-image': 'neutral',
    'tone-mapping': 'commerce',
    exposure: '0.9',
    loading: 'eager',
    alt: strings.alt || '',
  };

  for (const name of Object.keys(attributes)) {
    viewer.setAttribute(name, attributes[name]);
  }

  const arButton = document.getElementById('ar-button');

  if (arButton) {
    arButton.hidden = false;
    viewer.append(arButton);
  }

  viewer.addEventListener('progress', (event) => {
    const total = event.detail.totalProgress;

    if (total >= 1) {
      return;
    }

    status.hidden = false;
    say(status, standing, isFallback ? strings.fallback : '', Math.round(total * 100) + '%');
  });

  viewer.addEventListener('load', () => {
    if (isFallback) {
      say(status, standing, strings.fallback);
      status.hidden = false;

      return;
    }

    status.hidden = true;
  });

  viewer.addEventListener('error', (event) => {
    const detail = (event.detail && event.detail.sourceError && event.detail.sourceError.message) || '';
    standing = /draco|ktx2|basis/i.test(detail) ? strings.compressed : strings.failed;
    status.hidden = false;

    if (isFallback) {
      say(status, standing);

      return;
    }

    isFallback = true;
    say(status, standing, strings.fallback);
    viewer.src = stage.dataset.fallback;
  });

  viewer.src = first;
  stage.append(viewer);

  let variants = null;

  if (models.length > 1) {
    variants = switcher(models, viewer, status, strings);
    stage.append(variants);
  }

  return { viewer, variants };
}

function switcher(models, viewer, status, strings) {
  const select = document.createElement('select');
  select.className = 'ar-variants';
  select.setAttribute('aria-label', strings.models || '');

  const urls = [];

  for (const model of models) {
    const url = modelSource(model, window.location.href);

    if (url === null) {
      continue;
    }

    const option = document.createElement('option');
    option.value = String(urls.length);
    option.textContent = model.size ? model.displayName + ' · ' + model.size : model.displayName;
    select.append(option);
    urls.push(url);
  }

  select.addEventListener('change', () => {
    const url = urls[Number(select.value)];

    if (url === undefined) {
      return;
    }

    say(status, strings.loading);
    status.hidden = false;
    viewer.src = url;
  });

  return select;
}

function modelSource(model, baseUrl) {
  if (!model) {
    return null;
  }

  if (model.objectUrl && typeof model.url === 'string' && model.url.startsWith('blob:')) {
    return model.url;
  }

  return allowedModelUrl(model.url, baseUrl);
}

function openSheets() {
  for (const button of document.querySelectorAll('[data-sheet]')) {
    button.addEventListener('click', () => {
      const sheet = document.getElementById(button.dataset.sheet);

      if (sheet && typeof sheet.showModal === 'function') {
        sheet.showModal();
      }
    });
  }
}

function enableLocalModelLoading(stage, state, strings, status) {
  const input = document.getElementById('model-file-input');
  const pickers = document.querySelectorAll('[data-pick-model]');
  const pickerLabels = document.querySelectorAll('label[for="model-file-input"]');

  const load = async (files) => {
    say(status, strings.localLoading || 'Loading local model...');
    status.hidden = false;

    try {
      const models = await modelsFromDroppedFiles(files, {
        createObjectURL: (file) => URL.createObjectURL(file),
        convertMeshToGlbUrl: convertLocalMeshToGlbUrl,
      });

      if (models.length === 0) {
        say(status, strings.unsupported || 'Drop or choose a GLB, GLTF, STL, or OBJ file.');

        return;
      }

      showModels(stage, state, strings, status, models, false, strings.loading);
    } catch (failure) {
      console.warn('Local model could not be loaded', failure);
      say(status, strings.failed);
      status.hidden = false;
    }
  };

  if (input) {
    for (const pick of pickers) {
      pick.addEventListener('click', () => input.click());
    }

    for (const label of pickerLabels) {
      label.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        input.click();
      });
    }
  }

  if (input) {
    input.addEventListener('change', () => {
      load(input.files || []);
      input.value = '';
    });
  }

  stage.addEventListener('dragenter', (event) => {
    event.preventDefault();
    stage.classList.add('ar-drop-active');
  });

  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  stage.addEventListener('dragleave', (event) => {
    if (event.target === stage) {
      stage.classList.remove('ar-drop-active');
    }
  });

  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('ar-drop-active');
    load(event.dataTransfer ? event.dataTransfer.files : []);
  });
}

/**
 * Group dropped files into models plus the companion files they depend on.
 *
 * An OBJ is not self-contained: it names a .mtl, which in turn names a texture. Dropping
 * all three used to produce one untextured model and two ignored files, so the material
 * was silently lost. Companions are matched to the model sharing their base name; when a
 * single model is dropped every companion belongs to it.
 */
export function groupDroppedFiles(files) {
  const all = Array.from(files || []);
  const models = all.filter((file) => modelKindFromName(file.name) !== null);
  const companions = all.filter((file) => modelKindFromName(file.name) === null);

  return models.map((model) => {
    const stem = fileStem(model.name);
    const mine = companions.filter((companion) => (
      models.length === 1 || fileStem(companion.name).startsWith(stem)
    ));

    return {
      model,
      companions: new Map(mine.map((companion) => [companion.name.toLowerCase(), companion])),
    };
  });
}

export async function modelsFromDroppedFiles(files, options = {}) {
  const createObjectURL = options.createObjectURL;
  const convertMeshToGlbUrl = options.convertMeshToGlbUrl;
  const models = [];

  for (const { model, companions } of groupDroppedFiles(files)) {
    const kind = modelKindFromName(model.name);

    if (kind === 'viewer' && createObjectURL) {
      models.push(localModel(createObjectURL(model), model));
    }

    if (kind === 'mesh' && convertMeshToGlbUrl) {
      models.push(localModel(
        await convertMeshToGlbUrl(model, modelExtensionFromName(model.name), companions),
        model,
      ));
    }
  }

  return models;
}

function fileStem(name) {
  const base = String(name || '').split(/[\\/]/).pop();
  const dot = base.lastIndexOf('.');

  return (dot === -1 ? base : base.slice(0, dot)).toLowerCase();
}

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

/**
 * Parse an ASCII PLY, keeping per-vertex colour when the file carries it.
 *
 * Written by hand rather than taken from a loader because the common PLY handlers treat
 * the extension as gaussian-splat data, which misreads an ordinary mesh.
 */
export function parsePlyMesh(text) {
  const lines = String(text).split(/\r?\n/);
  const headerEnd = lines.findIndex((line) => line.trim() === 'end_header');

  if (headerEnd === -1) {
    throw new Error('PLY header is missing end_header');
  }

  let vertexCount = 0;
  let faceCount = 0;
  let element = '';
  const properties = [];

  for (const raw of lines.slice(0, headerEnd)) {
    const parts = raw.trim().split(/\s+/);

    if (parts[0] === 'element') {
      element = parts[1];

      if (element === 'vertex') {
        vertexCount = Number(parts[2]);
      }

      if (element === 'face') {
        faceCount = Number(parts[2]);
      }
    }

    if (parts[0] === 'property' && parts[1] !== 'list' && element === 'vertex') {
      properties.push(parts[2]);
    }
  }

  const body = lines.slice(headerEnd + 1).filter((line) => line.trim() !== '');
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  let hasColour = false;

  for (let index = 0; index < vertexCount; index += 1) {
    const values = body[index].trim().split(/\s+/).map(Number);
    const row = {};

    properties.forEach((name, at) => {
      row[name] = values[at];
    });

    positions.set([row.x || 0, row.y || 0, row.z || 0], index * 3);

    if (typeof row.red === 'number') {
      hasColour = true;
      colors.set([row.red / 255, row.green / 255, row.blue / 255], index * 3);
    } else {
      colors.set([1, 1, 1], index * 3);
    }
  }

  const indices = [];

  for (let index = 0; index < faceCount; index += 1) {
    const values = body[vertexCount + index].trim().split(/\s+/).map(Number);
    const corners = values.slice(1, values[0] + 1);

    for (let corner = 1; corner + 1 < corners.length; corner += 1) {
      indices.push(corners[0], corners[corner], corners[corner + 1]);
    }
  }

  return {
    positions,
    indices: new Uint32Array(indices),
    colors: hasColour ? colors : null,
  };
}

/**
 * Pull the geometry out of a 3MF model document.
 *
 * Matched with regular expressions rather than DOMParser so the same code runs in the
 * browser and under `node --test`; the document is machine written and its vertex and
 * triangle elements are flat.
 */
export function parse3mfModelXml(xml) {
  const text = String(xml);
  const positions = [];
  const indices = [];

  const vertexPattern = /<vertex\b([^>]*)\/?>/g;
  const trianglePattern = /<triangle\b([^>]*)\/?>/g;

  for (const match of text.matchAll(vertexPattern)) {
    positions.push(attributeNumber(match[1], 'x'), attributeNumber(match[1], 'y'), attributeNumber(match[1], 'z'));
  }

  for (const match of text.matchAll(trianglePattern)) {
    indices.push(attributeNumber(match[1], 'v1'), attributeNumber(match[1], 'v2'), attributeNumber(match[1], 'v3'));
  }

  if (positions.length === 0) {
    throw new Error('3MF document contains no vertices');
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices), colors: null };
}

function attributeNumber(attributes, name) {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(attributes);

  return match ? Number(match[1]) : 0;
}

/**
 * Inflate one entry from a ZIP archive, which is all a 3MF container is.
 *
 * DecompressionStream is used so no zip library has to be vendored.
 */
export async function readZipEntry(buffer, wanted) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();

  for (let at = 0; at + 30 <= bytes.length; at += 1) {
    if (view.getUint32(at, true) !== 0x04034b50) {
      continue;
    }

    const method = view.getUint16(at + 8, true);
    const compressedSize = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const extraLength = view.getUint16(at + 28, true);
    const name = decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength));

    if (name !== wanted) {
      continue;
    }

    const start = at + 30 + nameLength + extraLength;
    const payload = bytes.subarray(start, start + compressedSize);

    if (method === 0) {
      return decoder.decode(payload);
    }

    const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

    return await new Response(stream).text();
  }

  return null;
}

function modelExtensionFromName(name) {
  return String(name || '').toLowerCase().split('.').pop();
}

function localModel(url, file) {
  return {
    url,
    displayName: file.name,
    filename: file.name,
    size: formatBytes(file.size),
    objectUrl: true,
  };
}

async function convertLocalMeshToGlbUrl(file, _extension, companions = new Map()) {
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
  const buffer = await file.arrayBuffer();
  const extension = modelExtensionFromName(file.name);
  const root = await meshObjectFor(extension, buffer, {
    three,
    STLLoader,
    OBJLoader,
    MTLLoader,
    companions,
  });
  const scene = new three.Scene();

  centerObject(root, three);
  scene.add(root);

  const glb = await exportGlb(scene, new GLTFExporter());
  const blob = new Blob([glb], { type: 'model/gltf-binary' });

  return URL.createObjectURL(blob);
}

function stlToObject(buffer, three, STLLoader) {
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();

  return new three.Mesh(
    geometry,
    new three.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.75, metalness: 0.05 })
  );
}

async function objToObject(buffer, three, OBJLoader, MTLLoader, companions = new Map()) {
  const text = new TextDecoder().decode(buffer);
  const loader = new OBJLoader();
  const blobUrls = [];

  // An OBJ names its .mtl, and the .mtl names its textures. Both were dropped alongside
  // the model, so a LoadingManager rewrites those relative names onto the blobs we hold.
  const materialFile = findCompanion(companions, text.match(/^\s*mtllib\s+(.+)$/m)?.[1], 'mtl');

  let texturesReady = Promise.resolve();

  if (materialFile) {
    const manager = new three.LoadingManager();
    let startedLoading = false;

    manager.onStart = () => {
      startedLoading = true;
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
        texturesReady = Promise.race([settled, delay(TEXTURE_LOAD_TIMEOUT_MS)]);
      }
    } catch (failure) {
      console.warn('The .mtl file could not be applied', failure);
    }
  }

  const object = loader.parse(text);

  await texturesReady;
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

function say(status, line, second, percent) {
  status.textContent = line || '';

  if (second) {
    status.append(document.createElement('br'), second);
  }

  if (percent) {
    const figure = document.createElement('span');
    figure.className = 'ar-progress';
    figure.textContent = percent;
    status.append(figure);
  }
}

export function modelsFromSearch(search, baseUrl = 'https://example.com/') {
  const params = new URLSearchParams(search || '');
  const models = [];

  for (const model of modelsFromJson(params.get('models'), baseUrl)) {
    models.push(model);
  }

  const repeatedUrls = [
    ...params.getAll('model'),
    ...params.getAll('url'),
  ];
  const names = [
    ...params.getAll('name'),
    ...params.getAll('title'),
  ];
  const sizes = params.getAll('size');

  repeatedUrls.forEach((url, index) => {
    const model = normalizeModel({
      url,
      name: names[index],
      size: sizes[index],
    }, baseUrl);

    if (model) {
      models.push(model);
    }
  });

  const single = normalizeModel({
    url: params.get('src'),
    name: params.get('name') || params.get('title'),
    size: params.get('size'),
  }, baseUrl);

  if (single && repeatedUrls.length === 0) {
    models.push(single);
  }

  return models;
}

function modelsFromJson(value, baseUrl) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const entries = Array.isArray(parsed) ? parsed : parsed.models;

    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map((entry) => normalizeModel(entry, baseUrl)).filter(Boolean);
  } catch (failure) {
    return [];
  }
}

function normalizeModel(entry, baseUrl) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const rawUrl = entry.url || entry.src || entry.href || entry.model;
  const url = resolveModelUrl(rawUrl, baseUrl);

  if (url === null) {
    return null;
  }

  const displayName = cleanLabel(entry.displayName || entry.name || entry.title || filenameFromUrl(url));

  return {
    url,
    displayName,
    filename: displayName,
    size: cleanLabel(entry.size || ''),
  };
}

function resolveModelUrl(rawUrl, baseUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return null;
  }

  return allowedModelUrl(rawUrl.trim(), baseUrl);
}

function allowedModelUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.href;
  } catch (failure) {
    return null;
  }
}

function filenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const file = parsed.pathname.split('/').filter(Boolean).pop();

    return file ? decodeURIComponent(file) : 'Model';
  } catch (failure) {
    return 'Model';
  }
}

function formatBytes(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size <= 0) {
    return '';
  }

  if (size < 1024) {
    return size + ' B';
  }

  if (size < 1024 * 1024) {
    return (size / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
  }

  return (size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
}

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readStrings(stage) {
  try {
    return JSON.parse(stage.dataset.strings || '{}');
  } catch (failure) {
    return {};
  }
}

async function meshObjectFor(extension, buffer, deps) {
  const { three, STLLoader, OBJLoader, MTLLoader, companions } = deps;

  if (extension === 'stl') {
    return stlToObject(buffer, three, STLLoader);
  }

  if (extension === 'ply') {
    return parsedMeshToObject(parsePlyMesh(new TextDecoder().decode(buffer)), three);
  }

  if (extension === '3mf') {
    const document = await readZipEntry(buffer, '3D/3dmodel.model');

    if (!document) {
      throw new Error('3MF archive has no 3D/3dmodel.model');
    }

    return parsedMeshToObject(parse3mfModelXml(document), three);
  }

  return objToObject(buffer, three, OBJLoader, MTLLoader, companions);
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
