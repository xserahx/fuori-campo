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
   SPRING  — expo-out with a softer tail; feels organic, never abrupt.
   EASE_IN — sharp fade-out so elements leave quickly on scroll-back. */
const SPRING  = "cubic-bezier(0.22, 1, 0.36, 1)";
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

  const hideDuration = Math.round(duration * 0.45);
  let visible     = false;
  let enterTimer: ReturnType<typeof setTimeout> | null = null;

  node.style.transition  = "none";
  node.style.willChange  = "transform, opacity, filter";
  applyStyles(node, getHiddenStyles(direction, translateX, blur, variant));

  const enter = () => {
    visible = true;
    /* data-br="visible" lets CSS child selectors trigger accent animations
       (e.g. .story[data-br="visible"] .accent { animation: accent-bloom ... }) */
    node.dataset.br = 'visible';
    node.style.transition = buildTransition(duration, hideDuration, variant, true);
    applyStyles(node, getVisibleStyles(variant));
  };

  const leave = () => {
    visible = false;
    delete node.dataset.br;
    if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
    node.style.transition = buildTransition(duration, hideDuration, variant, false);
    applyStyles(node, getHiddenStyles(direction, translateX, blur, variant));
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && !visible) {
        if (delay > 0) {
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

      if (visible) {
        applyStyles(node, getVisibleStyles(variant));
      } else {
        applyStyles(node, getHiddenStyles(direction, translateX, blur, variant));
      }
    },
    destroy() {
      observer.disconnect();
      if (enterTimer) clearTimeout(enterTimer);
    },
  };
}
