// This page: where its model list comes from, which files it will accept, and in which language it
// says so. The rendering itself is `core/viewer.js`, which is also what mixoweb vendors - so a
// change to how a model is shown belongs there, and a change to what may be shown belongs here.

import { mountViewer, openSheets, say } from './core/viewer.js?v=2026111609';
import { phaseProgress } from './core/convert/progress.js?v=2026111609';
import { convertLocalMeshToGlbUrl, modelExtensionFromName, modelKindFromName, viewableModelUrl } from './core/convert/mesh-to-glb.js?v=2026111609';
import { enablePuckPanel, fakePuck, puckIsAvailable } from './puck-panel.js?v=2026111609';
import { createPuck } from './puck/puck.js?v=2026111609';
import { createWebBluetoothTransport } from './puck/transport-web-bluetooth.js?v=2026111609';
import { listZipEntries } from './zip-entries.js?v=2026111609';

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
    openFiles: 'Files',
    openFolder: 'Folder',
    puckLabel: 'Puck',
    puckIdle: 'Not connected.',
    puckConnecting: 'Connecting - pick the puck in the browser’s list.',
    puckConnected: 'Connected.',
    puckLost: 'The link was lost. The view is where you left it.',
    puckLostReason: 'The puck went out of range, or its battery ran down.',
    puckNoSensor: 'This puck’s motion sensor did not answer, so it cannot report a direction.',
    puckBatteryUnknown: 'battery unknown',
    puckConnect: 'Connect',
    puckDisconnect: 'Disconnect',
    puckAlign: 'Line up',
    puckResetView: 'Reset view',
    alignAsk: 'Hold the puck the way you want it to face you, then press Line up now.',
    alignReady: 'Holding steady. Press Line up now when it is where you want it.',
    cubeFront: 'FRONT',
    alignHoldStill: 'Keep it still - it moved while being read.',
    alignNow: 'Line up now',
    helpTitle: 'How to use this',
    diagramAlt: 'Where the controls are on the screen',
    stepModels: 'If the link lists more than one model, they are listed here. A file you open from this device shows one model at a time.',
    stepArBefore: 'On a phone that supports it,',
    stepArAfter: 'places the model in the room in front of you.',
    stepInfo: 'Load models, view descriptions, and see creator info.',
    stepLoad: 'Open a model from this device, or drag one onto the page. GLB, GLTF, OBJ, PLY, 3MF, STL, or a .zip holding a model with its files.',
    folderNote: 'A model whose textures are separate files - an .obj with its .mtl - needs all of them, and a page cannot read a file you did not pick. Choose its whole folder under the Open button, or drag the folder onto the page.',
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
    openFiles: '檔案',
    openFolder: '資料夾',
    puckLabel: '控制器',
    puckIdle: '尚未連線。',
    puckConnecting: '連線中，請在瀏覽器的清單中選擇控制器。',
    puckConnected: '已連線。',
    puckLost: '連線中斷，畫面維持在你離開時的角度。',
    puckLostReason: '控制器超出範圍，或電量耗盡。',
    puckNoSensor: '這個控制器的動作感測器沒有回應，無法回報方向。',
    puckBatteryUnknown: '電量未知',
    puckConnect: '連線',
    puckDisconnect: '中斷連線',
    puckAlign: '校正方向',
    puckResetView: '重設視角',
    alignAsk: '把控制器擺成你想要面對你的方向，然後按「立即校正」。',
    alignReady: '很穩定。擺到你要的位置後，按「立即校正」。',
    cubeFront: '正面',
    alignHoldStill: '請保持不動，讀取時偵測到移動。',
    alignNow: '立即校正',
    helpTitle: '使用說明',
    diagramAlt: '畫面控制位置',
    stepModels: '如果連結包含多個模型，會在這裡列出。從裝置開啟的檔案一次顯示一個模型。',
    stepArBefore: '在支援 AR 的手機上，',
    stepArAfter: '可以把模型放到你面前的空間中。',
    stepInfo: '這裡可以載入3D模型、查看說明與製作者資訊。',
    stepLoad: '從這台裝置開啟模型，或把檔案拖放到畫面上。支援 GLB、GLTF、OBJ、PLY、3MF、STL，或包含模型與相關檔案的 .zip。',
    folderNote: '材質為獨立檔案的模型（.obj 搭配 .mtl）需要全部檔案，而網頁無法讀取你沒有選取的檔案。請在「開啟」按鈕中選擇整個資料夾，或把資料夾拖放到畫面上。',
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
    openFiles: 'ファイル',
    openFolder: 'フォルダ',
    puckLabel: 'コントローラー',
    puckIdle: '未接続です。',
    puckConnecting: '接続中です。ブラウザーの一覧からコントローラーを選んでください。',
    puckConnected: '接続しました。',
    puckLost: '接続が切れました。表示はそのままの向きで止めています。',
    puckLostReason: 'コントローラーが範囲外になったか、電池が切れました。',
    puckNoSensor: 'このコントローラーのモーションセンサーが応答しないため、向きを報告できません。',
    puckBatteryUnknown: '電池残量不明',
    puckConnect: '接続',
    puckDisconnect: '切断',
    puckAlign: '向きを合わせる',
    puckResetView: '表示をリセット',
    alignAsk: 'コントローラーを自分に向けたい向きで持ち、「いますぐ合わせる」を押してください。',
    alignReady: '安定しています。向きが決まったら「いますぐ合わせる」を押してください。',
    cubeFront: '正面',
    alignHoldStill: '動いたため読み取れません。そのまま静止してください。',
    alignNow: 'いますぐ合わせる',
    helpTitle: '使い方',
    diagramAlt: '画面上の操作ボタンの位置',
    stepModels: 'リンクに複数のモデルが含まれる場合、ここに一覧表示されます。端末から開いたファイルは一度に 1 つのモデルを表示します。',
    stepArBefore: '対応しているスマートフォンでは、',
    stepArAfter: 'モデルを目の前の空間に配置できます。',
    stepInfo: 'ここでは3Dモデルの読み込み、説明の閲覧、製作者情報の確認ができます。',
    stepLoad: 'この端末からモデルを開くか、ファイルを画面にドラッグしてください。GLB、GLTF、OBJ、PLY、3MF、STL、またはモデルと関連ファイルを含む .zip に対応します。',
    folderNote: 'テクスチャが別ファイルのモデル（.obj と .mtl）はすべてのファイルが必要ですが、選択していないファイルをページは読み取れません。「開く」ボタンからフォルダごと選ぶか、フォルダを画面にドラッグしてください。',
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
  enableMenus();
  enableLanguageSwitching(stage, strings);
  enableLocalModelLoading(stage, state, strings, status);
  showArButtonPreview(stage, strings, window.location.search);
  enablePuck(stage, state, strings, status);

  const { ModelViewerElement } = await import('../vendor/model-viewer/model-viewer.min.js?v=2026111609');
  const decoderBase = new URL('../vendor/model-viewer/decoders/', import.meta.url).href;
  ModelViewerElement.dracoDecoderLocation = decoderBase + 'draco/';
  ModelViewerElement.ktx2TranscoderLocation = decoderBase + 'ktx2/';

  if (models.length === 0) {
    /*
     * TEMPORARY, while the puck is being brought up: a page opened with no model shows the
     * orientation cube instead of an empty stage, so directions can be checked at a glance.
     *
     * Its six faces read FRONT, BACK, LEFT, RIGHT, TOP and BOTTOM with the puck's axis beside
     * each - the words are the object's own, and they are true at rest, which is the moment
     * anybody is checking them. `tools/make-orientation-cube.py` builds it.
     *
     * To take this out, restore the two lines below it: this is a development default, not a
     * product decision, and a viewer that silently shows somebody else's cube when their own
     * model fails to parse would be worse than an empty stage.
     */
    showModels(
      stage,
      state,
      strings,
      status,
      [{ url: './assets/ar/orientation-cube.glb?v=2026111609', name: 'orientation cube' }],
      false,
      strings.loading,
    );

    return;

    // say(status, strings.noProduct);
    // status.hidden = true;
  }

  showModels(stage, state, strings, status, models, false, strings.loading);
}

/**
 * The puck, where the device and the browser both allow one.
 *
 * `?puck=fake` drives the whole panel from a generated turn, so the page can be built and shown
 * before any hardware exists - which is how this was written, and for a while it was ALL that
 * worked: the real source was described in this comment and never vendored, so the control
 * appeared and did nothing on every browser that had Bluetooth.
 *
 * The real one now lives in `puck/`, copied from `mixospatial/web/src/`. It replaces one object
 * and nothing else, because nothing below this line knows a radio exists - the panel only ever
 * calls `on`, `connect` and `disconnect`, which the fake satisfies too.
 */
async function enablePuck(stage, state, strings, status) {
  const control = document.querySelector('[data-puck-control]');

  if (!control) {
    return;
  }

  const wanted = new URLSearchParams(window.location.search).get('puck');

  /*
   * `?puck=fake` forces the generated source even where a radio exists, because the browser
   * tests drive the link states through it and a real adapter would make them flaky.
   */
  const source = wanted === 'fake'
    ? fakePuck()
    : createPuck({ transport: createWebBluetoothTransport() });

  if (source) {
    // Only reachable with `?puck=fake`, and the browser test drives the link states through it.
    window.__fakePuck = source;
  }

  if (source === null) {
    // No real source is vendored yet. Rather than offer a Connect that cannot do anything, the
    // control stays absent - and the availability check below is the gate it will keep.
    if (!(await puckIsAvailable(navigator.bluetooth))) {
      return;
    }

    return;
  }

  /*
   * The orientation cube, for checking that directions are right.
   *
   * `tools/make-orientation-cube.py` labels six faces with the puck's own axes and exists exactly
   * so a wrong axis is visible rather than argued about - and nothing in this page ever loaded it.
   * It is shown only when the page has no model of its own, so somebody testing a puck gets
   * something they can read, and somebody viewing their own model never has it appear underneath.
   *
   * It goes through `showModels`, not `viewer.src`: with no `?model=` there is no <model-viewer>
   * in the page at all, so assigning src had nothing to assign to. That cost a round of "the cube
   * did not appear" with no error anywhere, because setting a property on null is only an error
   * when something reads it back.
   */
  const showTestCube = () => {
    if (state.viewer) {
      return;
    }

    showModels(
      stage,
      state,
      strings,
      status,
      [{ url: './assets/ar/orientation-cube.glb?v=2026111609', name: 'orientation cube' }],
      false,
      strings.loading,
    );
  };

  enablePuckPanel({
    control,
    strings,
    source,
    showTestCube,
    getViewer: () => state.viewer,
    showDefaultView: () => {
      if (!state.viewer) {
        return;
      }

      // Written back, not removed: model-viewer parses this attribute on every update and throws
      // `Cannot read properties of undefined (reading 'terms')` on an absent one. Removing it
      // looked like the tidy way to say "no rotation" and breaks the element instead.
      state.viewer.setAttribute('orientation', '0deg 0deg 0deg');

      /*
       * And bring the CAMERA home too, not just the model.
       *
       * Resetting the orientation alone leaves the camera wherever it was dragged to, so the
       * model returns to its default angle while being looked at from the side - and then the
       * puck's turns are read against a view that is itself turned. "Facing me" has to mean the
       * camera as well, or the two frames disagree by however far the last drag went.
       *
       * Azimuth 0, polar 90: straight on, level with the model, which is the pose the orientation
       * cube's faces are authored against.
       */
      /*
       * HOMING HAS TO SURVIVE THE MODEL LOADING, which is why this runs twice.
       *
       * `showTestCube()` sets `src` and returns; the model arrives later, and when it does
       * model-viewer FRAMES it - computing its own camera from the model's bounds and discarding
       * the orbit set before it. So homing on connect worked on a viewer that already had a
       * model and silently did nothing on one that did not, which is exactly the case a person
       * testing a puck is in. It looked like the home was wrong; the home had been overwritten.
       *
       * Applied now for the already-loaded case, and again on the next `load` for the other one.
       * `{ once: true }` so a later model the person opens themselves is framed normally.
       */
      const home = () => {
        // A viewer mounted moments ago still carries `auto-rotate` from its attribute defaults,
        // and a turntable that resumes after the camera is placed undoes the placement a frame
        // later, leaving no trace of why.
        state.viewer.removeAttribute('auto-rotate');
        state.viewer.cameraOrbit = '0deg 90deg auto';
        state.viewer.jumpCameraToGoal?.();
      };

      home();
      state.viewer.addEventListener('load', home, { once: true });

    },
  });
}

/**
 * Every popup under a toolbar button - the languages, and the two ways to open a model.
 *
 * One implementation rather than one per menu: the second menu is where the first one's rules
 * (close the others, close on Escape, close on a click anywhere) would otherwise be copied and
 * then drift. A control is `[data-menu-control]` holding a `[data-menu-toggle]` and a `[data-menu]`.
 */
function closeAllMenus() {
  for (const control of document.querySelectorAll('[data-menu-control]')) {
    const toggle = control.querySelector('[data-menu-toggle]');
    const menu = control.querySelector('[data-menu]');

    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }

    if (menu) {
      menu.hidden = true;
    }
  }
}

function enableMenus() {
  for (const button of document.querySelectorAll('[data-menu-toggle]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();

      const control = button.closest('[data-menu-control]');
      const menu = control ? control.querySelector('[data-menu]') : null;

      if (!menu) {
        return;
      }

      const willOpen = menu.hidden;

      closeAllMenus();
      menu.hidden = !willOpen;
      button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  // Choosing an item closes the menu it came from. A `<label>` opens its picker by itself, so this
  // only has to tidy up after it.
  for (const item of document.querySelectorAll('[data-menu] [role="menuitem"]')) {
    item.addEventListener('click', () => closeAllMenus());
  }

  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllMenus();
    }
  });
}

function enableLanguageSwitching(stage, strings) {
  const closeMenus = closeAllMenus;

  const setLanguage = (locale) => {
    const nextStrings = localizedStrings(stage, locale);

    Object.assign(strings, nextStrings);
    writeStoredLocale(strings.locale);
    applyTranslations(strings);
    updateArButtonPreview(strings);
  };

  for (const option of document.querySelectorAll('[data-lang-option]')) {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      setLanguage(option.dataset.langOption);
      closeMenus();
    });
  }
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

  // The tooltip is the only name a sighted visitor on a desktop ever sees: every control up there is
  // a glyph, and the words beside it are `.ar-hidden`, for screen readers alone. That is why a
  // folder button drawn as a square could sit there unrecognised.
  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    element.setAttribute('title', strings[element.dataset.i18nTitle] || '');
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

  // This page's rule about what may be loaded, applied before the renderer sees anything: an
  // http(s) URL, or a blob URL this page made itself from a file somebody picked. The core takes
  // the list as given, so a host that skips this step is the host with the hole.
  const allowed = models
    .map((model) => ({ ...model, url: modelSource(model, window.location.href) }))
    .filter((model) => model.url !== null);

  const mounted = mountViewer({
    stage,
    status,
    strings,
    models: allowed,
    isFallback,
    message,
    // A link can point at an .obj, .ply, .3mf or .stl: fetch it, resolve its dependencies from the
    // same folder, and convert it before display. GLB and blob URLs pass straight through.
    prepare: viewableModelUrl,
    // Displaying is the final phase of the bar, so a local conversion does not jump back to a
    // small number once the converted GLB starts loading.
    progress: (fraction) => phaseProgress('displaying', fraction),
  });

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

function modelSource(model, baseUrl) {
  if (!model) {
    return null;
  }

  if (model.objectUrl && typeof model.url === 'string' && model.url.startsWith('blob:')) {
    return model.url;
  }

  return allowedModelUrl(model.url, baseUrl);
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

  // A `<label>` that looks like a button is only a button to a mouse: a click on it opens the
  // picker, Enter on it does nothing, so every one of them needs this or it is keyboard-dead. The
  // folder control in the help sheet is one of these too, which is why this reads the `for`
  // attribute rather than naming the file input.
  for (const label of document.querySelectorAll('label[role="button"][for]')) {
    label.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const target = document.getElementById(label.getAttribute('for'));

      if (target) {
        event.preventDefault();
        target.click();
      }
    });
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
    filesFromDataTransfer(event.dataTransfer).then(load);
  });
}

/** How deep a dropped folder is followed. shortcut: 8 levels, raise it if a real model nests deeper. */
const MAX_DROP_DEPTH = 8;

/**
 * Every file in a drop, including the ones inside a dropped folder.
 *
 * `dataTransfer.files` cannot see into a folder: dropping one yields a single entry that is not a
 * readable file, so the page did nothing and said nothing - and dragging the folder is the first
 * thing somebody tries when an OBJ needs its `.mtl` and its texture. The entries API is what reads
 * it, and it is the same set of files the folder *picker* would have handed over, so everything
 * downstream (`groupDroppedFiles` and below) is unchanged: it matches on names, never on paths.
 *
 * **The entries are taken before the first `await` on purpose.** A `DataTransfer` is emptied once
 * the drop handler returns, so reaching for `items` after an await finds an empty list - a bug that
 * would appear only on a slower machine, and only sometimes.
 */
export async function filesFromDataTransfer(dataTransfer, options = {}) {
  if (!dataTransfer) {
    return [];
  }

  const plain = Array.from(dataTransfer.files || []);
  const entries = Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter((entry) => entry !== null);

  if (entries.length === 0) {
    // A browser without the entries API, or a drop that is not files at all.
    return plain;
  }

  const files = [];

  try {
    for (const entry of entries) {
      await collectDroppedEntry(entry, files, 0, options);
    }
  } catch (failure) {
    // Reading the tree failed part way. What was already collected is still better than nothing,
    // and the plain list is the honest answer when it collected nothing at all.
    console.warn('A dropped folder could not be read in full', failure);
  }

  return files.length > 0 ? files : plain;
}

async function collectDroppedEntry(entry, out, depth, options) {
  const maxDepth = options.maxDepth === undefined ? MAX_DROP_DEPTH : options.maxDepth;

  if (!entry || depth > maxDepth) {
    return;
  }

  if (entry.isFile) {
    try {
      out.push(await new Promise((resolve, reject) => entry.file(resolve, reject)));
    } catch (failure) {
      // One unreadable file does not fail the drop: the model beside it may be perfectly fine.
      console.warn('A dropped file could not be read', entry.name, failure);
    }

    return;
  }

  if (!entry.isDirectory) {
    return;
  }

  const reader = entry.createReader();

  // `readEntries` hands back a batch at a time - 100 in Chromium - and an empty batch means the end.
  // Calling it once reads a folder of 150 files as a folder of 100.
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));

    if (!batch || batch.length === 0) {
      return;
    }

    for (const child of batch) {
      await collectDroppedEntry(child, out, depth + 1, options);
    }
  }
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

function localModel(url, file) {
  return {
    url,
    displayName: file.name,
    filename: file.name,
    size: formatBytes(file.size),
    objectUrl: true,
  };
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
