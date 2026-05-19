export interface BlurRevealOptions {
  direction?: "left" | "right";
  threshold?: number;
  blur?: number;
  translateX?: number;
  duration?: number;
}

export function BlurReveal(node: HTMLElement, options: BlurRevealOptions = {}) {
  let direction = options.direction ?? "left";
  let threshold = options.threshold ?? 0.25;
  let blur = options.blur ?? 18;
  let translateX = options.translateX ?? 60;
  let duration = options.duration ?? 800;

  let offsetX = direction === "left" ? -translateX : translateX;
  let visible = false;

  const applyHiddenState = () => {
    node.style.transition = "none";
    node.style.opacity = "0";
    node.style.filter = `blur(${blur}px)`;
    node.style.transform = `translateX(${offsetX}px)`;
    node.style.willChange = "transform, opacity, filter";
  };

  const applyVisibleState = () => {
    node.style.transition = [
      `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1)`,
      `filter ${duration}ms cubic-bezier(0.16,1,0.3,1)`,
      `transform ${duration}ms cubic-bezier(0.16,1,0.3,1)`
    ].join(", ");
    node.style.opacity = "1";
    node.style.filter = "blur(0px)";
    node.style.transform = "translateX(0px)";
  };

  applyHiddenState();

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) {
        applyVisibleState();
      } else {
        applyHiddenState();
      }
    },
    { threshold, rootMargin: "0px 0px -80px 0px" }
  );

  observer.observe(node);

  return {
    update(nextOptions: BlurRevealOptions) {
      direction = nextOptions.direction ?? direction;
      threshold = nextOptions.threshold ?? threshold;
      blur = nextOptions.blur ?? blur;
      translateX = nextOptions.translateX ?? translateX;
      duration = nextOptions.duration ?? duration;

      offsetX = direction === "left" ? -translateX : translateX;

      if (visible) {
        applyVisibleState();
      } else {
        applyHiddenState();
      }
    },
    destroy() {
      observer.disconnect();
    }
  };
}