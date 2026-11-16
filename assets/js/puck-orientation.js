// Turning what the puck reports into what the viewer shows. No DOM, no Bluetooth, no three.js.
//
// The puck sends a unit quaternion and nothing else (`mixospatial/PROTOCOL.md` §5): component order
// `x, y, z, w`, and **no zero on the wire** - §3 puts the reference pose in the host, because the
// device has no magnetometer and its yaw restarts arbitrarily on every wake. So the page holds
// `qZero` and shows `qZero⁻¹ · q`.
//
// `model-viewer` takes orientation as a **Euler string**, which sounds like it should lose the pole
// and does not: measured on 2026-11-15 against this exact conversion, the round trip loses 7e-4
// degrees at three decimal places and 1.7e-6 at the pole itself, and never flips - the numbers jump
// across ±90° while their composition stays continuous, and the attribute is applied without
// interpolation. The write-up is in `mixospatial/web/README.md`.

const DEGREES = 180 / Math.PI;

/** Hamilton product. `q` then `r`, both `{x, y, z, w}`. */
export function multiply(q, r) {
  return {
    x: q.w * r.x + q.x * r.w + q.y * r.z - q.z * r.y,
    y: q.w * r.y - q.x * r.z + q.y * r.w + q.z * r.x,
    z: q.w * r.z + q.x * r.y - q.y * r.x + q.z * r.w,
    w: q.w * r.w - q.x * r.x - q.y * r.y - q.z * r.z,
  };
}

/** The inverse of a *unit* quaternion, which is its conjugate. */
export function conjugate(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

export function normalise(q) {
  const length = Math.hypot(q.x, q.y, q.z, q.w);

  if (length === 0) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

/** What to show: the reading relative to the pose captured at Align. */
export function relativeTo(qZero, q) {
  if (!qZero) {
    return normalise(q);
  }

  return normalise(multiply(conjugate(normalise(qZero)), normalise(q)));
}

/**
 * The puck's rotation, expressed in the SCENE's axes instead of the puck's.
 *
 * `tools/make-orientation-cube.py` bakes a basis change into the cube's VERTICES so the model sits
 * the right way up at rest. The rotation has to make the same crossing, and it used to not: handing
 * the viewer the raw quaternion renders `R·B·p` when the right answer is `B·R·p`, so the cube sat
 * correctly at rest and turned about the wrong axis. A basis change is ONE change and must reach
 * the geometry and the rotation together.
 *
 * The map below is that basis change, MEASURED against a puck in a hand on 2026-11-16 rather than
 * derived from the generator:
 *
 *     puck +X (connector) -> scene +Z (toward the viewer)
 *     puck +Y             -> scene +X (screen right)
 *     puck +Z (top)       -> scene +Y (up)
 *
 * It is the geometry's map turned 180 degrees about the vertical, and that half-turn is the whole
 * correction.
 *
 * **THIS HALF-TURN IS ON PROBATION. It contradicts three things that agree with each other, and it
 * is here because the owner reported the rotations mirrored on 2026-11-16 and asked for the flip.**
 * What disagrees with it:
 *
 *   1. `mixospatial/hardware/electronics/pinout.md` - the accelerometer was measured on the bench
 *      the same day. Flat it reads +Z, connector tipped down it reads -X. The chip's axes ARE
 *      PROTOCOL.md section 2's frame. There is no mounting offset to compensate.
 *   2. The cube sits correctly at rest (FRONT toward the viewer, TOP up, screenshotted), so the
 *      geometry's basis is right - and the rotation is supposed to use the same one.
 *   3. Worked through by hand, the OLD basis gives the right answer for all three: a turn about
 *      puck +Y tips the top toward the connector, about +X tips it to the viewer's right, about +Z
 *      swings the front to the viewer's right. Each matches what the old code emitted.
 *
 * The one thing none of that covers is **which way the puck was HELD during the test**, and that
 * single fact produces this exact symptom. Hold the puck with the connector pointing AT you and
 * roll and pitch both reverse as you perceive them while yaw does not - because yaw is about the
 * vertical, and turning yourself around does not move the vertical. Section 2 says in bold to
 * establish the hold before touching a matrix. This matrix was touched first.
 *
 * So: if the puck is used connector-AWAY, this half-turn is a bug and the fix is to delete it. If
 * it is used connector-TOWARD, section 2's resting pose is wrong and the cube generator, the demo
 * harness and this file all need the half-turn together. One question settles it; until it is
 * asked, do not build anything else on this function.
 *
 * The rule that found it, which is worth more than the fix: **two rotations reversed and one
 * correct is a HEADING error, and the correct one names the axis.** Yaw is about the vertical, the
 * vertical survived, so the basis was 180 degrees out about the vertical. It is never a sign error
 * in one component, and chasing it as one is how the same bug got "fixed" three times in the demo
 * harness without moving.
 *
 * Two mirrored and one correct names the axis for you: the surviving rotation is the one you turned
 * about. Read it off and turn the basis, do not negate anything.
 *
 * The conversion itself: for a basis change `B`, a quaternion's vector part becomes `det(B)·B·v`
 * with `w` unchanged. `B` here is a proper rotation, `det(B) = +1`, so this is just `B` applied to
 * `(x, y, z)`. If the cube is ever regenerated with a different map, THIS FUNCTION CHANGES WITH IT.
 */
export function toSceneFrame(q) {
  return { x: q.y, y: q.z, z: q.x, w: q.w };
}

/**
 * The `orientation` attribute for a quaternion: `"roll pitch yaw"` in degrees.
 *
 * model-viewer reads that triple back as `Euler(pitch, yaw, roll, 'YXZ')` and writes it straight
 * onto the model's quaternion, so this is the exact inverse of what it does - decomposed in the
 * same order, or the model would be wrong everywhere rather than only at the pole.
 */
export function orientationAttribute(q, decimals = 3) {
  // Into the scene's axes first - the cube's geometry is already there. See `toSceneFrame`.
  const { x, y, z, w } = toSceneFrame(normalise(q));

  // YXZ decomposition, matching three.js's `Euler.setFromQuaternion(q, 'YXZ')`.
  const m13 = 2 * (x * z + y * w);
  const m23 = 2 * (y * z - x * w);
  const m33 = 1 - 2 * (x * x + y * y);
  const m21 = 2 * (x * y + z * w);
  const m22 = 1 - 2 * (x * x + z * z);
  const clamped = Math.min(1, Math.max(-1, -m23));
  const pitch = Math.asin(clamped);
  let yaw;
  let roll;

  if (Math.abs(m23) < 0.9999999) {
    yaw = Math.atan2(m13, m33);
    roll = Math.atan2(m21, m22);
  } else {
    // At the pole the split between yaw and roll is arbitrary; any valid pair composes back to the
    // same rotation, so yaw takes it all and roll is zero.
    yaw = Math.atan2(-2 * (x * z - y * w), 1 - 2 * (y * y + z * z));
    roll = 0;
  }

  const degrees = (radians) => (radians * DEGREES).toFixed(decimals);

  return `${degrees(roll)}deg ${degrees(pitch)}deg ${degrees(yaw)}deg`;
}

/**
 * The average of a run of readings, for Align.
 *
 * An instant sample catches the nudge of whatever started the capture, so the reference is taken
 * over a short run instead. Quaternions are averaged by summing with a sign flip for any reading on
 * the far side of the hypersphere from the first - `q` and `-q` are the same rotation, and summing
 * them naively cancels to nothing.
 */
export function averageQuaternions(readings) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return null;
  }

  const first = normalise(readings[0]);
  const sum = { x: 0, y: 0, z: 0, w: 0 };

  for (const reading of readings) {
    const q = normalise(reading);
    const sign = (q.x * first.x + q.y * first.y + q.z * first.z + q.w * first.w) < 0 ? -1 : 1;

    sum.x += sign * q.x;
    sum.y += sign * q.y;
    sum.z += sign * q.z;
    sum.w += sign * q.w;
  }

  return normalise(sum);
}

/** The angle between two orientations, in degrees - how much the hand moved. */
export function angleBetween(a, b) {
  const p = normalise(a);
  const q = normalise(b);
  const dot = Math.min(1, Math.abs(p.x * q.x + p.y * q.y + p.z * q.z + p.w * q.w));

  return 2 * Math.acos(dot) * DEGREES;
}

/** Was the puck actually still through the capture? Averaging a moving puck is averaging noise. */
export function heldStill(readings, tolerance = 2) {
  if (!Array.isArray(readings) || readings.length < 2) {
    return false;
  }

  const reference = readings[0];

  return readings.every((reading) => angleBetween(reference, reading) <= tolerance);
}

/** `status` byte of PROTOCOL.md §5, as the three bits that mean something to a page. */
export function readStatus(byte) {
  const bits = Number(byte) || 0;

  return {
    still: (bits & 0b0001) !== 0,
    lowBattery: (bits & 0b0100) !== 0,
    // §5: the quaternion is identity and means nothing, but the packet is kept - the bit is the
    // information, and discarding it would throw away the only evidence of what is wrong.
    noSensor: (bits & 0b1000) !== 0,
  };
}
