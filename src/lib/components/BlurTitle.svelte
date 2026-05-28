<script lang="ts">
  import { onMount } from "svelte";

  let titleWrap: HTMLElement | null = null;
  let animId:    number | null = null;

  /* ── smooth noise ── */
  function noise(x: number, y: number, t: number): number {
    return (
      Math.sin(x * 1.1 + t * 0.00032) * Math.cos(y * 0.9 - t * 0.00025) * 0.55 +
      Math.sin(x * 0.5 - y * 0.8 + t * 0.00018) * 0.45
    );
  }

  /* ── each fog zone is just a <div> with radial-gradient + filter:blur ── */
  interface FogZone {
    el: HTMLDivElement;
    /* base position as fraction of container */
    ox: number; oy: number;
    x: number;  y: number;
    /* drift */
    ph: number; dF: number; dAx: number; dAy: number;
    /* size breathing */
    baseW: number; baseH: number; bF: number; bA: number;
    /* opacity */
    aBase: number; aPh: number; aF: number;
    /* blur */
    blurBase: number; blurAmp: number; blurPh: number; blurF: number;
  }

  const NUM = 7;
  let zones: FogZone[] = [];
  let tick = 0;
  let blurProgress = 0; /* 0 = in view, 1 = scrolled away */

  onMount(() => {
    if (!titleWrap) return;

    /* build the fog zones as absolutely-positioned divs inside titleWrap */
    zones = Array.from({ length: NUM }, (_, i) => {
      const el = document.createElement("div");
      el.style.cssText = `
        position:absolute;
        border-radius:50%;
        pointer-events:none;
        mix-blend-mode:screen;
        will-change:transform,opacity,filter;
        background: radial-gradient(
          ellipse at center,
          rgba(180,180,180,0.28) 0%,
          rgba(140,140,140,0.12) 35%,
          rgba(100,100,100,0.04) 65%,
          transparent 100%
        );
      `;
      titleWrap!.appendChild(el);

      const ox = 0.12 + (i / (NUM - 1)) * 0.76;
      const oy = 0.20 + Math.random() * 0.60;

      return {
        el,
        ox, oy, x: ox, y: oy,
        ph:    Math.random() * Math.PI * 2,
        dF:    0.00035 + Math.random() * 0.00055,
        dAx:   0.055 + Math.random() * 0.07,
        dAy:   0.025 + Math.random() * 0.04,
        baseW: 55 + Math.random() * 45,   /* % of container width */
        baseH: 55 + Math.random() * 45,
        bF:    0.0006 + Math.random() * 0.002,
        bA:    0.10 + Math.random() * 0.18,
        aBase: 0.55 + Math.random() * 0.35,
        aPh:   Math.random() * Math.PI * 2,
        aF:    0.0004 + Math.random() * 0.0014,
        blurBase: 60 + Math.random() * 50,
        blurAmp:  25 + Math.random() * 35,
        blurPh:   Math.random() * Math.PI * 2,
        blurF:    0.0004 + Math.random() * 0.0016,
      } as FogZone;
    });

    /* scroll → blur */
    function onScroll() {
      if (!titleWrap) return;
      const heroH = window.innerHeight;
      const scrolled = window.scrollY;
      blurProgress = Math.min(1, Math.max(0, (scrolled - heroH * 0.15) / (heroH * 0.55)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {});
    ro.observe(titleWrap);

    let smoothBlurExtra = 0;

    function frame() {
      tick++;

      /* smooth scroll-blur */
      smoothBlurExtra += (blurProgress * 70 - smoothBlurExtra) * 0.05;

      const W = titleWrap!.offsetWidth;
      const H = titleWrap!.offsetHeight;

      for (const z of zones) {
        /* drift position with layered noise */
        const nx = noise(z.ox * 3,     z.oy * 3,     tick);
        const ny = noise(z.ox * 3 + 7, z.oy * 3 + 7, tick);
        z.x = z.ox + Math.sin(tick * z.dF + z.ph) * z.dAx + nx * 0.025;
        z.y = z.oy + Math.cos(tick * z.dF * 0.6 + z.ph + 1.3) * z.dAy + ny * 0.018;

        /* breathe size */
        const bMod = 1 + Math.sin(tick * z.bF + z.ph) * z.bA;
        const w = z.baseW * bMod;
        const h = z.baseH * bMod;

        /* opacity */
        const a = z.aBase * (0.6 + 0.4 * Math.sin(tick * z.aF + z.aPh));

        /* per-zone blur oscillation + scroll blur */
        const blur = z.blurBase
          + Math.sin(tick * z.blurF + z.blurPh) * z.blurAmp
          + smoothBlurExtra;

        /* position: centre the ellipse on (x,y) */
        const left = (z.x * W) - (w / 100 * W) / 2;
        const top  = (z.y * H) - (h / 100 * H) / 2;

        const s = z.el.style;
        s.width   = `${w}%`;
        s.height  = `${h}%`;
        s.left    = `${left}px`;
        s.top     = `${top}px`;
        s.opacity = a.toFixed(3);
        s.filter  = `blur(${blur.toFixed(1)}px)`;
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      zones.forEach(z => z.el.remove());
    };
  });
</script>

<h1
  class="title-wrap"
  bind:this={titleWrap}
  aria-label="FUORI CAMPO"
>
  <!-- fog zones injected by JS live here (position:absolute) -->

  <!-- layer 1: sharp text -->
  <div class="title-text layer-sharp" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>

  <!-- layer 2: blurred text copy — no mask, just CSS blur -->
  <div class="title-text layer-blurred" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>

  <!-- spacer -->
  <div class="title-text spacer" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>
</h1>

<style>
  .title-wrap {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    width: min(1083px, 90vw);
    max-width: 100vw;
    user-select: none;
    pointer-events: none;
    background: transparent;
    box-sizing: border-box;
    z-index: 10;
    overflow: visible;
  }

  .title-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    font-family: var(--font-display);
    font-size: 300px;
    line-height: 250px;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
  }

  .spacer {
    position: relative;
    visibility: hidden;
  }

  .layer-sharp {
    z-index: 2;
  }

  /* blurred copy sits behind the sharp layer
     blur(25px) matches Figma FOREGROUND_BLUR radius:25 (node 3773:4324) */
  .layer-blurred {
    z-index: 1;
    filter: blur(25px);
    opacity: 0.55;
  }

  /* Grain texture — Figma GRAIN radius:8 */
  .title-wrap::after {
    content: "";
    position: absolute;
    inset: -12%;
    z-index: 4;
    pointer-events: none;
    opacity: 0.06;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
  }

  .layer-blurred .fuori,
  .layer-blurred .campo {
    color: var(--color-content-title);
    -webkit-text-fill-color: var(--color-content-title);
    -webkit-text-stroke-width: 0;
  }

  .fuori {
    color: var(--color-content-title);
    text-align: center;
  }

  /* CAMPO is transparent — no explicit stroke.
     The blurred layer behind it spreads a lime glow into this area,
     matching Figma's FOREGROUND_BLUR effect (no visible contour). */
  .campo {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-width: 0;
    text-align: center;
  }
</style>