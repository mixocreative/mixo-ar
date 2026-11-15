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
 * The `orientation` attribute for a quaternion: `"roll pitch yaw"` in degrees.
 *
 * model-viewer reads that triple back as `Euler(pitch, yaw, roll, 'YXZ')` and writes it straight
 * onto the model's quaternion, so this is the exact inverse of what it does - decomposed in the
 * same order, or the model would be wrong everywhere rather than only at the pole.
 */
export function orientationAttribute(q, decimals = 3) {
  const { x, y, z, w } = normalise(q);

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
