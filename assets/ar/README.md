# `/ar/` viewer assets

## `brand/` — the owner's own files, from the old theme, unchanged

Copied byte for byte from `templates/ar/img/` in `mixocreative.zip` on 2026-08-07, at the owner's
request, and used in the same places the old page used them.

| File | Where it appears | sha256 |
|---|---|---|
| `logo-3d.png` | The mark, top left | `f9d5e1db4532b21b020b9e6ac0dc3eff92fb08ee209dc1e7e34bd198c383451e` |
| `logo-type.svg` | The wordmark beside it | `b5847ea618dbfd086a5f91c16e773476a3de0d947336a34b676e5ef2758e7c38` |
| `logo-bg.svg` | The faint watermark behind the model | `d89f7a62e15269058688bf901404aaee62275330b780db620b64c1c0d21325ff` |
| `logo-main.png` | The info sheet | `928fc796690d3b38e8661cce90fd2ab33e109c9a4a0770211f94a874d63fda06` |

**These are the exception to a standing rule.** `AGENTS.md` says nothing is ported out of
`mixocreative.zip` into the application tree, because that archive is untrusted legacy evidence.
The exception is narrow and deliberate: it covers **the shop's own logo files and nothing else**,
the owner asked for them by name, and the alternative was sending a customer to a page wearing a
placeholder mark. The two SVGs were read before they were committed — Illustrator output, no
`<script>`, no external references. If more is ever taken from that archive, it needs its own
decision; this is not a precedent for the rest of it.

## The two that are still ours

| File | What it is | What replaces it |
|---|---|---|
| `instructions.svg` | The control layout as a diagram with **no words in it**, numbered 1–3 to match the three translated lines beside it. | Nothing, unless the layout changes. |
| `fallback.glb` | A 1 KB cube, generated. Loaded when a product's model is missing or will not load, so the page is never an empty grey screen. | The logo as a 3D model — `glb-mixologo.glb` in the archive is the old page's, and it is a decision like the logos above rather than a copy somebody makes quietly. |

The old `ar-instruction.png` is deliberately not used. It had English, Japanese and Chinese baked
into the pixels, so a typo in one language meant redrawing the picture and a screen reader got
nothing at all. The diagram here carries only numbers, and the sentences live in `ArViewerPage`
where they are translated like the rest of the site.
