<script lang="ts">
  /* `quick` is set when the intro loader is skipped (return visits) so the
     title blooms in promptly instead of waiting for the loader's timeline. */
  let { quick = false } = $props<{ quick?: boolean }>();

  /* Split the two words into individual characters so each letter can enter
     independently with a staggered delay — far more cinematic than a single
     block reveal.                                                            */
  const fuoriChars = ['F', 'U', 'O', 'R', 'I'];
  const campoChars = ['C', 'A', 'M', 'P', 'O'];
</script>

<div class="title-wrap" class:title-wrap--quick={quick} aria-label="FUORI CAMPO">
  <span class="fuori" aria-hidden="true">{#each fuoriChars as char, i}<span class="char" style="--i:{i}">{char}</span>{/each}</span>
  <span class="campo" aria-hidden="true">{#each campoChars as char, i}<span class="char" style="--i:{i}">{char}</span>{/each}</span>
</div>

<style>
  /* ── Scroll-driven parallax + fade ───────────────────────────────
     --hero-scroll-p is written every RAF frame by the homepage
     spring loop (0 at hero top → 1 when hero is ~70 % scrolled past).    */
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

  /* ── Timing delays: first visit syncs with the loader timeline,
     return visit (.title-wrap--quick) starts almost immediately.   */
  .title-wrap {
    --fuori-delay: 2800ms;
    --campo-delay: 3100ms;
  }
  .title-wrap--quick {
    --fuori-delay: 150ms;
    --campo-delay: 440ms;
  }

  /* ── Word wrappers — block display, font-size:0 collapses any
     whitespace nodes the template might insert between char spans.  */
  .fuori,
  .campo {
    display: block;
    font-size: 0;
    text-align: center;
    white-space: nowrap;
  }

  .fuori {
    color: var(--color-content-accent, #bdff5d);
    --word-delay: var(--fuori-delay, 2800ms);
  }

  .campo {
    /* Outline-only variant: transparent fill, lime stroke */
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
    --word-delay: var(--campo-delay, 3100ms);
  }

  /* ── Per-character span ─────────────────────────────────────────
     animation-delay = word baseline + (char index × 44 ms stagger)
     so each letter blooms in cascade order: F → U → O → R → I     */
  .char {
    display: inline-block;
    font-family: var(--font-display);
    font-size:   clamp(180px, calc(300px / max(var(--page-zoom, 1), 0.65)), 520px);
    line-height: clamp(150px, calc(250px / max(var(--page-zoom, 1), 0.65)), 430px);
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    will-change: transform, opacity, filter;
    animation: char-in 1300ms cubic-bezier(0.16, 1, 0.3, 1)
      calc(var(--word-delay, 2800ms) + var(--i, 0) * 44ms) both;
  }

  /* ── Entrance: deep blur + vertical rise → overshoot → settle
     The 65% overshoot gives a spring-physics feel using pure CSS. */
  @keyframes char-in {
    0%   { opacity: 0; filter: blur(28px); transform: translateY(36px) scale(1.14); }
    65%  { opacity: 1; filter: blur(0px);  transform: translateY(-5px) scale(1.022); }
    82%  { transform: translateY(1.5px) scale(0.9985); }
    100% { opacity: 1; filter: blur(0px);  transform: translateY(0px) scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .char {
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }
</style>
