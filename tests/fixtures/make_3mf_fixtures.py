"""
Regenerate the 3MF fixtures in this folder.

    python tests/fixtures/make_3mf_fixtures.py

Needs only Python: the files are written with the mixo3dtool add-on's pure-Python 3MF
writer (no Blender). Point MIXO3DTOOL at its checkout if it is not at S:/ai/mixo3dtool.
The output is deterministic, so rerunning it leaves git with nothing to commit.
"""

import importlib.util
import os
import struct
import sys
import types
import zipfile
import zlib
from pathlib import Path

ADDON = Path(os.environ.get("MIXO3DTOOL", "S:/ai/mixo3dtool")) / "mixo3d"


def load_writer():
    """The add-on's __init__ imports bpy, so load the writer alone under stub packages."""
    for name, folder in (("mixo3d", ADDON), ("mixo3d.helpers", ADDON / "helpers"), ("mixo3d.io", ADDON / "io")):
        package = types.ModuleType(name)
        package.__path__ = [str(folder)]
        sys.modules[name] = package

    for name, path in (("mixo3d.helpers.mimaki_contract", ADDON / "helpers" / "mimaki_contract.py"),
                       ("mixo3d.io.threemf_writer", ADDON / "io" / "threemf_writer.py")):
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)

    return sys.modules["mixo3d.io.threemf_writer"]


w = load_writer()

HERE = Path(__file__).resolve().parent
APP = "mixo-ar fixtures"


def linear(srgb_byte):
    """The writer takes linear floats and encodes them, so feed it the inverse."""
    c = srgb_byte / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def png(rows):
    """A tiny RGBA PNG from rows of (r, g, b) bytes, top row first."""
    raw = b"".join(b"\x00" + b"".join(bytes(px) + b"\xff" for px in row) for row in rows)

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", len(rows[0]), len(rows), 8, 6, 0, 0, 0)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def box(x0, y0, z0, x1, y1, z1):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    t = [(0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7), (0, 1, 5), (0, 5, 4),
         (1, 2, 6), (1, 6, 5), (2, 3, 7), (2, 7, 6), (3, 0, 4), (3, 4, 7)]
    return v, t


def grey(name, verts, tris, transform=None):
    mat = w.Material("base", (0.6, 0.6, 0.6, 1.0), "Grey")
    return w.Body(name, verts, tris, [mat], [0] * len(tris), transform=transform)


def move(x, y, z):
    return (1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z)


def two_parts():
    # A model and a Support_ body, each placed by its own build transform. The second is
    # also turned a quarter about Z, so offsets, rotation and translation all matter.
    v, t = box(0, 0, 0, 10, 10, 10)
    model = grey("Model", v, t, move(0, 0, 0))
    v2, t2 = box(0, 0, 0, 4, 4, 2)
    support = grey("Support_1", v2, t2, (0, 1, 0, -1, 0, 0, 0, 0, 1, 30, 5, 0))
    w.write_3mf(HERE / "two_parts.3mf", [model, support], [], application=APP)


def textured_quad():
    # 20 mm square. Image rows top to bottom: red|green, blue|white. UV (0,0) is the
    # bottom-left corner, so the top edge of the quad (y = 20) must show red|green.
    tex = w.Texture("quad", png([[(255, 0, 0), (0, 255, 0)], [(0, 0, 255), (255, 255, 255)]]))
    verts = [(0, 0, 0), (20, 0, 0), (20, 20, 0), (0, 20, 0)]
    tris = [(0, 1, 2), (0, 2, 3)]
    uv = {0: (0, 0), 1: (1, 0), 2: (1, 1), 3: (0, 1)}
    uvs = [tuple(uv[i] for i in tri) for tri in tris]
    mat = w.Material("texture", name="Quad", texture=0)
    body = w.Body("Quad", verts, tris, [mat], [0, 0], uvs=uvs)
    w.write_3mf(HERE / "textured_quad.3mf", [body], [tex], application=APP)


def colors():
    # A solid orange box (basematerials #FF9500) beside one triangle whose three corners
    # are red, green and blue (a colorgroup).
    orange = w.Material("base", (linear(255), linear(149), linear(0), 1.0), "Orange")
    v, t = box(0, 0, 0, 20, 20, 20)
    solid = w.Body("Orange", v, t, [orange], [0] * len(t))

    vertex = w.Material("vertex", name="Vertex")
    tri = [(30, 0, 0), (50, 0, 0), (40, 20, 0)]
    rgb = ((1.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.0, 1.0), (0.0, 0.0, 1.0, 1.0))
    painted = w.Body("Painted", tri, [(0, 1, 2)], [vertex], [0], colors=[rgb])
    w.write_3mf(HERE / "colors.3mf", [solid, painted], [], application=APP)


def inch_unit():
    # A 1 inch cube. The writer only emits millimetres, so rewrite the unit afterwards.
    v, t = box(0, 0, 0, 1, 1, 1)
    path = HERE / "inch_unit.3mf"
    w.write_3mf(path, [grey("Inch cube", v, t)], [], application=APP)

    with zipfile.ZipFile(path) as source:
        parts = [(info, source.read(info.filename)) for info in source.infolist()]

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as target:
        for info, data in parts:
            if info.filename == w.MODEL_PART:
                data = data.replace(b'unit="millimeter"', b'unit="inch"')
            info.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(info, data)


def tower():
    # Four times taller than wide along Z, so it shows whether Z-up is stood upright.
    v, t = box(0, 0, 0, 10, 10, 40)
    w.write_3mf(HERE / "tower.3mf", [grey("Tower", v, t)], [], application=APP)


if __name__ == "__main__":
    for build in (two_parts, textured_quad, colors, inch_unit, tower):
        build()
        print("wrote", build.__name__)
