# `@google/model-viewer`, vendored

`model-viewer.min.js` is `@google/model-viewer@3.5.0`, taken from the npm tarball
(`npm pack @google/model-viewer@3.5.0`, `package/dist/model-viewer.min.js`) on 2026-08-06 and
committed unmodified.

```
sha256  8923739c8c1b4a02dd9c8cf66da5c2a448235cb5e49e439dd7bbba944ba4fbe1
bytes   935194
```

`ArViewerPage::VIEWER_SHA256` holds that hash and `ArViewerAssetTest` fails if the file on disk
stops matching it. That is the point of vendoring rather than pinning a CDN URL: a version that
changes without anybody deciding to change it is the whole risk, and here it changes a tracked
file with a failing test beside it.

## Why it is here and not on a CDN

`/{locale}/ar/` shares an origin with the ProcessWire admin. A script tag pointing at a CDN makes
whoever controls that CDN able to run code in that origin, for a 3D preview of a desk ornament.
The trade is 935 KB in the repository against a third party in the trust boundary, and this
project takes the 935 KB. `docs/PLAN.md` slice 9 recorded the recommendation before the code was
written.

## The decoders are deliberately absent

model-viewer fetches a Draco decoder and a KTX2 transcoder **from `www.gstatic.com`** when a
model needs one - which would put back the third party this directory exists to remove.
`mixo-ar.js` therefore points both locations at `decoders/` beside this file, and that directory
is not shipped: a Draco-compressed or KTX2-textured GLB fails **to this origin** rather than
reaching out to Google, and the viewer says so in words.

The fix for such a model is to re-export it without Draco or KTX2, which is the default in
Blender's glTF exporter. If that ever stops being the right answer, vendor the two decoder
bundles into `decoders/draco/` and `decoders/ktx2/` and nothing else has to change.

## Licence

Apache 2.0. `LICENSE` is the copy that shipped in the tarball and stays beside the file it
covers.
