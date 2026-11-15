// The viewer itself: a `<model-viewer>` filling the stage, a dropdown when there is more than one
// model, and the status line under both.
//
// **This module is the upstream copy.** `mixoweb` vendors it byte for byte (see the README beside
// this file). It therefore knows nothing about where a model list comes from: no URL parameters, no
// JSON feed, no file picker, no same-origin or protocol policy. It is handed a list of models whose
// `url` the host has already decided it is willing to load, and it renders them.
//
// That boundary is the point. mixo-ar accepts arbitrary models from `?src=`; mixoweb loads only
// what its product feed says a product has, because that origin carries an admin session and the
// project's only content-security-policy. Merging those two rules would re-open a hole mixoweb
// closed on purpose, so the rule stays in each host's adapter and only the renderer is shared.
//
// Everything it says to somebody comes from the `strings` object the host passes in. There is no
// English in this file on purpose: mixoweb translates server-side, mixo-ar in the browser.

/**
 * The model-viewer attributes, which are the difference between a product and a grey blob.
 *
 * A neutral studio environment, commerce tone mapping, a soft shadow and floor placement in AR -
 * the old mixocreative page's set, kept. `loading: eager` because the default waits until the
 * element nears the viewport, and on a page whose only content *is* the element that is a wait for
 * nothing.
 */
export const VIEWER_ATTRIBUTES = {
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
};

/**
 * Build the viewer, mount it on the stage, and return what was mounted so the host can take it
 * down again.
 *
 * `models` is `[{ url, displayName, filename, size }, ...]`. Every `url` is used as given: vetting
 * them is the host's job, done before this is called. An entry without a string `url` is skipped
 * rather than trusted.
 *
 * `prepare(url)` is the one hook into loading: a host that can display the file it was handed omits
 * it and the `src` is set directly, which is what the shop does with its GLB files. mixo-ar passes
 * the mesh converter, so an `.stl`, `.obj`, `.ply` or `.3mf` link is fetched and turned into a GLB
 * first. A rejection with the message `MODEL_FETCH_BLOCKED` is shown as `strings.blocked`, because
 * a host refusing a cross-origin read is a different problem from a broken file.
 *
 * `progress(fraction)` maps model-viewer's own download fraction onto whatever the host's bar
 * means. Omitted, the download *is* the whole bar - the shop's case, where no number is drawn as a
 * bar at all. mixo-ar maps it onto the last tenth, because in front of it sit the conversion phases.
 *
 * @returns {{viewer: Element|null, variants: Element|null}}
 */
export function mountViewer({ stage, status, strings, models, isFallback = false, message = '', prepare = null, progress = null }) {
  const first = sourceOf(models[0]);

  if (first === null) {
    say(status, strings.failed);

    return { viewer: null, variants: null };
  }

  let standing = message;
  say(status, standing, isFallback ? strings.fallback : '');

  const viewer = document.createElement('model-viewer');

  for (const name of Object.keys(VIEWER_ATTRIBUTES)) {
    viewer.setAttribute(name, VIEWER_ATTRIBUTES[name]);
  }

  viewer.setAttribute('alt', strings.alt || '');

  // The AR button is **rendered by the page and moved here**, not built in JavaScript: it is two
  // icons and a translated label, and markup belongs where every other string on the page is
  // escaped. model-viewer only slots it in on a device that can actually place a model in a room,
  // so its absence there is the answer rather than a button that does nothing.
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

    const fraction = progress ? progress(total) : total;

    status.hidden = false;
    say(status, standing, isFallback ? strings.fallback : '', Math.round(fraction * 100) + '%', progress ? fraction : undefined);
  });

  viewer.addEventListener('load', () => {
    // A fallback is on screen because something went wrong, so its sentence stays. A real model
    // loading means there is nothing left to say.
    if (isFallback) {
      say(status, standing, strings.fallback);
      status.hidden = false;

      return;
    }

    status.hidden = true;
  });

  viewer.addEventListener('error', (event) => {
    const detail = (event.detail && event.detail.sourceError && event.detail.sourceError.message) || '';
    // A missing decoder and a corrupt file are different problems with different fixes, and the
    // person reading this is usually the person who exported the model.
    standing = /draco|ktx2|basis/i.test(detail) ? strings.compressed : strings.failed;
    status.hidden = false;

    if (isFallback) {
      // The fallback itself failed. Say so and stop - the old page's rule, and the reason it never
      // span in a loop swapping one broken model for another.
      say(status, standing);

      return;
    }

    isFallback = true;
    say(status, standing, strings.fallback);
    viewer.src = stage.dataset.fallback;
  });

  if (prepare) {
    // Nothing to show until the conversion finishes, and an element holding a `src` it cannot read
    // would raise its own error first.
    viewer.removeAttribute('src');
    prepare(first).then((ready) => {
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
    variants = switcher(models, viewer, status, strings, prepare);
    stage.append(variants);
  }

  return { viewer, variants };
}

/**
 * The models on offer, as a dropdown - the control the old page had in the same corner.
 *
 * A `<select>` rather than a row of buttons: it is one control of a known size however many options
 * are behind it, where three pills wrap onto a second row on a phone and start covering the model
 * they describe. The size stays in each label, because on mobile data that is what the choice is
 * actually about.
 */
function switcher(models, viewer, status, strings, prepare) {
  const select = document.createElement('select');
  select.className = 'ar-variants';
  // The control has no visible label - there is no room for one over a model, and the option
  // showing says what it is. A screen reader still needs to be told what it selects.
  select.setAttribute('aria-label', strings.models || '');

  const urls = [];

  for (const model of models) {
    const url = sourceOf(model);

    if (url === null) {
      continue;
    }

    const option = document.createElement('option');
    // The index, not the URL: an option value is posted back nowhere, and keeping URLs out of the
    // markup means nothing can hand the viewer one by editing the DOM.
    option.value = String(urls.length);
    // The operator-set label wins. mixoweb's feed emits `displayName` beside `filename` - the
    // former is what the storefront and this dropdown show, the latter what a browser download
    // stamps into `Content-Disposition`.
    const label = model.displayName || model.filename || '';
    option.textContent = model.size ? label + ' · ' + model.size : label;
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

    if (!prepare) {
      viewer.src = url;

      return;
    }

    prepare(url).then((ready) => {
      viewer.src = ready;
    }).catch((failure) => {
      // No fallback swap here: the model on screen is still a good one, and replacing it with the
      // placeholder would throw away a working view to report a failed choice.
      say(status, failure && failure.message === 'MODEL_FETCH_BLOCKED' ? strings.blocked : strings.failed);
      status.hidden = false;
    });
  });

  return select;
}

/** The `src` to use for a model entry, or null when there is nothing usable in it. */
function sourceOf(model) {
  if (!model || typeof model.url !== 'string' || model.url === '') {
    return null;
  }

  return model.url;
}

/**
 * One line, optionally a second under it, optionally a percentage, optionally a bar.
 *
 * The bar is drawn only when a `fraction` is passed, so a host whose stylesheet has no rules for it
 * never gets an unstyled element. `null` means "working, with no number to show": some steps, the
 * glTF exporter among them, report no progress at all, and inventing a number there is a lie.
 */
export function say(status, line, second, percent, fraction) {
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
      track.classList.add('is-indeterminate');
      track.removeAttribute('aria-valuenow');
    } else {
      track.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
      fill.style.width = Math.round(fraction * 100) + '%';
    }

    track.append(fill);
    status.append(track);
  }
}

/** The sheets - how to use it, and who made it. `<dialog>`, so no library is involved. */
export function openSheets() {
  for (const button of document.querySelectorAll('[data-sheet]')) {
    button.addEventListener('click', () => {
      const sheet = document.getElementById(button.dataset.sheet);

      if (sheet && typeof sheet.showModal === 'function') {
        sheet.showModal();
      }
    });
  }
}
