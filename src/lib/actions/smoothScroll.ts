import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wireTicker(lenis: Lenis): () => void {
  lenis.on('scroll', ScrollTrigger.update);

  const tickerFn = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tickerFn);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
  };
}

export interface WindowSmoothScroll {
  lenis: Lenis | null;
  destroy: () => void;
}

// Smooth scroll a livello di window per le pagine a flusso normale (home, about,
// category, profilo volontario, ...). Non è una action Svelte — non c'è un
// singolo elemento a cui agganciarsi — viene richiamato da un `$effect` 
// Sotto reduced-motion `lenis` è null (subentra lo scroll nativo)
export function initWindowSmoothScroll(): WindowSmoothScroll {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    return { lenis: null, destroy() {} };
  }

  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.scrollTo(0, { immediate: true });

  return { lenis, destroy: wireTicker(lenis) };
}

export interface SmoothScrollContainerOptions {
  duration?: number;
  smoothWheel?: boolean;
  onReady?: (lenis: Lenis) => void;
}

// Smooth scroll a livello di container per le aree con overflow interno (il
// feed foto mobile della gallery, la lista dei nomi, ...).
// Serve a lenis per agganciarsi a un container specifico invece che a window, così lo scroll resta limitato a quell'area.
export function smoothScrollContainer(node: HTMLElement, options: SmoothScrollContainerOptions = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return { destroy() {} };

  const content = node.firstElementChild as HTMLElement | null;
  if (!content) return { destroy() {} };

  const { duration = 1.1, smoothWheel = true, onReady } = options;

  const lenis = new Lenis({ wrapper: node, content, duration, smoothWheel });
  onReady?.(lenis);

  const unwire = wireTicker(lenis);

  return { destroy: unwire };
}
