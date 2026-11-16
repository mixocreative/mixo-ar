import assert from 'node:assert/strict';
import test from 'node:test';

import {
  angleBetween,
  averageQuaternions,
  conjugate,
  heldStill,
  multiply,
  normalise,
  orientationAttribute,
  readStatus,
  relativeTo,
  toSceneFrame,
} from '../assets/js/puck-orientation.js';

const DEGREES = Math.PI / 180;

/** A quaternion for a rotation of `angle` degrees about a unit axis. */
function about(axis, angleDeg) {
  const half = (angleDeg * DEGREES) / 2;
  const s = Math.sin(half);

  return normalise({ x: axis[0] * s, y: axis[1] * s, z: axis[2] * s, w: Math.cos(half) });
}

/** What model-viewer does with the attribute: Euler(pitch, yaw, roll, 'YXZ') onto a quaternion. */
function fromOrientationAttribute(text) {
  const [roll, pitch, yaw] = text.split(' ').map((term) => parseFloat(term) * DEGREES);
  const c1 = Math.cos(pitch / 2);
  const s1 = Math.sin(pitch / 2);
  const c2 = Math.cos(yaw / 2);
  const s2 = Math.sin(yaw / 2);
  const c3 = Math.cos(roll / 2);
  const s3 = Math.sin(roll / 2);

  // three.js, order YXZ.
  return normalise({
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 + s1 * s2 * s3,
  });
}

test('the attribute round-trips a quaternion, including through the pole', () => {
  // The measurement that decided model-viewer could carry the puck at all: the numbers go wild
  // across +-90 degrees of pitch, the composed rotation does not.
  let worst = 0;

  for (let pitch = -179; pitch <= 179; pitch += 1) {
    for (const roll of [0, 37, 140]) {
      const q = multiply(multiply(about([0, 1, 0], 33), about([1, 0, 0], pitch)), about([0, 0, 1], roll));
      const shown = fromOrientationAttribute(orientationAttribute(q));

      // Against the SCENE-frame rotation, not the puck's: `orientationAttribute` crosses into
      // the scene's axes because the cube's geometry is already there. Comparing against `q`
      // would be asking the round trip to undo a basis change it never applied.
      worst = Math.max(worst, angleBetween(toSceneFrame(q), shown));
    }
  }

  assert.ok(worst < 0.01, `worst error through the whole sweep was ${worst} degrees`);
});

test('exactly at the pole, where yaw and roll are not separable', () => {
  for (const sign of [1, -1]) {
    const q = multiply(about([0, 1, 0], 25), about([1, 0, 0], sign * 90));
    const shown = fromOrientationAttribute(orientationAttribute(q));

    assert.ok(angleBetween(toSceneFrame(q), shown) < 0.01, 'the composition is still right');
  }
});

test('a puck turn appears about the matching SCENE axis, not the puck one', () => {
  // THE BUG THIS FILE EXISTS TO PREVENT FROM COMING BACK.
  //
  // `tools/make-orientation-cube.py` bakes a basis change into the cube's vertices, so the geometry
  // already lives in the scene's axes. For a while the rotation did not make that crossing, and the
  // model sat correctly at rest while turning about the wrong axis - which reads as a fault in the
  // device and is not one.
  //
  // The rows below were MEASURED with a puck in a hand on 2026-11-16, not copied from the
  // generator. They are the generator's map turned 180 degrees about the vertical, because the
  // reported +X and the cube's baked front face disagree by exactly that: see `toSceneFrame`. Keep
  // them measured. If the cube is regenerated these fail and name which row moved.
  const cases = [
    ['puck +Z, the top face', [0, 0, 1], [0, 1, 0], 'scene +Y, up'],
    ['puck +X, the USB end', [1, 0, 0], [0, 0, 1], 'scene +Z, toward the viewer'],
    ['puck +Y', [0, 1, 0], [1, 0, 0], 'scene +X, to the right'],
  ];

  for (const [what, puckAxis, sceneAxis, where] of cases) {
    for (const angle of [30, 90, -120]) {
      const converted = toSceneFrame(about(puckAxis, angle));
      const expected = about(sceneAxis, angle);

      assert.ok(
        angleBetween(converted, expected) < 1e-9,
        `a turn about ${what} must show as a turn about ${where}`,
      );
    }
  }
});

test('the scene conversion is a proper rotation, so nothing is mirrored', () => {
  // A mirrored map would also line the axes up at rest and then reverse two of the three turns.
  // The generator claims a proper rotation; this is that claim as arithmetic.
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const mapped = axes.map(([x, y, z]) => [-y, z, -x]);
  const [a, b, c] = mapped;
  const determinant =
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0]);

  assert.equal(determinant, 1, "the cube generator's map must be a rotation, not a reflection");
});

test('the zero lives here, not on the wire', () => {
  // PROTOCOL.md section 3: the device reports its raw frame and has no re-zero command, so Align is
  // the page capturing a reference and showing everything relative to it.
  const qZero = about([0, 1, 0], 140);

  assert.ok(angleBetween(relativeTo(qZero, qZero), { x: 0, y: 0, z: 0, w: 1 }) < 1e-6,
    'the pose that was captured reads as no rotation at all');

  const turned = multiply(qZero, about([0, 1, 0], 30));

  assert.ok(Math.abs(angleBetween(relativeTo(qZero, turned), { x: 0, y: 0, z: 0, w: 1 }) - 30) < 1e-6,
    'and a 30 degree turn from it reads as 30 degrees');
});

test('with no zero captured yet, the reading passes through', () => {
  const q = about([1, 0, 0], 20);

  assert.ok(angleBetween(relativeTo(null, q), q) < 1e-9);
});

test('averaging survives the sign flip that would cancel it to nothing', () => {
  // q and -q are the same rotation. Summing them naively gives zero, which normalises to identity -
  // an average pointing nowhere near either reading.
  const q = about([0.3, 0.9, 0.3], 70);
  const flipped = { x: -q.x, y: -q.y, z: -q.z, w: -q.w };
  const average = averageQuaternions([q, flipped, q]);

  assert.ok(angleBetween(average, q) < 1e-6, 'the average is the rotation, not a cancellation');
});

test('averaging a held pose lands on it', () => {
  const target = about([0, 1, 0], 45);
  const jittered = [0.4, -0.3, 0.2, -0.1, 0].map((wobble) => multiply(target, about([1, 0, 0], wobble)));

  assert.ok(angleBetween(averageQuaternions(jittered), target) < 0.5);
  assert.equal(averageQuaternions([]), null);
});

test('a capture taken while the puck was moving is rejected', () => {
  const target = about([0, 1, 0], 45);
  const still = [0.3, -0.2, 0.1].map((wobble) => multiply(target, about([1, 0, 0], wobble)));
  const moving = [0, 9, 23].map((turn) => multiply(target, about([1, 0, 0], turn)));

  assert.equal(heldStill(still), true);
  assert.equal(heldStill(moving), false, 'averaging that would be averaging a gesture');
  assert.equal(heldStill([target]), false, 'one reading is not evidence of stillness');
});

test('the status bits say what they mean, and reserved bits are not invented', () => {
  assert.deepEqual(readStatus(0b0000), { still: false, lowBattery: false, noSensor: false });
  assert.deepEqual(readStatus(0b0001), { still: true, lowBattery: false, noSensor: false });
  assert.deepEqual(readStatus(0b0100), { still: false, lowBattery: true, noSensor: false });
  assert.deepEqual(readStatus(0b1000), { still: false, lowBattery: false, noSensor: true });
  // Bit 1 is retired and must never be reused (PROTOCOL.md section 3), so it maps to nothing here.
  assert.deepEqual(readStatus(0b0010), { still: false, lowBattery: false, noSensor: false });
});

test('conjugate and multiply are the pair they claim to be', () => {
  const q = about([0.2, 0.5, 0.84], 123);
  const identity = multiply(q, conjugate(q));

  assert.ok(angleBetween(identity, { x: 0, y: 0, z: 0, w: 1 }) < 1e-9);
});
