export type BlurRevealVariant = "slide" | "clip" | "skew" | "letterspace" | "fade" | "cinema";

export interface BlurRevealOptions {
  direction?: "left" | "right";
  threshold?: number;
  blur?: number;
  translateX?: number;
  duration?: number;
  delay?: number;
  variant?: BlurRevealVariant;
}

/* ── Easing curves ─────────────────────────────────────────────────
   SPRING  — true expo-out: a long, silky settle that never abruptly stops.
   EASE_IN — sharp fade-out so elements leave quickly on scroll-back. */
const SPRING  = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";

function buildTransition(
  duration: number,
  hideDuration: number,
  variant: BlurRevealVariant,
  entering: boolean,
): string {
  const dur  = entering ? duration : hideDuration;
  const ease = entering ? SPRING   : EASE_IN;

  const base = [
    `opacity   ${dur}ms ${ease}`,
    `filter    ${dur}ms ${ease}`,
    `transform ${dur}ms ${ease}`,
  ];

  if (variant === "clip") {
    base.push(`clip-path ${Math.round(dur * 0.9)}ms ${ease}`);
  }
  if (variant === "letterspace") {
    base.push(`letter-spacing ${Math.round(dur * 1.1)}ms ${ease}`);
  }
  /* cinema uses the base triple — no extra properties needed */

  return base.join(", ");
}

function getHiddenStyles(
  direction: "left" | "right",
  translateX: number,
  blur: number,
  variant: BlurRevealVariant,
): Partial<CSSStyleDeclaration> {
  const tx = direction === "left" ? -translateX : translateX;

  /* Base: horizontal slide + upward drift + scale-down for depth. */
  const base: Partial<CSSStyleDeclaration> = {
    opacity:   "0",
    filter:    `blur(${blur}px)`,
    transform: `translateX(${tx}px) translateY(20px) scale(0.94)`,
  };

  if (variant === "skew") {
    const skew = direction === "left" ? 4 : -4;
    base.filter    = `blur(${blur}px) saturate(0)`;
    base.transform = `translateX(${tx}px) translateY(14px) skewX(${skew}deg) scale(0.97)`;
  }

  if (variant === "clip") {
    base.filter    = `blur(${Math.round(blur * 0.7)}px)`;
    base.transform = `translateX(${Math.round(tx * 0.5)}px) translateY(14px) scale(0.97)`;
    base.clipPath  = "polygon(0 0, 100% 0, 100% 0%, 0 0%)";
  }

  if (variant === "letterspace") {
    base.filter        = `blur(${blur}px)`;
    base.transform     = `translateX(${tx}px) translateY(16px) scale(0.97)`;
    base.letterSpacing = "0.45em";
  }

  if (variant === "fade") {
    base.filter    = `blur(${blur}px)`;
    base.transform = "translateY(32px) scale(0.96)";
  }

  /* cinema — deep blur + strong vertical rise + notable scale-down.
     Used for sections that follow a horizontal zone, signaling the
     return to vertical narrative with cinematic weight.            */
  if (variant === "cinema") {
    base.filter    = `blur(${blur}px)`;
    base.transform = `translateX(${tx * 0.15}px) translateY(72px) scale(0.91)`;
  }

  return base;
}

function getVisibleStyles(
  variant: BlurRevealVariant,
): Partial<CSSStyleDeclaration> {
  /* Explicit zero-values prevent browsers from interpolating from
     a missing property, which can cause transform flicker.         */
  const base: Partial<CSSStyleDeclaration> = {
    opacity:   "1",
    filter:    "blur(0px)",
    transform: "translateX(0px) translateY(0px) scale(1)",
  };

  if (variant === "skew") {
    base.filter    = "blur(0px) saturate(1)";
    base.transform = "translateX(0px) translateY(0px) skewX(0deg) scale(1)";
  }

  if (variant === "clip") {
    base.transform = "translateX(0px) translateY(0px) scale(1)";
    base.clipPath  = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  }

  if (variant === "letterspace") {
    base.transform     = "translateX(0px) translateY(0px) scale(1)";
    base.letterSpacing = "-0.01em";
  }

  if (variant === "fade") {
    base.transform = "translateY(0px) scale(1)";
  }

  if (variant === "cinema") {
    base.transform = "translateX(0px) translateY(0px) scale(1)";
  }

  return base;
}

function applyStyles(node: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  for (const [key, value] of Object.entries(styles)) {
    if (typeof value === "string") {
      (node.style as any)[key] = value;
    }
  }
}

export function blurReveal(node: HTMLElement, options: BlurRevealOptions = {}) {
  let {
    direction  = "left",
    threshold  = 0.25,
    blur       = 26,
    translateX = 64,
    duration   = 1000,
    delay      = 0,
    variant    = "slide",
  } = options;

  /* Reduced-motion: reveal with a plain crossfade — no blur, slide or scale —
     so content still appears (never gated blank) but without motion. */
  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hideDuration = Math.round(duration * 0.45);
  let visible      = false;
  let enterTimer:  ReturnType<typeof setTimeout> | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const liveWillChange  = reduce ? "opacity" : "transform, opacity, filter";
  const hiddenStyles    = () =>
    reduce ? { opacity: "0" } as Partial<CSSStyleDeclaration>
           : getHiddenStyles(direction, translateX, blur, variant);
  const visibleStyles   = () =>
    reduce ? { opacity: "1" } as Partial<CSSStyleDeclaration>
           : getVisibleStyles(variant);
  const transitionFor   = (entering: boolean) =>
    reduce ? `opacity ${entering ? 320 : 200}ms ease`
           : buildTransition(duration, hideDuration, variant, entering);

  node.style.transition = "none";
  node.style.willChange = liveWillChange;
  applyStyles(node, hiddenStyles());

  const enter = () => {
    visible = true;
    /* data-br="visible" lets CSS child selectors trigger accent animations
       (e.g. .story[data-br="visible"] .accent { animation: accent-bloom ... }) */
    node.dataset.br = "visible";
    node.style.willChange = liveWillChange;
    node.style.transition = transitionFor(true);
    applyStyles(node, visibleStyles());
    /* Drop the compositor layer once the entrance settles, so the page isn't
       left holding dozens of permanent GPU layers — keeps scrolling buttery. */
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { node.style.willChange = "auto"; }, (reduce ? 320 : duration) + 80);
  };

  const leave = () => {
    visible = false;
    delete node.dataset.br;
    if (enterTimer)  { clearTimeout(enterTimer);  enterTimer  = null; }
    if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    node.style.willChange = liveWillChange;
    node.style.transition = transitionFor(false);
    applyStyles(node, hiddenStyles());
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && !visible) {
        if (delay > 0 && !reduce) {
          enterTimer = setTimeout(enter, delay);
        } else {
          enter();
        }
      } else if (!entry?.isIntersecting && visible) {
        leave();
      }
    },
    { threshold, rootMargin: "0px 0px -50px 0px" },
  );

  observer.observe(node);

  return {
    update(next: BlurRevealOptions) {
      direction  = next.direction  ?? direction;
      threshold  = next.threshold  ?? threshold;
      blur       = next.blur       ?? blur;
      translateX = next.translateX ?? translateX;
      duration   = next.duration   ?? duration;
      delay      = next.delay      ?? delay;
      variant    = next.variant    ?? variant;
      hideDuration = Math.round(duration * 0.45);

      applyStyles(node, visible ? visibleStyles() : hiddenStyles());
    },
    destroy() {
      observer.disconnect();
      if (enterTimer)  clearTimeout(enterTimer);
      if (settleTimer) clearTimeout(settleTimer);
    },
  };
}
