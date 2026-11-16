// The puck's controls on this page, and nothing about radios.
//
// What a turn *means* is here; how the bytes arrive is not. A **source** is handed in - an object
// with `connect()`, `disconnect()` and `on(event, handler)`, emitting `state`, `orientation`
// (`{ q: {x, y, z, w}, status }`) and `battery`. `mixospatial`'s `puck.ts` will be one, built and
// tested against `protocol/fixtures/`; `fakePuck()` below is another, so this page can be built and
// driven before any hardware exists.
//
// The decisions this implements, rather than re-argues:
// - `0009`: a deliberate **Disconnect returns the view to default**; an unintended **link loss
//   freezes it** and says so. An interruption is not an ending.
// - `0010`: gated on `navigator.bluetooth` **and** `getAvailability()`, never on "desktop"; one
//   toggle rather than two half-dead buttons; state visible with the panel shut; Align draws the
//   pose, starts on stillness, rejects a moving capture, and is not a modal.
// - `PROTOCOL.md` §3: the zero lives here. Nothing is ever sent to the puck, so Align cannot fail.

import {
  averageQuaternions,
  heldStill,
  orientationAttribute,
  readStatus,
  relativeTo,
} from './puck-orientation.js?v=2026111608';

/** Readings are ~50-100 Hz, so half a second is tens of them; this is the floor, not the target. */
const ALIGN_MIN_READINGS = 5;

export async function puckIsAvailable(bluetooth) {
  if (!bluetooth) {
    return false;
  }

  if (typeof bluetooth.getAvailability !== 'function') {
    // The API exists but cannot be asked. Offering the control is better than hiding it here: the
    // chooser is the next thing the person sees either way.
    return true;
  }

  try {
    return await bluetooth.getAvailability();
  } catch (failure) {
    return false;
  }
}

/**
 * Wire the panel to a source.
 *
 * `showDefaultView` puts the model back where the page opened it - `0009`'s reset, which is also
 * what Reset view does, with or without a puck.
 */
export function enablePuckPanel({ control, strings, source, getViewer, showDefaultView, showTestCube = () => {} }) {
  if (!control || !source) {
    return null;
  }

  const toggle = control.querySelector('[data-puck-toggle]');
  const dot = control.querySelector('[data-puck-dot]');
  const line = control.querySelector('[data-puck-state]');
  const connectButton = control.querySelector('[data-puck-connect]');
  const alignButton = control.querySelector('[data-puck-align]');
    const card = document.querySelector('[data-align-card]');
  const cardAsk = card ? card.querySelector('[data-align-ask]') : null;

  const state = {
    link: 'idle',
    qZero: null,
    battery: null,
    aligning: false,
    readings: [],
    startedAt: 0,
  };

  const say = (key, extra) => {
    if (!line) {
      return;
    }

    const text = strings[key] || '';

    line.textContent = extra === undefined ? text : `${text} ${extra}`;
  };

  const render = () => {
    control.dataset.link = state.link;

    if (dot) {
      dot.dataset.link = state.link;
    }

    if (connectButton) {
      // The label, not the whole button: its first child is an icon, and `textContent` would eat it.
      const label = connectButton.querySelector('[data-i18n]') || connectButton;

      label.textContent = state.link === 'connected' ? strings.puckDisconnect : strings.puckConnect;
    }

    if (alignButton) {
      alignButton.hidden = state.link !== 'connected';
    }

    if (state.link === 'connected' && state.battery !== null) {
      say('puckConnected', `· ${state.battery}%`);
    } else if (state.link === 'connected') {
      // PROTOCOL.md §4: no plausible reading yet is reported as unknown, never as 0%.
      say('puckConnected', `· ${strings.puckBatteryUnknown}`);
    } else {
      say(`puck${state.link.charAt(0).toUpperCase()}${state.link.slice(1)}`);
    }
  };

  /** Idle show-off rotation: on when nothing is driving the model, off when something is. */
  const spin = (on) => {
    const viewer = getViewer();

    if (!viewer) {
      return;
    }

    if (on) {
      viewer.setAttribute('auto-rotate', '');
    } else {
      viewer.removeAttribute('auto-rotate');
    }
  };

  const showCard = (visible) => {
    if (card) {
      card.hidden = !visible;
    }
  };

  const beginAlign = () => {
    /*
     * HOME THE MODEL BEFORE ASKING, not after.
     *
     * The card asks the person to hold the puck the way they want it to face them, which is only
     * answerable if they can already see which way that is. Opening the card over a model still
     * sitting at the last link's angle asks them to match something to a target that is itself
     * wrong, and whatever they then line up to is wrong by the same amount.
     */
    showDefaultView();

    state.aligning = true;
    state.readings = [];
    state.startedAt = 0;

    if (cardAsk) {
      cardAsk.textContent = strings.alignAsk || '';
    }

    /*
     * FROZEN WHILE THE CARD IS OPEN.
     *
     * The person is being asked to match the puck to what is on screen, so the thing on screen
     * must not move - and `camera-controls` means a stray drag turns it mid-answer, after which
     * they line the puck up against a view that has shifted and the reference is wrong by
     * exactly that drag. Nothing says it happened.
     *
     * Restored in `finishAlign` and on Close, so this is the only state that takes it away.
     */
    const viewer = getViewer();

    if (viewer) {
      viewer.removeAttribute('camera-controls');
    }

    showCard(true);
  };

  /** Hand the view back: the card is the only thing that takes it away. */
  const thawView = () => {
    const viewer = getViewer();

    if (viewer) {
      viewer.setAttribute('camera-controls', '');
    }
  };

  const finishAlign = (readings) => {
    state.qZero = averageQuaternions(readings);
    state.aligning = false;
    showCard(false);
    thawView();
    render();
  };

  source.on('state', (next, reason) => {
    const wasConnected = state.link === 'connected';

    state.link = next;

    if (next === 'idle' && wasConnected) {
      // Deliberate: the person said they were finished (0009).
      state.qZero = null;
      showDefaultView();
      spin(true);
    }

    if (next === 'lost') {
      // Not deliberate: the view stays exactly where their hand left it, and the panel says why.
      state.aligning = false;
      showCard(false);
      // Deliberately NOT restarting the spin: 0009 says a lost link freezes the view. A model
      // that started turning by itself the moment the link dropped would read as "still working".
    }

    if (next === 'connected') {
      // The viewer carries `auto-rotate` so a page nobody is touching still shows the model off -
      // but once a puck drives the orientation the two fight: the model keeps turning on its own
      // AND follows the hand, and neither reads as either.
      /*
       * ORDER MATTERS HERE and it was wrong: the cube is mounted FIRST, then the spin is stopped,
       * then the view is homed.
       *
       * `spin(false)` and the camera reset both act on the viewer that exists when they run. With
       * the mount last, they were aimed at the previous viewer - or at nothing at all on a page
       * opened without a model - and the freshly mounted one then came up with `auto-rotate`
       * still on, turning the camera away from square-on within a second. The zero looked wrong
       * because the camera had already left.
       */
      showTestCube();

      // Stop the idle turntable. On a viewer mounted a moment ago this is the first thing that
      // has ever touched it, which is the point.
      spin(false);

      // And put the model back to its default angle, because whatever it was showing was either
      // the turntable's idea or the last link's. Connecting is the moment a person expects a
      // known starting point, and the alternative - carrying a stale angle into a fresh link -
      // makes the first reading look like a jump the puck caused.
      showDefaultView();

      // Until a reference is taken the model's angle means nothing, so the first connection walks
      // straight into Align rather than leaving it to be discovered (0010).
      beginAlign();
    }

    render();

    if (reason) {
      say(reason);
    }
  });

  source.on('battery', (percent) => {
    state.battery = typeof percent === 'number' ? percent : null;
    render();
  });

  source.on('orientation', ({ q, status }) => {
    const flags = readStatus(status);

    if (flags.noSensor) {
      // §5: the quaternion is identity and means nothing. Say so; do not move the model.
      say('puckNoSensor');

      return;
    }

    if (state.aligning) {
      const now = Date.now();

      state.readings.push(q);

      if (state.startedAt === 0) {
        state.startedAt = now;
      }

      if (!heldStill(state.readings)) {
        // It moved: start the window again rather than average a gesture.
        state.readings = [q];
        state.startedAt = now;

        if (cardAsk) {
          cardAsk.textContent = strings.alignHoldStill || strings.alignAsk || '';
        }

        return;
      }

      /*
       * DELIBERATELY NO AUTOMATIC FINISH. Holding still long enough used to end the alignment by
       * itself, which took the decision away at the exact moment it mattered: a person still
       * settling the puck had the reference taken from under them, and the card vanished before
       * they had agreed it was lined up. The button is now the only way out, so the puck takes
       * over when the person says so and not before.
       *
       * The still-window still runs underneath, because the button averages whatever it has seen
       * and a steady set of readings is a better reference than one sample.
       */
      if (cardAsk && state.readings.length >= ALIGN_MIN_READINGS) {
        cardAsk.textContent = strings.alignReady || strings.alignAsk || '';
      }

      return;
    }

    /*
     * NO REFERENCE MEANS NO MEANINGFUL ANGLE, so the first reading becomes one.
     *
     * `relativeTo(null, q)` hands back the raw reading, and the puck has no magnetometer: its
     * yaw starts at a different angle every time it wakes (PROTOCOL.md section 3). Showing that
     * is the model snapping to an arbitrary heading the instant the link comes up, which reads
     * as the puck spinning the model on its own.
     *
     * Align still runs on connect and still does the better job - it averages a held-still
     * window rather than trusting one sample. This is the floor underneath it, for the person
     * who dismisses the card, and it means the model is never driven by an angle that means
     * nothing.
     */
    if (state.qZero === null) {
      state.qZero = q;
    }

    const viewer = getViewer();

    if (viewer) {
      viewer.setAttribute('orientation', orientationAttribute(relativeTo(state.qZero, q)));
    }
  });

  if (connectButton) {
    connectButton.addEventListener('click', () => {
      if (state.link === 'connected') {
        source.disconnect();

        return;
      }

      source.connect();
    });
  }

  if (alignButton) {
    alignButton.addEventListener('click', () => {
      state.qZero = null;
      showDefaultView();
      beginAlign();
    });
  }

  /*
   * There is no separate "reset view": lining up IS the reset.
   *
   * They were two menu items doing one thing in two ways - one cleared the reference and homed
   * the view, the other took a new reference by averaging a held-still window. To a person
   * holding the puck that is a single intent: "put the model back in front of me and match it to
   * how I am holding this." Two entries for it only invited the question of which one to press.
   *
   * Clearing the reference first means the view homes immediately even if the align window is
   * never completed, because the next reading is adopted as the new reference.
   */

  if (card) {
    const now = card.querySelector('[data-align-now]');

    if (now) {
      // 0010 keeps a button as the fallback: a hand that never quite settles, or a desk on a bus,
      // must still be able to finish. It takes whatever has been seen rather than refusing.
      now.addEventListener('click', () => {
        if (state.readings.length > 0) {
          finishAlign(state.readings.slice(-ALIGN_MIN_READINGS));
        }
      });
    }

    const cancel = card.querySelector('[data-align-cancel]');

    if (cancel) {
      cancel.addEventListener('click', () => {
        state.aligning = false;
        showCard(false);
        // Walking away must hand the view back too, or Close leaves a model nobody can turn.
        thawView();
      });
    }
  }

  control.hidden = false;

  if (toggle) {
    toggle.hidden = false;
  }

  render();

  return state;
}

/**
 * A puck that is not there: a slow turn through the pole, so the page can be driven - and tested -
 * with no hardware and no Bluetooth. Reached with `?puck=fake`.
 */
export function fakePuck({ interval = 50 } = {}) {
  const handlers = new Map();
  let timer = null;
  let t = 0;

  const emit = (event, ...args) => {
    for (const handler of handlers.get(event) || []) {
      handler(...args);
    }
  };

  return {
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) || []), handler]);
    },
    connect() {
      // Back to still: a reconnect is somebody picking it up again, and a fake that resumes
      // mid-sweep can never satisfy Align - which is a property of the fake, not of the puck.
      t = 0;
      emit('state', 'connecting');

      setTimeout(() => {
        emit('state', 'connected');
        emit('battery', 76);

        timer = setInterval(() => {
          t += interval / 1000;

          // Still for the first second, because that is what a person does: put it down, let it line
          // up, then pick it up and turn it. A fake that never stops moving is a fake that Align
          // correctly refuses forever, which tests the rejection and nothing else.
          const moving = Math.max(0, t - 1.2);

          // Pitch sweeps straight through both poles, which is the motion a real hand makes and the
          // one that would expose a gimbal artefact if there were one.
          const pitch = (120 * Math.sin(moving * 0.6) * Math.PI) / 360;
          const yaw = (moving * 20 * Math.PI) / 360;

          emit('orientation', {
            q: {
              x: Math.sin(pitch) * Math.cos(yaw),
              y: Math.sin(yaw) * Math.cos(pitch),
              z: -Math.sin(pitch) * Math.sin(yaw),
              w: Math.cos(pitch) * Math.cos(yaw),
            },
            status: 0,
          });
        }, interval);
      }, 200);
    },
    disconnect() {
      clearInterval(timer);
      timer = null;
      emit('state', 'idle');
    },
    /** For tests: pretend the link dropped, which must not look like a disconnect. */
    drop() {
      clearInterval(timer);
      timer = null;
      emit('state', 'lost', 'puckLostReason');
    },
  };
}
