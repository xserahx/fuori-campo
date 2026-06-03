<div class="title-wrap" aria-label="FUORI CAMPO">
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
      translate(-50%, calc(-50% - var(--hero-scroll-p, 0) * 52px))
      scale(calc(1 - var(--hero-scroll-p, 0) * 0.06));
    opacity: calc(1 - var(--hero-scroll-p, 0) * 1.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(1083px, 94vw);
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
    font-size:   clamp(120px, 20vw, 300px);
    line-height: clamp(100px, 16.7vw, 250px);
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

  .fuori {
    color: var(--color-content-accent, #bdff5d);
    animation: word-in 1600ms cubic-bezier(0.16, 1, 0.3, 1) 2800ms both;
  }

  .campo {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
    animation: word-in 1600ms cubic-bezier(0.16, 1, 0.3, 1) 3080ms both;
  }
</style>
