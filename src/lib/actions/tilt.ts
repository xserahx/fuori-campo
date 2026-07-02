import gsap from 'gsap';

/* ── Spring-driven 3D card tilt ──────────────────────────────────────
   A faithful port of ReactBits' TiltedCard feel
   (https://www.reactbits.dev/components/tilted-card):

   • pointer position maps *linearly* from the card centre — no dead
     zone, so the response is continuous and buttery from the first px;
   • rotation / scale are integrated by a real spring (motion/react's
     useSpring: stiffness 100, damping 30, mass 2) rather than fixed
     duration tweens, giving a heavy, silky settle that never snaps;
   • a single rAF loop drives every live card (usually just the hovered
     one + whatever is springing back), so it stays cheap at 60fps.   */

const STIFFNESS = 100;
const DAMPING = 30;
const MASS = 2;

export interface TiltOptions {
  /** Max rotation in degrees at the card edge (ReactBits rotateAmplitude). */
  max?: number;
  /** Vertical-axis tilt scaled relative to `max` (tames portrait over-tilt). */
  tiltXFactor?: number;
  /** CSS perspective applied to the transform. */
  perspective?: number;
  /** Scale on hover (ReactBits scaleOnHover). */
  scale?: number;
  /** translateZ (px) at full hover — eases in with the scale spring. */
  lift?: number;
  /** Live box-shadow from current rotation + hover progress (0..1). */
  shadow?: (rotX: number, rotY: number, hover: number) => string;
  /** When true, tilt is suppressed and the card springs back (e.g. mid-drag). */
  disabled?: () => boolean;
}

interface ResolvedOptions {
  max: number;
  tiltXFactor: number;
  perspective: number;
  scale: number;
  lift: number;
  shadow?: (rotX: number, rotY: number, hover: number) => string;
}

type Spring = { value: number; velocity: number; target: number };
const spring = (v = 0): Spring => ({ value: v, velocity: 0, target: v });

interface TiltState {
  node: HTMLElement;
  opts: ResolvedOptions;
  rx: Spring;
  ry: Spring;
  sc: Spring;
  hovering: boolean;
}

/* Shared loop — one rAF drives all cards currently in motion. */
const live = new Set<TiltState>();
let rafId = 0;
let lastT = 0;

function integrate(s: Spring, dt: number) {
  const accel = (STIFFNESS * (s.target - s.value) - DAMPING * s.velocity) / MASS;
  s.velocity += accel * dt;
  s.value += s.velocity * dt;
}

function atRest(s: Spring) {
  return Math.abs(s.target - s.value) < 0.01 && Math.abs(s.velocity) < 0.01;
}

function frame(now: number) {
  const dt = lastT ? Math.min((now - lastT) / 1000, 1 / 30) : 1 / 60;
  lastT = now;

  for (const s of live) {
    integrate(s.rx, dt);
    integrate(s.ry, dt);
    integrate(s.sc, dt);

    if (!s.hovering && atRest(s.rx) && atRest(s.ry) && atRest(s.sc)) {
      /* Fully returned — hand the element back to its CSS resting state. */
      gsap.set(s.node, { clearProps: 'transform,boxShadow' });
      s.rx.value = 0;
      s.ry.value = 0;
      s.sc.value = 1;
      live.delete(s);
      continue;
    }

    const hover = s.opts.scale > 1 ? (s.sc.value - 1) / (s.opts.scale - 1) : s.sc.value;
    const vars: gsap.TweenVars = {
      rotateX: s.rx.value,
      rotateY: s.ry.value,
      scale: s.sc.value,
      z: s.opts.lift * hover,
      transformPerspective: s.opts.perspective,
      transformOrigin: '50% 50%',
    };
    if (s.opts.shadow) vars.boxShadow = s.opts.shadow(s.rx.value, s.ry.value, hover);
    gsap.set(s.node, vars);
  }

  rafId = live.size ? requestAnimationFrame(frame) : ((lastT = 0), 0);
}

function ensureRunning() {
  if (!rafId) {
    lastT = 0;
    rafId = requestAnimationFrame(frame);
  }
}

export function tilt(node: HTMLElement, options: TiltOptions = {}) {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state: TiltState = {
    node,
    opts: {
      max: options.max ?? 14,
      tiltXFactor: options.tiltXFactor ?? 1,
      perspective: options.perspective ?? 800,
      scale: options.scale ?? 1,
      lift: options.lift ?? 0,
      shadow: options.shadow,
    },
    rx: spring(0),
    ry: spring(0),
    sc: spring(1),
    hovering: false,
  };
  let disabled = options.disabled;

  function activate() {
    live.add(state);
    ensureRunning();
  }

  function toRest() {
    state.hovering = false;
    state.rx.target = 0;
    state.ry.target = 0;
    state.sc.target = 1;
    activate();
  }

  function onMove(e: MouseEvent) {
    if (reduce) return;
    if (disabled?.()) {
      toRest();
      return;
    }
    const rect = node.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    state.ry.target = (offsetX / (rect.width / 2)) * state.opts.max;
    state.rx.target = -(offsetY / (rect.height / 2)) * state.opts.max * state.opts.tiltXFactor;
    state.hovering = true;
    state.sc.target = state.opts.scale;
    activate();
  }

  function onEnter() {
    if (reduce || disabled?.()) return;
    state.hovering = true;
    state.sc.target = state.opts.scale;
    activate();
  }

  node.addEventListener('mousemove', onMove);
  node.addEventListener('mouseenter', onEnter);
  node.addEventListener('mouseleave', toRest);

  return {
    update(next: TiltOptions = {}) {
      state.opts = {
        max: next.max ?? state.opts.max,
        tiltXFactor: next.tiltXFactor ?? state.opts.tiltXFactor,
        perspective: next.perspective ?? state.opts.perspective,
        scale: next.scale ?? state.opts.scale,
        lift: next.lift ?? state.opts.lift,
        shadow: next.shadow ?? state.opts.shadow,
      };
      disabled = next.disabled ?? disabled;
    },
    destroy() {
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', toRest);
      live.delete(state);
    },
  };
}
