// How far along a conversion is, as one number the page can draw.
//
// The viewer used to show model-viewer's own fetch progress, which only covers the finished GLB and
// sat at 99% while the real work - parsing and exporting - happened. These weights are rough
// measurements of where the time actually goes.

/**
 * Parse an ASCII PLY, keeping per-vertex colour when the file carries it.
 *
 * Written by hand rather than taken from a loader because the common PLY handlers treat
 * the extension as gaussian-splat data, which misreads an ordinary mesh.
 */
/**
 * Phases a local conversion moves through, with the share of the bar each one owns.
 *
 * The viewer used to show model-viewer's own fetch progress, which only covers the
 * finished GLB and sat at 99% while the real work - parsing and exporting - happened.
 * These weights are rough measurements of where the time actually goes.
 */
export const conversionPhases = [
  { key: 'reading', weight: 0.08 },
  { key: 'parsing', weight: 0.42 },
  { key: 'materials', weight: 0.15 },
  { key: 'exporting', weight: 0.25 },
  { key: 'displaying', weight: 0.10 },
];

/** Map a fraction within one phase onto overall progress between 0 and 1. */
export function phaseProgress(key, fraction) {
  const clamped = Math.min(1, Math.max(0, Number(fraction) || 0));
  let start = 0;

  for (const phase of conversionPhases) {
    if (phase.key === key) {
      return round(start + phase.weight * clamped);
    }

    start += phase.weight;
  }

  return round(clamped);
}

function round(value) {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

export function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/**
 * Report progress and hand the thread back often enough for the bar to repaint.
 *
 * Without this the parse blocks the frame and the bar jumps from 0 to done, which is
 * exactly the dishonest progress this replaces.
 */
export async function maybeYield(lastYield, onProgress, fraction) {
  if (now() - lastYield < 16) {
    return lastYield;
  }

  if (onProgress) {
    onProgress(Math.min(1, Math.max(0, fraction)));
  }

  await new Promise((resolve) => setTimeout(resolve, 0));

  return now();
}
