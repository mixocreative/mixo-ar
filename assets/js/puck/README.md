# The puck client, vendored from mixospatial

Copied byte-for-byte from `mixospatial/web/src/`, the way three.js and model-viewer are vendored
under `assets/vendor/`. **Do not edit these three files here.** Fix them in mixospatial and copy
them again, or the two will drift and the drift will only show up as a puck that behaves
differently in this page than in its own harness.

| file | what it is |
|---|---|
| `codec.js` | the wire format of `mixospatial/PROTOCOL.md` §5 and §6, and nothing else |
| `puck.js` | the link state machine, bounded reconnection, and the one command the device has |
| `transport-web-bluetooth.js` | `navigator.bluetooth` in, byte arrays out |

Ticket at vendoring time: `2026111601`. Vendored at mixospatial `1419995`, 2026-11-16.

**One modification is made on the way in, and only one:** every relative import gets the page's
`?v=` ticket. `tests/url-models.test.mjs` requires it of every module the page loads, because an
untokened import leaves a returning visitor running today's page against a module their browser
cached last week - and this project watched that exact failure eat an evening in mixospatial's
own harness, where a stale `rotation.js` made three correct fixes look like they did nothing.

To re-vendor, from this folder:

    cp ../../../../mixospatial/web/src/{codec,puck,transport-web-bluetooth}.js .
    sed -i -E "s@(from '\.[^']+\.js)'@\1?v=TOKEN'@" *.js

replacing `TOKEN` with the `?v=` in `index.html`. Bump that token in the same commit, or the
browser keeps the old copies and the update does not arrive.

`puck.js` imports `./codec.js` by relative path, which is why all three sit in one folder.
Nothing else in this repo may import them directly - `puck-panel.js` owns the panel and
`mixo-ar.js` builds the source, and both talk to the object, never to the radio.
