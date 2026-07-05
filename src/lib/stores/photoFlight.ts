import { writable } from 'svelte/store';

export type FlightRect = { left: number; top: number; width: number; height: number };

export const FLIGHT_DURATION_MS = 720;

// The handoff at the end of an entry flight: the clone (bare photo, no
// caption) fades out while the real frame (photo + caption together) fades
// in. Both sides must use this exact same duration, starting at the exact
// same instant (when FLIGHT_DURATION_MS elapses) — otherwise the opaque
// clone lingers on top after reaching full size while the real, captioned
// frame is still only partway through its own fade-in underneath, reading
// as "photo arrives, then info shows up late".
export const FLIGHT_REVEAL_MS = 260;

export type FlightState = {
  active: boolean;
  phase: 'entering' | 'exiting';
  src: string;
  from: FlightRect | null;
  to: FlightRect | null;
};

const idle: FlightState = { active: false, phase: 'entering', src: '', from: null, to: null };

export const photoFlight = writable<FlightState>(idle);

export function rectOf(el: Element): FlightRect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Like rectOf, but measures the element's RESTING box — with its own
 *  transform neutralised. The gallery tiles (and the zoom frame) carry a
 *  live tilt transform (scale + rotate + lift) while hovered; measuring the
 *  raw getBoundingClientRect would capture that tilted/scaled box and make
 *  the flight start (or land) at a shifted, oversized origin. Ancestor
 *  transforms (the collage pan/zoom) are preserved — only the element's own
 *  transform is removed for the measurement, then restored. */
export function restingRectOf(el: HTMLElement): FlightRect {
  const prev = el.style.transform;
  el.style.transform = 'none';
  const r = el.getBoundingClientRect();
  el.style.transform = prev;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Gallery click: the destination rect isn't known yet — the zoom page reports it via arriveEntry. */
export function launchEntry(src: string, from: FlightRect) {
  photoFlight.set({ active: true, phase: 'entering', src, from, to: null });
}

export function arriveEntry(to: FlightRect) {
  photoFlight.update((s) => (s.active && s.phase === 'entering' ? { ...s, to } : s));
}

/** Closing the zoom page: both rects are known synchronously. */
export function launchExit(src: string, from: FlightRect, to: FlightRect) {
  photoFlight.set({ active: true, phase: 'exiting', src, from, to });
}

export function resetFlight() {
  photoFlight.set(idle);
}
