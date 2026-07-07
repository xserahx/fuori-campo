<!-- Photo flight overlay for animating image transitions. Animazione delle immagini dopo il click sulla galleria foto versione desktop -->

<script lang="ts">
  import gsap from "gsap";
  import {
    photoFlight,
    resetFlight,
    FLIGHT_DURATION_MS,
    FLIGHT_REVEAL_MS,
    type FlightRect,
  } from "$lib/stores/photoFlight";

  // The <img> is always mounted (hidden when idle) so `imgEl` stays a stable
  // ref across every flight — GSAP fully owns its transform/opacity;
  // Svelte never re-writes those via a reactive style attribute.
  let imgEl = $state<HTMLImageElement | null>(null);
  let visible = $state(false);
  let src = $state<string | undefined>(undefined);

  const reduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let handledKey = "";
  let holdTimeout: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    clearTimeout(holdTimeout);
    if (imgEl) gsap.killTweensOf(imgEl);
    visible = false;
    handledKey = "";
  }

  // The clone's real box (left/top/width/height) is set ONCE per flight —
  // a single layout write, not one per frame. Everything that actually
  // moves afterwards is a `transform` (translate + scale), which the
  // compositor can run at 60fps without touching layout at all — animating
  // left/top/width/height directly (the previous approach) forces a full
  // layout recalculation on every tick, which is exactly what read as lag.
  function setBox(el: HTMLElement, rect: FlightRect) {
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  }

  // The transform that makes a box natively sized/positioned as `base` (its
  // real left/top/width/height) visually read as if it were at `target`.
  function transformFor(base: FlightRect, target: FlightRect) {
    return {
      x: target.left - base.left,
      y: target.top - base.top,
      scaleX: target.width / base.width,
      scaleY: target.height / base.height,
    };
  }

  const EASE = "power2.inOut";

  $effect(() => {
    const s = $photoFlight;

    if (!s.active || !s.from) {
      if (visible) stop();
      return;
    }
    if (!imgEl) return;

    const key = `${s.phase}|${s.src}|${s.from.left},${s.from.top}|${s.to ? `${s.to.left},${s.to.top}` : "pending"}`;
    if (key === handledKey) return;
    handledKey = key;

    if (reduced()) {
      resetFlight();
      return;
    }

    src = s.src;
    gsap.killTweensOf(imgEl);
    clearTimeout(holdTimeout);
    visible = true;

    // The clone lives inside <html>, which may carry a CSS `zoom` (the app's
    // page-fit / accessibility scale). The from/to rects were captured with
    // getBoundingClientRect, which already returns zoom-applied screen px — but
    // the clone's own left/top/width/height are CSS px that the browser then
    // multiplies by the SAME zoom again. That double application shrinks the
    // flight and drags it toward the top-left (a "wrong origin" that only shows
    // when zoom ≠ 1). Convert the rects back to CSS px by dividing out the zoom
    // so the clone renders exactly over the real thumbnail and frame.
    const z =
      parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
    const unzoom = (r: FlightRect): FlightRect =>
      z === 1
        ? r
        : {
            left: r.left / z,
            top: r.top / z,
            width: r.width / z,
            height: r.height / z,
          };
    const from = unzoom(s.from);
    const to = s.to ? unzoom(s.to) : null;

    if (s.phase === "entering" && !to) {
      // Gallery click landed; the zoom page hasn't reported its frame rect
      // yet — hold at the gallery rect (rendered at its real size, so crisp).
      // Safety timeout in case it never arrives (e.g. a failed navigation),
      // so the clone can't get stuck.
      setBox(imgEl, from);
      gsap.set(imgEl, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 });
      holdTimeout = setTimeout(resetFlight, 900);
      return;
    }
    if (!to) {
      resetFlight();
      return;
    }

    // FLIP: lay the clone out at the LARGER of the two rects, then animate the
    // transform from "appears at `from`" to "appears at `to`". Because the
    // element's real box is the larger size, the bitmap is only ever scaled
    // DOWN (or to 1:1) — never magnified — so it stays full-resolution every
    // frame. (The old approach sized the box at the small `from` rect and
    // scaled it UP toward `to`, which bitmap-upscaled the image and read as a
    // low-res photo that only "sharpened" at the hand-off.) `from` and `to`
    // carry the same full-res src as the destination frame, so the cross-fade
    // at the end is between two identical images — no visible quality switch.
    const base = from.width * from.height >= to.width * to.height ? from : to;
    setBox(imgEl, base);
    gsap.set(imgEl, { ...transformFor(base, from), opacity: 1 });

    gsap.to(imgEl, {
      ...transformFor(base, to),
      duration: FLIGHT_DURATION_MS / 1000,
      ease: EASE,
      onComplete: () => {
        // Starts the instant the transform tween ends, with no extra delay —
        // must line up exactly with the real frame's own reveal (see
        // photo-frame--suppress-anim in the zoom page), which uses the same
        // FLIGHT_REVEAL_MS duration starting at the same instant.
        gsap.to(imgEl, {
          opacity: 0,
          duration: FLIGHT_REVEAL_MS / 1000,
          ease: "sine.inOut",
          onComplete: stop,
        });
      },
    });
  });
</script>

<img
  bind:this={imgEl}
  {src}
  alt=""
  aria-hidden="true"
  class="photo-flight"
  class:photo-flight--visible={visible}
  draggable="false"
/>

<style>
  .photo-flight {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    z-index: 3000;
    object-fit: cover;
    border-radius: var(--radius-s, 4px);
    pointer-events: none;
    opacity: 0;
    will-change: transform, opacity;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
  }

  .photo-flight--visible {
    /* GSAP drives transform/opacity directly once visible; this class only
       exists so idle frames don't paint a stray 0×0 node. */
    display: block;
  }
</style>
