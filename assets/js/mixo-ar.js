import { listZipEntries } from './zip-entries.js';

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
    loadFolderLabel: 'Open a folder',
    helpTitle: 'How to use this',
    diagramAlt: 'Where the controls are on the screen',
    stepModels: 'If the link lists more than one model, they are listed here. A file you open from this device shows one model at a time.',
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
    phase_reading: 'Reading the file...',
    phase_parsing: 'Reading the geometry...',
    phase_materials: 'Loading materials and textures...',
    phase_exporting: 'Preparing it for viewing...',
    phase_displaying: 'Loading the model...',
    textureSlow: 'A texture took too long to load, so the model is shown without it.',
    largeModel: 'This model is {size}. Converting it can take a while on a phone.',
    noUnzip: 'This browser cannot open compressed archives. Try Chrome, Edge, or a recent Safari, or choose the files individually.',
    blocked: 'The site hosting this model does not allow other sites to read it.',
    missingMaterial: 'This model needs a .mtl file that was not included, so it is shown without its material. Open its folder, choose a .zip holding all of it, or select the .mtl and texture alongside it.',
    unsupported: 'Drop or choose a GLB, GLTF, OBJ, PLY, 3MF, or STL file, or a .zip holding a model with its .mtl and texture.',
  },
  'zh-Hant': {
    title: 'mixocreative · 3D/AR',
    languageLabel: '切換語言',
    helpLabel: '使用說明',
    aboutLabel: '關於',
    loadLocalLabel: '載入本機模型',
    loadFolderLabel: '開啟資料夾',
    helpTitle: '使用說明',
    diagramAlt: '畫面控制位置',
    stepModels: '如果連結包含多個模型，會在這裡列出。從裝置開啟的檔案一次顯示一個模型。',
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
    phase_reading: '正在讀取檔案…',
    phase_parsing: '正在讀取幾何資料…',
    phase_materials: '正在載入材質與貼圖…',
    phase_exporting: '正在準備顯示…',
    phase_displaying: '模型載入中…',
    textureSlow: '貼圖載入逾時，改以無貼圖方式顯示。',
    largeModel: '這個模型有 {size}，在手機上轉換可能需要一些時間。',
    noUnzip: '此瀏覽器無法開啟壓縮檔。請改用 Chrome、Edge 或較新的 Safari，或改為個別選取檔案。',
    blocked: '存放這個模型的網站不允許其他網站讀取它。',
    missingMaterial: '這個模型需要的 .mtl 檔案未被包含，因此不顯示材質。請開啟它所在的資料夾、選擇包含全部檔案的 .zip，或連同 .mtl 與貼圖一起選取。',
    unsupported: '請拖放或選擇 GLB、GLTF、OBJ、PLY、3MF 或 STL 檔案，或包含模型與 .mtl、貼圖的 .zip。',
  },
  ja: {
    title: 'mixocreative · 3D/AR',
    languageLabel: '言語を切り替える',
    helpLabel: '使い方',
    aboutLabel: 'About',
    loadLocalLabel: 'ローカルモデルを読み込む',
    loadFolderLabel: 'フォルダを開く',
    helpTitle: '使い方',
    diagramAlt: '画面上の操作ボタンの位置',
    stepModels: 'リンクに複数のモデルが含まれる場合、ここに一覧表示されます。端末から開いたファイルは一度に 1 つのモデルを表示します。',
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
    phase_reading: 'ファイルを読み込んでいます…',
    phase_parsing: '形状データを読み込んでいます…',
    phase_materials: 'マテリアルとテクスチャを読み込んでいます…',
    phase_exporting: '表示の準備をしています…',
    phase_displaying: 'モデルを読み込んでいます…',
    textureSlow: 'テクスチャの読み込みに時間がかかったため、テクスチャなしで表示します。',
    largeModel: 'このモデルは {size} です。スマートフォンでは変換に時間がかかることがあります。',
    noUnzip: 'このブラウザーは圧縮ファイルを開けません。Chrome、Edge、または新しい Safari をお使いいただくか、ファイルを個別に選んでください。',
    blocked: 'このモデルを配信しているサイトが、他サイトからの読み込みを許可していません。',
    missingMaterial: 'このモデルが必要とする .mtl ファイルが含まれていないため、マテリアルなしで表示します。モデルのあるフォルダを開く、すべてを含む .zip を選ぶ、または .mtl とテクスチャも一緒に選んでください。',
    unsupported: 'GLB、GLTF、OBJ、PLY、3MF、STL ファイル、またはモデルと .mtl・テクスチャを含む .zip をドロップまたは選択してください。',
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

    // Displaying is the final phase of the bar, so a local conversion does not jump
    // back to a small number once the converted GLB starts loading.
    const overall = phaseProgress('displaying', total);

    status.hidden = false;
    say(status, standing, isFallback ? strings.fallback : '', Math.round(overall * 100) + '%', overall);
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

  // A link can point at an .obj, .ply, .3mf or .stl. Those are fetched, their
  // dependencies resolved from the same folder, and converted before display.
  if (modelKindFromName(String(first).split('?')[0]) === 'mesh') {
    viewer.removeAttribute('src');
    viewableModelUrl(first).then((ready) => {
      viewer.src = ready;
    }).catch((failure) => {
      isFallback = true;

      if (failure && failure.message === 'MODEL_FETCH_BLOCKED') {
        standing = strings.blocked;
      }

      say(status, standing, strings.fallback);
      status.hidden = false;
      viewer.src = stage.dataset.fallback;
    });
  } else {
    viewer.src = first;
  }

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

    viewableModelUrl(url).then((ready) => {
      viewer.src = ready;
    }).catch((failure) => {
      say(status, failure && failure.message === 'MODEL_FETCH_BLOCKED' ? strings.blocked : strings.failed);
      status.hidden = false;
    });
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

/**
 * iOS filters the file picker by uniform type identifier, not by extension. It knows
 * nothing about .obj, .mtl, .ply or .3mf, so those entries grey the files out instead of
 * allowing them, and the companion files an OBJ needs cannot be selected at all.
 *
 * Only iOS is relaxed. Every other platform keeps the explicit list, which is what makes
 * the picker helpful there.
 */
/**
 * Converting a large mesh on a phone takes real time and memory, and the work happens
 * before anything can be shown. Warn instead of appearing to hang.
 */
export const LARGE_MODEL_BYTES = 8 * 1024 * 1024;

export function isLargeForConversion(file) {
  const name = String(file?.name || '').toLowerCase();
  const alreadyViewable = name.endsWith('.glb') || name.endsWith('.gltf');

  // GLB needs no conversion, so its size is the browser's problem, not ours.
  return !alreadyViewable && Number(file?.size || 0) >= LARGE_MODEL_BYTES;
}

/**
 * Which accept value the picker should use, or null meaning drop the attribute.
 *
 * iOS does not implement accept with filename extensions, so entries like .obj and .mtl
 * grey those files out rather than allowing them. Its handling of media types is
 * unreliable as well: "application/pdf" lets everything through, while
 * "image/jpeg, application/pdf" allows only JPEG.
 *
 * Omitting the attribute is the documented way to allow every type. A wildcard is not
 * specified to mean the same thing, and given the above it is not safe to assume iOS
 * treats it that way.
 *
 * Only iOS is affected; everywhere else keeps the explicit list, which is what makes the
 * picker useful there.
 */
/**
 * Whether this browser can hand over a whole folder.
 *
 * Choosing a folder is the only way a single action can bring a model and every file it
 * depends on, since a page cannot read a file that was not selected. Desktop browsers
 * all support it and Safari on iOS gained it in 18.4; Chrome on Android does not.
 */
export function supportsFolderPicking(inputPrototype) {
  return Boolean(inputPrototype) && 'webkitdirectory' in inputPrototype;
}

export function acceptAttributeFor(userAgent, platform, maxTouchPoints, current) {
  const ua = String(userAgent || '');
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS reports itself as a Mac, and is only distinguishable by touch support.
  const isIpadOS = String(platform || '') === 'MacIntel' && Number(maxTouchPoints || 0) > 1;

  return isIosDevice || isIpadOS ? null : current;
}

function enableLocalModelLoading(stage, state, strings, status) {
  const input = document.getElementById('model-file-input');
  const pickers = document.querySelectorAll('[data-pick-model]');
  const pickerLabels = document.querySelectorAll('label[for="model-file-input"]');

  const folderInput = document.getElementById('model-folder-input');

  if (folderInput && supportsFolderPicking(window.HTMLInputElement && window.HTMLInputElement.prototype)) {
    for (const label of document.querySelectorAll('[data-folder-pick]')) {
      label.hidden = false;
    }

    folderInput.addEventListener('change', () => {
      load(folderInput.files || []);
      folderInput.value = '';
    });
  }

  if (input) {
    const accept = acceptAttributeFor(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
      input.getAttribute('accept'),
    );

    if (accept === null) {
      input.removeAttribute('accept');
    } else {
      input.setAttribute('accept', accept);
    }
  }

  const load = async (files) => {
    say(status, strings.localLoading || 'Loading local model...', '', '0%', 0);
    status.hidden = false;

    let warning = '';

    const heavy = [...(files || [])].find((file) => isLargeForConversion(file));

    if (heavy) {
      warning = (strings.largeModel || '').replace('{size}', formatBytes(heavy.size));
    }

    const report = (phase, fraction, warningKey) => {
      if (warningKey) {
        warning = strings[warningKey] || '';
      }

      const label = strings[`phase_${phase}`] || strings.localLoading || 'Loading local model...';

      if (fraction === null) {
        say(status, label, warning, '', null);

        return;
      }

      const overall = phaseProgress(phase, fraction);

      say(status, label, warning, Math.round(overall * 100) + '%', overall);
    };

    try {
      const models = await modelsFromDroppedFiles(files, {
        createObjectURL: (file) => URL.createObjectURL(file),
        convertMeshToGlbUrl: convertLocalMeshToGlbUrl,
        onProgress: report,
      });

      if (models.length === 0) {
        say(status, strings.unsupported || 'Drop or choose a GLB, GLTF, STL, or OBJ file.');

        return;
      }

      showModels(stage, state, strings, status, models, false, strings.loading);
    } catch (failure) {
      console.warn('Local model could not be loaded', failure);
      // Name the cause when we know it, rather than the same generic line every time.
      const reason = failure && failure.message === 'UNZIP_UNSUPPORTED'
        ? strings.noUnzip
        : strings.failed;

      say(status, reason);
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
    // Prefer the companion whose name matches exactly, so chair.obj cannot claim
    // chair_v2.mtl just because one name is a prefix of the other.
    const mine = companions.filter((companion) => {
      if (models.length === 1) {
        return true;
      }

      const companionStem = fileStem(companion.name);

      if (companionStem === stem) {
        return true;
      }

      const closer = models.some((other) => (
        other !== model && companionStem.startsWith(fileStem(other.name))
        && fileStem(other.name).length > stem.length
      ));

      return companionStem.startsWith(stem) && !closer;
    });

    return {
      model,
      companions: new Map(mine.map((companion) => [companion.name.toLowerCase(), companion])),
    };
  });
}

/**
 * Build the model to show from files the user picked.
 *
 * A local load is deliberately one model at a time, on phone and desktop alike: the
 * extra files in a selection are an OBJ's .mtl and texture, not more models. Lists of
 * several models come from the URL, where they can also be hosted elsewhere.
 */
/**
 * Expand a selected .zip into the files it holds.
 *
 * Picking one archive is the only way to bring an OBJ and its .mtl and texture together
 * in a single choice, which is what makes this usable on a phone.
 */
export async function expandArchives(files, options = {}) {
  const read = options.listZipEntries || listZipEntries;
  const expanded = [];

  for (const file of Array.from(files || [])) {
    if (!String(file.name || '').toLowerCase().endsWith('.zip')) {
      expanded.push(file);
      continue;
    }

    const entries = await read(await file.arrayBuffer());

    for (const entry of entries) {
      expanded.push(new File([entry.data], String(entry.name).split('/').pop()));
    }
  }

  return expanded;
}

export async function modelsFromDroppedFiles(files, options = {}) {
  const createObjectURL = options.createObjectURL;
  const convertMeshToGlbUrl = options.convertMeshToGlbUrl;
  const models = [];
  const selected = await expandArchives(files, options);

  for (const { model, companions } of groupDroppedFiles(selected).slice(0, 1)) {
    const kind = modelKindFromName(model.name);

    if (kind === 'viewer' && createObjectURL) {
      models.push(localModel(createObjectURL(model), model));
    }

    if (kind === 'mesh' && convertMeshToGlbUrl) {
      models.push(localModel(
        await convertMeshToGlbUrl(model, modelExtensionFromName(model.name), companions, options.onProgress),
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
/**
 * Phases a local conversion moves through, with the share of the bar each one owns.
 *
 * The viewer used to show model-viewer's own fetch progress, which only covers the
 * finished GLB and sat at 99% while the real work - parsing and exporting - happened.
 * These weights are rough measurements of where the time actually goes.
 */
export const conversionPhases = [
  { key: 'reading', weight: 0.08 },
  { key: 'parsing', weight: 0.42 },
  { key: 'materials', weight: 0.15 },
  { key: 'exporting', weight: 0.25 },
  { key: 'displaying', weight: 0.10 },
];

/** Map a fraction within one phase onto overall progress between 0 and 1. */
export function phaseProgress(key, fraction) {
  const clamped = Math.min(1, Math.max(0, Number(fraction) || 0));
  let start = 0;

  for (const phase of conversionPhases) {
    if (phase.key === key) {
      return round(start + phase.weight * clamped);
    }

    start += phase.weight;
  }

  return round(clamped);
}

function round(value) {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

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

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/**
 * Report progress and hand the thread back often enough for the bar to repaint.
 *
 * Without this the parse blocks the frame and the bar jumps from 0 to done, which is
 * exactly the dishonest progress this replaces.
 */
async function maybeYield(lastYield, onProgress, fraction) {
  if (now() - lastYield < 16) {
    return lastYield;
  }

  if (onProgress) {
    onProgress(Math.min(1, Math.max(0, fraction)));
  }

  await new Promise((resolve) => setTimeout(resolve, 0));

  return now();
}

export async function readZipEntry(buffer, wanted, options = {}) {
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

    // A model document is text; a 3MF texture is read as raw bytes.
    if (method === 0) {
      return options.binary ? payload.slice() : decoder.decode(payload);
    }

    if (typeof DecompressionStream === 'undefined') {
      throw new Error('UNZIP_UNSUPPORTED');
    }

    const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

    const inflated = new Response(stream);

    return options.binary ? new Uint8Array(await inflated.arrayBuffer()) : await inflated.text();
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


/**
 * Fetch the files an OBJ depends on, from the folder it was served out of.
 *
 * An OBJ names its .mtl, and the .mtl names its texture. When the model comes from a
 * URL those files sit beside it, so they can be fetched rather than asked for. This is
 * what lets a link to an .obj display with its material on any device - nothing is
 * selected by hand, so it behaves the same on a phone as on a desktop.
 *
 * They are returned as File objects so the same code path that handles hand-picked
 * companions can be reused unchanged.
 */
async function companionsFromUrl(objText, modelUrl) {
  const companions = new Map();
  const folder = modelUrl.split('?')[0].replace(/[^/]*$/, '');

  const named = (line, tag) => {
    const trimmed = line.trim();

    return trimmed.startsWith(tag) ? trimmed.slice(tag.length).trim() : null;
  };

  const grab = async (name) => {
    const leaf = String(name).split(/[\\/]/).pop();

    try {
      const response = await fetch(folder + encodeURIComponent(leaf));

      if (!response.ok) {
        return null;
      }

      const file = new File([await response.blob()], leaf);

      companions.set(leaf.toLowerCase(), file);

      return file;
    } catch {
      return null;
    }
  };

  const materialName = objText.split(/\r?\n/).map((line) => named(line, 'mtllib')).find(Boolean);

  if (!materialName) {
    return companions;
  }

  const materialFile = await grab(materialName);

  if (!materialFile) {
    return companions;
  }

  const textureName = (await materialFile.text())
    .split(/\r?\n/)
    .map((line) => named(line, 'map_Kd'))
    .find(Boolean);

  if (textureName) {
    await grab(textureName);
  }

  return companions;
}

/** Convert a mesh served from a URL into a GLB the viewer and AR can use. */
async function convertUrlMeshToGlbUrl(modelUrl, report = () => {}) {
  report('reading', 0);

  let response;

  try {
    response = await fetch(modelUrl);
  } catch {
    // A host that does not allow cross-origin reads rejects before any status exists,
    // so this is indistinguishable from being offline - but the usual cause is CORS,
    // and the fix is on the server holding the model rather than here.
    throw new Error('MODEL_FETCH_BLOCKED');
  }

  if (!response.ok) {
    throw new Error(`Could not fetch the model (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const extension = modelExtensionFromName(modelUrl.split('?')[0]);
  const companions = extension === 'obj'
    ? await companionsFromUrl(new TextDecoder().decode(buffer), modelUrl)
    : new Map();

  report('reading', 1);

  return await glbFromBuffer(extension, buffer, companions, report);
}

/**
 * A model URL the viewer can actually display: glTF passes through, anything else is
 * converted first. Used for links and for the model switcher alike.
 */
async function viewableModelUrl(url, report = () => {}) {
  if (typeof url !== 'string' || url.startsWith('blob:')) {
    return url;
  }

  if (modelKindFromName(url.split('?')[0]) !== 'mesh') {
    return url;
  }

  return await convertUrlMeshToGlbUrl(url, report);
}

async function convertLocalMeshToGlbUrl(file, _extension, companions = new Map(), report = () => {}) {
  // `report(phase, fraction, warningKey)` - a warning is shown without stopping the load.
  report('reading', 0);

  const buffer = await file.arrayBuffer();

  report('reading', 1);

  return await glbFromBuffer(modelExtensionFromName(file.name), buffer, companions, report);
}

/**
 * Shared conversion: build the mesh, centre it, and serialise it to a GLB blob URL.
 *
 * Both a hand-picked file and a model fetched from a URL end up here, so the two paths
 * cannot drift apart in how they handle materials, colour or progress.
 */
async function glbFromBuffer(extension, buffer, companions, report = () => {}) {
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

  report('parsing', 0);
  // Let the label paint before a synchronous loader takes the thread.
  await new Promise((resolve) => setTimeout(resolve, 0));

  const root = await meshObjectFor(extension, buffer, {
    three,
    STLLoader,
    OBJLoader,
    MTLLoader,
    companions,
    onParseProgress: (fraction) => report('parsing', fraction),
    onMaterialProgress: (fraction) => report('materials', fraction),
    onTextureTimeout: () => report('materials', 1, 'textureSlow'),
    onMissingMaterial: () => report('materials', 1, 'missingMaterial'),
  });

  report('parsing', 1);

  const scene = new three.Scene();

  standUpright(root, extension, three);
  centerObject(root, three);
  scene.add(root);

  // The GLTF exporter has no progress hook, so this step is honestly indeterminate.
  report('exporting', null);

  const glb = await exportGlb(scene, new GLTFExporter());

  report('exporting', 1);

  return URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
}

function stlToObject(buffer, three, STLLoader) {
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();

  return new three.Mesh(
    geometry,
    new three.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.75, metalness: 0.05 })
  );
}

async function objToObject(buffer, three, OBJLoader, MTLLoader, companions = new Map(), hooks = {}) {
  const onMaterialProgress = hooks.onMaterialProgress || (() => {});
  const onTextureTimeout = hooks.onTextureTimeout || (() => {});
  const text = new TextDecoder().decode(buffer);
  const loader = new OBJLoader();
  const blobUrls = [];

  // An OBJ names its .mtl, and the .mtl names its textures. Both were dropped alongside
  // the model, so a LoadingManager rewrites those relative names onto the blobs we hold.
  const declaredMaterial = text.match(/^\s*mtllib\s+(.+)$/m)?.[1] || null;
  const materialFile = findCompanion(companions, declaredMaterial, 'mtl');

  // The OBJ asked for a material that was not in the selection. Say so, because the
  // model will look untextured and the cause is not obvious - especially on iOS, where
  // choosing several files at once is hidden behind Browse, then the "..." menu, then
  // Select.
  if (declaredMaterial && !materialFile) {
    hooks.onMissingMaterial?.();
  }

  let texturesReady = Promise.resolve({ timedOut: false });

  if (materialFile) {
    const manager = new three.LoadingManager();
    let startedLoading = false;

    manager.onStart = () => {
      startedLoading = true;
      onMaterialProgress(0.05);
    };

    // Real texture counts, so the bar moves while images download rather than sitting
    // still through the slowest part of a textured load.
    manager.onProgress = (_url, loaded, total) => {
      onMaterialProgress(total > 0 ? loaded / total : 0.5);
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
        // A slow or missing texture must not hang the load, but it must not fail
        // silently either: the caller is told so it can say what happened.
        texturesReady = Promise.race([
          settled.then(() => ({ timedOut: false })),
          delay(TEXTURE_LOAD_TIMEOUT_MS).then(() => ({ timedOut: true })),
        ]);
      }
    } catch (failure) {
      console.warn('The .mtl file could not be applied', failure);
    }
  }

  const object = loader.parse(text);
  const outcome = (await texturesReady) || { timedOut: false };

  onMaterialProgress(1);

  if (outcome.timedOut) {
    onTextureTimeout();
  }
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

/**
 * Turn a Z-up file so it stands the right way in the Y-up viewer.
 *
 * 3MF is Z-up by definition, so without this a model arrives lying on its back: what
 * should face the sky faces the camera instead. STL carries no axis of its own, but the
 * slicers and CAD tools that write it all treat Z as up, so it is turned the same way.
 */
const Z_UP_FORMATS = new Set(['3mf', 'stl']);

function standUpright(object, extension, three) {
  if (!Z_UP_FORMATS.has(extension)) {
    return;
  }

  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
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

function say(status, line, second, percent, fraction) {
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

  if (fraction === null || typeof fraction === 'number') {
    const track = document.createElement('span');
    const fill = document.createElement('span');

    track.className = 'ar-progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    fill.className = 'ar-progress-fill';

    if (fraction === null) {
      // Some steps report nothing at all - the GLTF exporter has no progress hook -
      // so the bar says "working" instead of inventing a number.
      track.classList.add('is-indeterminate');
      track.removeAttribute('aria-valuenow');
    } else {
      track.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
      fill.style.width = `${Math.round(fraction * 100)}%`;
    }

    track.append(fill);
    status.append(track);
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
    return parsedMeshToObject(await parsePlyMesh(buffer, { onProgress: deps.onParseProgress }), three);
  }

  if (extension === '3mf') {
    const document = await readZipEntry(buffer, '3D/3dmodel.model');

    if (!document) {
      throw new Error('3MF archive has no 3D/3dmodel.model');
    }

    const parsed = await parse3mfModelXml(document, { onProgress: deps.onParseProgress });

    if (parsed.groups) {
      return materialsToObject(parsed.groups, three, (path) => readZipEntry(buffer, path, { binary: true }));
    }

    return parsedMeshToObject(parsed, three);
  }

  return objToObject(buffer, three, OBJLoader, MTLLoader, companions, {
    onMaterialProgress: deps.onMaterialProgress,
    onTextureTimeout: deps.onTextureTimeout,
    onMissingMaterial: deps.onMissingMaterial,
  });
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

/**
 * Build a 3MF's coloured and textured groups: one mesh each, with a texture, a solid
 * colour or vertex colours on a MeshStandardMaterial like the plain meshes use.
 */
async function materialsToObject(groups, three, readTexture) {
  const root = new three.Group();
  const textures = new Map();

  for (const group of groups) {
    const geometry = new three.BufferGeometry();

    geometry.setAttribute('position', new three.BufferAttribute(group.positions, 3));

    if (group.indices) {
      geometry.setIndex(new three.BufferAttribute(group.indices, 1));
    }

    const material = new three.MeshStandardMaterial({
      color: 0xb8b8b8,
      roughness: 0.75,
      metalness: 0.05,
      side: three.DoubleSide,
    });

    if (group.kind === 'solid') {
      material.color.setRGB(...group.color);

      if (group.opacity < 1) {
        material.transparent = true;
        material.opacity = group.opacity;
      }
    } else if (group.kind === 'vertex') {
      geometry.setAttribute('color', new three.BufferAttribute(group.colors, 3));
      material.color.set(0xffffff);
      material.vertexColors = true;
    } else if (group.kind === 'texture') {
      if (!textures.has(group.texture)) {
        textures.set(group.texture, texture3mf(group.texture, three, readTexture));
      }

      const map = await textures.get(group.texture);

      if (map) {
        geometry.setAttribute('uv', new three.BufferAttribute(group.uvs, 2));
        material.color.set(0xffffff);
        material.map = map;
      }
    }

    // These formats carry no normals, and without them the model renders unlit.
    geometry.computeVertexNormals();
    root.add(new three.Mesh(geometry, material));
  }

  return root;
}

/**
 * A 3MF texture as an sRGB map. 3MF puts UV (0,0) at the image's bottom-left, which is
 * three's own convention, so the image keeps flipY and the exporter writes it the way
 * glTF expects.
 */
async function texture3mf(path, three, readTexture) {
  try {
    const bytes = await readTexture(path);

    if (!bytes) {
      throw new Error(`3MF archive has no ${path}`);
    }

    const type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
    const texture = new three.Texture(await createImageBitmap(new Blob([bytes], { type })));

    texture.colorSpace = three.SRGBColorSpace;
    texture.flipY = true;
    texture.wrapS = three.RepeatWrapping;
    texture.wrapT = three.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  } catch (failure) {
    console.warn('A 3MF texture could not be read', failure);

    return null;
  }
}
