<script lang="ts">
  /* `quick` is set when the intro loader is skipped (return visits) so the
     title blooms in promptly instead of waiting for the loader's timeline. */
  let { quick = false } = $props<{ quick?: boolean }>();
</script>

<div class="title-wrap" class:title-wrap--quick={quick} aria-label="FUORI CAMPO">
  <span class="fuori">FUORI</span>
  <span class="campo">CAMPO</span>
</div>

<style>
  /* ── Scroll-driven parallax + fade ───────────────────────────────
     --hero-scroll-p is written every RAF frame by the homepage
     spring loop (0 at hero top → 1 when hero is ~70 % scrolled past).
     The transform incorporates the existing -50 % centering so the
     element stays anchored even as it drifts upward.                */
  .title-wrap {
    position: fixed;
    top: 50%;
    left: 50%;
    transform:
      translate(-50%, calc(-50% - var(--hero-scroll-p, 0) * var(--hero-parallax-shift, 52px)))
      scale(calc(1 - var(--hero-scroll-p, 0) * 0.06));
    opacity: calc(1 - var(--hero-scroll-p, 0) * 1.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 1083px;
    max-width: 100vw;
    user-select: none;
    pointer-events: none;
    z-index: 10;
    will-change: transform, opacity;
  }

  .fuori,
  .campo {
    display: block;
    font-family: var(--font-display);
    /* Compensate for the html{zoom} system so the title maintains a near-constant
       physical size at any viewport: figma_px / zoom ≈ constant physical pixels.
       Clamped so it never exceeds 520px CSS (safe cap) nor drops below 180px. */
    font-size:   clamp(180px, calc(300px / max(var(--page-zoom, 1), 0.65)), 520px);
    line-height: clamp(150px, calc(250px / max(var(--page-zoom, 1), 0.65)), 430px);
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    white-space: nowrap;
    text-align: center;
    will-change: transform, opacity, filter;
    transform-origin: center center;
  }

  /* ── Cinematic entrance ──────────────────────────────────────────
     Starts at 2 800 ms so FUORI is mid-animation (~57 %) when the
     intro loader finishes its 600 ms fade-out at t = 3 600 ms.
     CAMPO follows 280 ms later for a natural cascade.              */
  @keyframes word-in {
    from {
      opacity: 0;
      filter: blur(42px);
      transform: translateY(32px) scale(1.06);
    }
    to {
      opacity: 1;
      filter: blur(0px);
      transform: translateY(0px) scale(1);
    }
  }

  /* First visit: delays sync with the intro loader's 3600ms finish.
     Return visit (.title-wrap--quick): no loader, so start almost immediately. */
  .title-wrap {
    --fuori-delay: 2800ms;
    --campo-delay: 3080ms;
  }
  .title-wrap--quick {
    --fuori-delay: 150ms;
    --campo-delay: 430ms;
  }

  .fuori {
    color: var(--color-content-accent, #bdff5d);
    animation: word-in 1600ms cubic-bezier(0.16, 1, 0.3, 1) var(--fuori-delay) both;
  }

  .campo {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
    animation: word-in 1600ms cubic-bezier(0.16, 1, 0.3, 1) var(--campo-delay) both;
  }

  @media (prefers-reduced-motion: reduce) {
    .fuori,
    .campo {
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }
</style>
