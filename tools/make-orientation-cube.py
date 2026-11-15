#!/usr/bin/env python3
"""Generate assets/ar/orientation-cube.glb - a cube whose faces say which way they point.

    python tools/make-orientation-cube.py

WHY THIS EXISTS. The puck demo's job is to show that turning the device turns the model the right
way. A featureless cube cannot show that: it looks identical from six directions, so a wrong axis
or a flipped sign is invisible. This cube carries its axis on every face, so "the model turns the
wrong way about one axis only" - the classic handedness bug - is visible in a second rather than
being argued about.

THE LABELS ARE THE PUCK'S OWN AXES, from mixospatial's PROTOCOL.md section 2:

    +Z  out through the TOP face, the one the LED shines through
    +X  toward the USB connector
    +Y  completes the right-handed set

That is why the faces do not say "front" and "back". A puck has no front; it has a connector you
can see and a lit face you can see, and those are what a person can check against the screen.

ONE DELIBERATE OFFSET. The mesh is authored rotated -90 degrees about X, so that at the identity
quaternion the cube sits flat with its +Z face upward - which is how the puck sits on a desk. The
viewer's up is +Y and the puck's up is +Z, and without this the demo would open with the cube
apparently standing on its edge. The offset is fixed and in the geometry, so it never interacts
with the orientation being displayed.
"""

import json
import struct
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CELL = 512  # pixels per face in the texture atlas
HALF = 0.5  # half the cube's edge, so the cube is 1 unit across

# name, normal, right, up, and the two lines of text.
#
# Paper and ink, not six colours: this is a Mixo surface and the house style has three surfaces
# and ONE accent. In 3D the faces are told apart by lighting rather than by hue, so colour-coding
# buys nothing here and breaks the palette everywhere else. The accent is spent on +Z - the face
# the LED shines through - because that is the one worth finding at a glance.
FACES = [
    # name, normal, up, and the two lines of text. `right` is derived, see geometry().
    #
    # UP IS +Z ON ALL FOUR SIDE FACES - the puck's own top - so that with the base down and the
    # top up, every side reads the right way round as you turn the cube. Getting this wrong is
    # invisible in a still render and obvious the moment anybody turns it: one face upside down,
    # another lying on its side.
    # The words beside each axis are the PUCK'S OWN, not the viewer's - port and starboard, not
    # stage left. The puck faces you at rest, so its left is on your right: +Y is the puck's
    # RIGHT even though PROTOCOL.md section 2 says "+Y is to your left". Both are true and they
    # are not the same sentence; the protocol's is a construction aid for building the frame,
    # these are labels on an object.
    #
    # The AXIS stays the larger line because it is what the protocol speaks, and because "front"
    # stops meaning anything the moment the puck is picked up and turned over.
    ("+X", (1, 0, 0), (0, 0, 1), ("+X", "USB / BACK")),
    ("-X", (-1, 0, 0), (0, 0, 1), ("-X", "FRONT")),
    ("+Y", (0, 1, 0), (0, 0, 1), ("+Y", "RIGHT")),
    ("-Y", (0, -1, 0), (0, 0, 1), ("-Y", "LEFT")),
    # The two faces where "up" is a choice rather than a fact, and the choice follows the resting
    # pose below: the connector points away from the viewer, so "away" on a horizontal face is
    # the puck's +X. The top's text therefore runs away from you and the base's toward you, and
    # tipping the cube either way brings a readable face into view.
    #
    # Get this wrong and the top's label sits SIDEWAYS - which looks like a texture bug and is
    # really just a disagreement about which way "up" is on a horizontal surface. It changed once
    # already when the resting pose changed, because these two depend on it and the four sides
    # do not.
    ("+Z", (0, 0, 1), (1, 0, 0), ("+Z", "TOP / LED")),
    ("-Z", (0, 0, -1), (-1, 0, 0), ("-Z", "BASE")),
]

PAPER = (244, 242, 237)   # --paper
INK = (59, 54, 49)        # --ink
MUTED = (138, 132, 122)   # --muted
LINE = (196, 189, 176)    # --line-strong
RED = (127, 0, 25)        # --red, the one accent


def font(size):
    """Arial if the machine has it, the bundled default if not - the cube is still readable."""
    for candidate in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf",
                      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def atlas():
    """One image, three cells across and two down, in the order FACES lists them."""
    image = Image.new("RGB", (CELL * 3, CELL * 2), PAPER)
    draw = ImageDraw.Draw(image)
    big, small = font(190), font(70)

    for index, (name, _, _, (line1, line2)) in enumerate(FACES):
        accent = name == "+Z"
        text = RED if accent else INK
        edge = RED if accent else LINE

        x0, y0 = (index % 3) * CELL, (index // 3) * CELL
        draw.rectangle([x0, y0, x0 + CELL - 1, y0 + CELL - 1], fill=PAPER)
        # A border, so the cube's edges stay visible against a pale background.
        draw.rectangle([x0 + 10, y0 + 10, x0 + CELL - 11, y0 + CELL - 11], outline=edge, width=6)

        centre = CELL // 2
        draw.text((x0 + centre, y0 + centre - (40 if line2 else 0)), line1,
                  font=big, fill=text, anchor="mm")

        if line2:
            draw.text((x0 + centre, y0 + centre + 105), line2,
                      font=small, fill=RED if accent else MUTED, anchor="mm")

    return image


def geometry():
    """24 vertices - four per face, because each face needs its own texture coordinates."""
    positions, normals, uvs, indices = [], [], [], []

    # THE RESTING POSE, and it is taken straight from PROTOCOL.md section 2:
    #
    #     "look along +X (connector pointing away from you) with the top face up,
    #      and +Y is to your left"
    #
    # So at the identity quaternion the cube must show the puck as it sits on a desk with its
    # connector pointing away. That means mapping the puck's axes onto the scene's:
    #
    #     puck +X (USB)  ->  scene -Z   away from the viewer
    #     puck +Z (top)  ->  scene +Y   up
    #     puck +Y        ->  scene -X   to your left
    #
    # which is (x, y, z) -> (-y, z, -x). It is a proper rotation, not a flip - the handedness is
    # preserved, which matters because a mirrored model would turn the wrong way about one axis
    # and look like a protocol bug.
    #
    # The offset lives HERE, in the model's own geometry, and never in the stream: the device
    # reports its raw frame and no consumer's convention is allowed back up the wire.
    #
    # BUT IT IS NOT FREE, and this comment used to claim it was. An earlier version said the
    # offset "never interacts with the orientation being displayed". It does. Baking B into the
    # vertices and then applying the raw quaternion renders R.B.p when the right answer is B.R.p:
    # the model sits correctly at rest and turns about the wrong axis, which reads as a fault in
    # the device and is not one.
    #
    # `assets/js/puck-orientation.js` crosses the rotation into the same frame with `toSceneFrame`,
    # and `tests/puck-orientation.test.mjs` pins each row of the table above. IF THE MAP BELOW
    # CHANGES, THAT FUNCTION CHANGES WITH IT - they are one decision, and the tests say so by
    # failing with the name of whichever row moved.
    def cross(a, b):
        return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])

    def to_scene(v):
        x, y, z = v
        return (-y, z, -x)

    for index, (_, normal, up, _) in enumerate(FACES):
        # Derived rather than listed, so `right x up = normal` holds by construction. Listing it
        # by hand is how a face ends up mirrored - the texture applied back to front, which reads
        # as a typo in the label rather than as a winding mistake.
        right = cross(up, normal)

        cx, cy = index % 3, index // 3
        u0, u1 = cx / 3.0, (cx + 1) / 3.0
        # glTF's V runs downward, so the face's top edge is the cell's smaller V.
        v0, v1 = cy / 2.0, (cy + 1) / 2.0

        base = len(positions) // 3

        for (sx, sy), (u, v) in zip(
            [(-1, -1), (1, -1), (1, 1), (-1, 1)],
            [(u0, v1), (u1, v1), (u1, v0), (u0, v0)],
        ):
            corner = to_scene(tuple(
                normal[axis] * HALF + right[axis] * sx * HALF + up[axis] * sy * HALF
                for axis in range(3)
            ))
            positions.extend(corner)
            normals.extend(to_scene(normal))
            uvs.extend((u, v))

        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return positions, normals, uvs, indices


def pad(data, filler=b"\x00"):
    """glTF requires every chunk and buffer view to start on a four-byte boundary."""
    while len(data) % 4:
        data += filler
    return data


def build():
    positions, normals, uvs, indices = geometry()

    png = BytesIO()
    atlas().save(png, format="PNG", optimize=True)
    png = png.getvalue()

    blobs = [
        struct.pack(f"<{len(positions)}f", *positions),
        struct.pack(f"<{len(normals)}f", *normals),
        struct.pack(f"<{len(uvs)}f", *uvs),
        struct.pack(f"<{len(indices)}H", *indices),
        png,
    ]

    views, offset, binary = [], 0, b""

    for blob in blobs:
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(blob)})
        blob = pad(blob)
        binary += blob
        offset += len(blob)

    gltf = {
        "asset": {"version": "2.0", "generator": "mixo-ar tools/make-orientation-cube.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "orientation-cube"}],
        "meshes": [{
            "name": "orientation-cube",
            "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2},
                "indices": 3,
                "material": 0,
            }],
        }],
        "materials": [{
            "name": "faces",
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.85,
            },
        }],
        "textures": [{"source": 0, "sampler": 0}],
        "images": [{"bufferView": 4, "mimeType": "image/png"}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions) // 3, "type": "VEC3",
             "min": [-HALF, -HALF, -HALF], "max": [HALF, HALF, HALF]},
            {"bufferView": 1, "componentType": 5126, "count": len(normals) // 3, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5126, "count": len(uvs) // 2, "type": "VEC2"},
            {"bufferView": 3, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
        ],
        "bufferViews": views,
        "buffers": [{"byteLength": len(binary)}],
    }

    json_chunk = pad(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad(binary)

    glb = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(json_chunk) + 8 + len(bin_chunk))
    glb += struct.pack("<I", len(json_chunk)) + b"JSON" + json_chunk
    glb += struct.pack("<I", len(bin_chunk)) + b"BIN\x00" + bin_chunk

    return glb


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "assets" / "ar" / "orientation-cube.glb"
    out.write_bytes(build())
    print(f"wrote {out} ({out.stat().st_size:,} bytes)")
