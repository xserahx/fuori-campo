export interface BlurTextOptions {
  delay?: number;      // ms di sfasamento tra una parola e l'altra (default 60)
  duration?: number;   // durata dell'animazione per ogni parola (default 650)
  threshold?: number;  // soglia dell'IntersectionObserver (default 0.18)
}

export function blurText(node: HTMLElement, options: BlurTextOptions = {}) {
  const { delay = 55, duration = 800, threshold = 0.18 } = options;

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) return { destroy() {} };

  // Giro su tutti i nodi di testo dentro l'elemento tenendo intatta la sua
  // struttura (span degli accenti, link, ecc.), così gli stili ereditati continuano a valere.
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    if (cur.textContent?.trim()) textNodes.push(cur as Text);
  }

  let wordIdx = 0;
  const allSpans: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const parts = textNode.textContent!.split(/(\s+)/);
    const frag  = document.createDocumentFragment();

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        // Lascio gli spazi così come sono (mantiene la spaziatura naturale)
        frag.appendChild(document.createTextNode(part));
      } else if (part) {
        const span       = document.createElement('span');
        span.className   = 'blur-text-word';
        span.textContent = part;
        frag.appendChild(span);
        allSpans.push(span);
        wordIdx++;
      }
    }

    textNode.parentNode!.replaceChild(frag, textNode);
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      allSpans.forEach((span, i) => {
        span.style.animation =
          `blur-text-word-in ${duration}ms var(--ease-spring) ${i * delay}ms both`;
      });
      observer.disconnect();
    },
    { threshold, rootMargin: '0px 0px -40px 0px' }
  );

  observer.observe(node);

  return {
    destroy() { observer.disconnect(); },
  };
}
