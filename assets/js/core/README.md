# The viewer core — the upstream copy

**Code flows out of this folder, never into it.** These modules are the one source of the 3D viewer
for every mixocreative page that has one:

| Who | How it gets this code |
| --- | --- |
| this repository (`mixo-ar`) | imports it directly — `assets/js/mixo-ar.js` |
| `mixoweb` (mixocreative.com) | **vendors it byte for byte at a pinned commit** of this repository, by `tools\dev\sync-viewer-core.ps1` there |

So a fix to how a model is rendered is made **here**, pushed, and then pulled into mixoweb by
re-running that script. A fix made in mixoweb's vendored copy is a fix that the next sync deletes —
its `ViewerCoreIsVendoredTest` fails as soon as the bytes stop matching the pinned commit, which is
how it tells you.

## What belongs in here, and what does not

The core takes **a list of models and renders them**. It knows nothing about where that list came
from.

- `viewer.js` — the `<model-viewer>` element and its attributes, the variant dropdown, the status
  line, the load/progress/error handling and the fallback model. Shared with mixoweb.

What stays in each host's own adapter, on purpose:

- **Where the models come from.** This page reads `?src=`, `?model=` and `?models=`; mixoweb asks
  its product feed for one product's files. They are different pages.
- **Which URLs may be loaded at all.** This page allows any `http`/`https` model and the `blob:`
  URLs it makes from picked files. mixoweb allows **same-origin only** — that origin carries a
  ProcessWire admin session and the project's only content-security-policy, and its old
  "load any URL" mode was deleted deliberately. Collapsing the two rules into the core would
  re-open a hole mixoweb closed; the core therefore takes every `url` as already vetted.
- **Language.** mixoweb translates server-side and hands the copy over in `data-strings`; this page
  switches language in the browser (`assets/js/i18n.js`). Both end up passing the core a plain
  object of strings.
- **Conversion, and local files.** STL, OBJ, PLY and 3MF are read and converted to GLB by this
  repository's own code (`assets/js/mixo-ar.js` and the modules beside it), using the vendored
  three.js. mixoweb serves GLB from its feed, vendors no three.js, and so vendors none of that.

The core reaches that second group through two optional hooks on `mountViewer`:

- `prepare(url)` — a promise for a URL the viewer can display. Omitted, the `src` is set as given.
- `progress(fraction)` — maps model-viewer's download fraction onto the host's progress bar.
  Omitted, no bar is drawn at all, so a host whose stylesheet has no rules for one is never handed
  an unstyled element.

## The page contract both hosts honour

The core finds these in the document, and a host that renders different markup is a host the core
cannot drive:

| Selector | What it is |
| --- | --- |
| `[data-mixo-ar]` | the stage the viewer is appended to; its `data-fallback` is the placeholder model |
| `.ar-status` | the one-line status element (`role="status"`) |
| `#ar-button` | the page's own AR button, moved into the viewer's `ar-button` slot |
| `[data-sheet]` | a button opening the `<dialog>` whose id it names |

CSS is **not** shared. `assets/css/mixo-ar.css` here and mixoweb's copy have diverged with their
pages, and merging them is a separate decision from sharing the renderer.
