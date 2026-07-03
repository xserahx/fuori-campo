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

// Window-scoped smooth scroll for normal document-flow pages (home, about,
// category, volunteer profile, ...). Not a Svelte action — there's no single
// element to bind to — call from a `$effect` and run the returned cleanup.
// `lenis` is null under reduced-motion (native scroll applies instead); check
// for it before using it for programmatic scrolling (e.g. reset-to-top).
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

// Container-scoped smooth scroll for internal overflow areas (gallery's
// mobile photo feed, names list, ...). Expects the node it's attached to to
// have exactly one direct child wrapping all scrollable content — Lenis
// measures that child to know the scrollable extent.
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
