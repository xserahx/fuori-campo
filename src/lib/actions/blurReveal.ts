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

/* ── Curve di easing ───────────────────────────────────────────────
   SPRING  — è la nostra --ease-cinema: un expo-out lungo e morbido, che si assesta piano senza mai fermarsi di colpo.
   EASE_IN — uscita più secca, così gli elementi spariscono in fretta quando si torna indietro con lo scroll. */
const SPRING  = "var(--ease-cinema)";
const EASE_IN = "var(--ease-in)";

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
  /* cinema si accontenta della tripletta base — non gli serve altro */

  return base.join(", ");
}

function getHiddenStyles(
  direction: "left" | "right",
  translateX: number,
  blur: number,
  variant: BlurRevealVariant,
): Partial<CSSStyleDeclaration> {
  const tx = direction === "left" ? -translateX : translateX;

  /* Base: scorre in orizzontale, sale un po' e si rimpicciolisce per dare profondità. */
  const base: Partial<CSSStyleDeclaration> = {
    opacity:   "0",
    filter:    `blur(${blur}px)`,
    transform: `translateX(${tx}px) translateY(var(--unit-20)) scale(0.94)`,
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
    base.transform     = `translateX(${tx}px) translateY(var(--unit-16)) scale(0.97)`;
    base.letterSpacing = "0.45em";
  }

  if (variant === "fade") {
    base.filter    = `blur(${blur}px)`;
    base.transform = "translateY(var(--unit-32)) scale(0.96)";
  }

  /* cinema — blur carico, salita verticale decisa e rimpicciolita.
     Lo usiamo sulle sezioni che vengono dopo una zona orizzontale: serve a
     segnare il ritorno alla narrazione verticale in modo quasi cinematografico. */
  if (variant === "cinema") {
    base.filter    = `blur(${blur}px)`;
    base.transform = `translateX(${tx * 0.15}px) translateY(var(--unit-72)) scale(0.91)`;
  }

  return base;
}

function getVisibleStyles(
  variant: BlurRevealVariant,
): Partial<CSSStyleDeclaration> {
  /* Metto gli zeri in modo esplicito: se una proprietà manca il browser
     interpola dal nulla e il transform rischia di sbagliare */
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

  /* Reduced-motion: rivelo con un semplice crossfade — niente blur, scorrimento
     o scale — così il contenuto compare comunque (mai una schermata vuota),
     ma senza movimento. */
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
    /* data-br="visible" fa da aggancio per i selettori CSS figli, che così possono far partire le animazioni degli accent
    (es. .story[data-br="visible"] .accent { animation: accent-bloom ... }) */
    node.dataset.br = "visible";
    node.style.willChange = liveWillChange;
    node.style.transition = transitionFor(true);
    applyStyles(node, visibleStyles());
    /* Una volta che l'entrata si è assestata mollo il layer del compositor, così la pagina non si ritrova decine di layer GPU fissi — lo scroll resta smooth */
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
