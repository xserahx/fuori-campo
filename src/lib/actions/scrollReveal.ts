import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface ScrollRevealOptions {
  start?: string;       // punto di start dello ScrollTrigger (default: 'top 85%')
  end?: string;         // punto di end dello ScrollTrigger   (default: 'top 40%')
  blur?: number;        // px di blur a riposo (default 6)
  dimOpacity?: number;  // opacità a riposo (default 0.18)
  media?: string;       // query matchMedia che decide quando gira (default: solo mobile)
}

gsap.registerPlugin(ScrollTrigger);

// Reveal delle parole solo su mobile, agganciata allo scroll: ogni parola
// parte spenta e sfocata e si mette a fuoco fino alla piena opacità man mano che
// l'elemento scorre da `start` a `end`, seguendo direttamente posizione/velocità
// dello scroll (scrub) invece di scattare una volta sola.
// Su desktop lo split statico accent/ghost resta com'è — fuori dalla query
// `media` questa action non fa niente, quindi non tocca affatto quel markup.
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

  // Giro su tutti i nodi di testo spezzandoli in span parola per parola, ma
  // tenendo intatta la struttura esistente (i wrapper accent/ghost-* così si
  // portano dietro il colore ereditato).
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
