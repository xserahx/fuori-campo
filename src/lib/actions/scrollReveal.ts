import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface ScrollRevealOptions {
  start?: string;       // ScrollTrigger start (default: 'top 85%')
  end?: string;         // ScrollTrigger end   (default: 'top 40%')
  blur?: number;        // px of blur at rest (default 6)
  dimOpacity?: number;  // opacity at rest (default 0.18)
  media?: string;       // matchMedia query gating when this runs (default mobile-only)
}

gsap.registerPlugin(ScrollTrigger);

// Mobile-only, scroll-scrubbed word reveal: each word starts dim + blurred
// and sharpens to full opacity as the element scrolls through `start`→`end`,
// tracking scroll position/velocity directly (scrub) rather than firing once.
// Desktop keeps its existing static accent/ghost split untouched — this
// action no-ops outside the `media` query so it never touches that markup.
export function scrollReveal(node: HTMLElement, options: ScrollRevealOptions = {}) {
  const {
    start = 'top 85%',
    end = 'top 40%',
    blur = 6,
    dimOpacity = 0.18,
    media = '(max-width: 600px)',
  } = options;

  if (typeof window === 'undefined') return { destroy() {} };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = window.matchMedia(media).matches;

  if (!active || reduce) return { destroy() {} };

  // Walk all text nodes, splitting into per-word spans while preserving the
  // existing element structure (accent/ghost-* wrappers keep inherited color).
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    if (cur.textContent?.trim()) textNodes.push(cur as Text);
  }

  const words: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const parts = textNode.textContent!.split(/(\s+)/);
    const frag = document.createDocumentFragment();

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else if (part) {
        const span = document.createElement('span');
        span.className = 'scroll-reveal-word';
        span.textContent = part;
        frag.appendChild(span);
        words.push(span);
      }
    }

    textNode.parentNode!.replaceChild(frag, textNode);
  }

  if (!words.length) return { destroy() {} };

  gsap.set(words, { opacity: dimOpacity, filter: `blur(${blur}px)` });

  const tween = gsap.to(words, {
    opacity: 1,
    filter: 'blur(0px)',
    stagger: 0.06,
    ease: 'none',
    scrollTrigger: { trigger: node, start, end, scrub: true },
  });

  return {
    destroy() {
      tween.scrollTrigger?.kill();
      tween.kill();
    },
  };
}
