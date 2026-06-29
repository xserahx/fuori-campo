export interface BlurTextOptions {
  delay?: number;      // ms stagger between each word (default 60)
  duration?: number;   // animation duration per word (default 650)
  threshold?: number;  // IntersectionObserver threshold (default 0.18)
}

export function blurText(node: HTMLElement, options: BlurTextOptions = {}) {
  const { delay = 55, duration = 800, threshold = 0.18 } = options;

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) return { destroy() {} };

  // Walk all text nodes in the element, preserving the element structure
  // (accent spans, links, etc.) so inherited styles still apply.
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
        // Preserve whitespace as-is (keeps natural spacing)
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
          `blur-text-word-in ${duration}ms cubic-bezier(0.22,1,0.36,1) ${i * delay}ms both`;
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
