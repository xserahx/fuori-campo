export type BlurRevealVariant = "slide" | "clip" | "skew" | "letterspace" | "fade";

export interface BlurRevealOptions {
  direction?: "left" | "right";
  threshold?: number;
  blur?: number;
  translateX?: number;
  duration?: number;
  delay?: number;
  variant?: BlurRevealVariant;
}

const SPRING = "cubic-bezier(0.16,1,0.3,1)";
const EASE_IN = "cubic-bezier(0.55,0,1,0.45)";

function buildTransition(duration: number, hideDuration: number, variant: BlurRevealVariant, entering: boolean): string {
  const dur = entering ? duration : hideDuration;
  const ease = entering ? SPRING : EASE_IN;

  const base = [
    `opacity ${dur}ms ${ease}`,
    `filter ${dur}ms ${ease}`,
    `transform ${dur}ms ${ease}`,
  ];

  if (variant === "clip") {
    base.push(`clip-path ${dur * 0.9}ms ${ease}`);
  }
  if (variant === "letterspace") {
    base.push(`letter-spacing ${dur * 1.1}ms ${ease}`);
  }

  if (variant === "fade") {
    // only opacity + filter + subtle translateY — no horizontal shift, no layout changes
  }

  return base.join(", ");
}

function getHiddenStyles(direction: "left" | "right", translateX: number, blur: number, variant: BlurRevealVariant) {
  const tx = direction === "left" ? -translateX : translateX;

  const base: Partial<CSSStyleDeclaration> = {
    opacity: "0",
    filter: `blur(${blur}px)`,
    transform: `translateX(${tx}px)`,
  };

  if (variant === "skew") {
    const skew = direction === "left" ? 4 : -4;
    base.filter = `blur(${blur}px) saturate(0)`;
    base.transform = `translateX(${tx}px) skewX(${skew}deg)`;
  }

  if (variant === "clip") {
    base.filter = `blur(${blur * 0.8}px)`;
    base.transform = `translateX(${tx * 0.6}px) translateY(10px)`;
    base.clipPath = direction === "left"
      ? "polygon(0 0, 100% 0, 100% 0%, 0 0%)"
      : "polygon(0 0, 100% 0, 100% 0%, 0 0%)";
  }

  if (variant === "letterspace") {
    base.filter = `blur(${blur}px)`;
    base.letterSpacing = "0.5em";
  }

  if (variant === "fade") {
    base.filter = `blur(${blur}px)`;
    base.transform = "translateY(20px)";
  }

  return base;
}

function getVisibleStyles(variant: BlurRevealVariant): Partial<CSSStyleDeclaration> {
  const base: Partial<CSSStyleDeclaration> = {
    opacity: "1",
    filter: "blur(0px)",
    transform: "translateX(0px)",
  };

  if (variant === "skew") {
    base.filter = "blur(0px) saturate(1)";
    base.transform = "translateX(0px) skewX(0deg)";
  }

  if (variant === "clip") {
    base.transform = "translateX(0px) translateY(0px)";
    base.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  }

  if (variant === "letterspace") {
    base.letterSpacing = "-0.01em";
  }

  if (variant === "fade") {
    base.transform = "translateY(0px)";
  }

  return base;
}

function applyStyles(node: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  for (const [key, value] of Object.entries(styles)) {
    (node.style as any)[key] = value;
  }
}

export function blurReveal(node: HTMLElement, options: BlurRevealOptions = {}) {
  let {
    direction = "left",
    threshold = 0.25,
    blur = 22,
    translateX = 70,
    duration = 900,
    delay = 0,
    variant = "slide",
  } = options;

  const hideDuration = duration * 0.5;
  let visible = false;
  let enterTimer: ReturnType<typeof setTimeout> | null = null;

  // stato iniziale
  node.style.transition = "none";
  node.style.willChange = "transform, opacity, filter";
  applyStyles(node, getHiddenStyles(direction, translateX, blur, variant));

  const enter = () => {
    visible = true;
    node.style.transition = buildTransition(duration, hideDuration, variant, true);
    applyStyles(node, getVisibleStyles(variant));
  };

  const leave = () => {
    visible = false;
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
    { threshold, rootMargin: "0px 0px -60px 0px" }
  );

  observer.observe(node);

  return {
    update(next: BlurRevealOptions) {
      direction = next.direction ?? direction;
      threshold = next.threshold ?? threshold;
      blur = next.blur ?? blur;
      translateX = next.translateX ?? translateX;
      duration = next.duration ?? duration;
      delay = next.delay ?? delay;
      variant = next.variant ?? variant;

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