import gsap from 'gsap';

/* ── Tilt 3D della card guidato da uno spring ────────────────────────
   Una riproduzione simile alla TiltedCard di ReactBits
   (https://www.reactbits.dev/components/tilted-card):

   • la posizione del puntatore mappa in modo *lineare* dal centro della
     card — niente zona morta, così la risposta è continua e morbida fin
     dal primo px;
   • rotazione e scala sono integrate da uno spring vero (lo useSpring di
     motion/react: stiffness 100, damping 30, mass 2), non da tween a
     durata fissa: si assesta pesante e morbido, senza mai scattare;
   • un unico loop rAF muove tutte le card vive (di solito solo quella
     sotto il mouse + quelle che stanno tornando a posto), così resta
     leggero a 60fps. */

const STIFFNESS = 100;
const DAMPING = 30;
const MASS = 2;

export interface TiltOptions {
  /** Rotazione massima in gradi sul bordo della card (rotateAmplitude di ReactBits). */
  max?: number;
  /** Tilt sull'asse verticale scalato rispetto a `max` (limita l'over-tilt in verticale). */
  tiltXFactor?: number;
  /** Prospettiva CSS applicata al transform. */
  perspective?: number;
  /** Scala all'hover (scaleOnHover di ReactBits). */
  scale?: number;
  /** translateZ (px) all'hover pieno — entra in dolcezza insieme allo spring della scala. */
  lift?: number;
  /** box-shadow dal vivo, calcolata da rotazione corrente + avanzamento dell'hover (0..1). */
  shadow?: (rotX: number, rotY: number, hover: number) => string;
  /** Se true, il tilt è disattivato e la card torna a riposo (es. durante un drag). */
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

/* Loop condiviso — un solo rAF muove tutte le card che in quel momento sono in movimento. */
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
      /* Tornata del tutto a posto — ridò l'elemento al suo stato di riposo CSS. */
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
