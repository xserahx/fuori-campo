<script lang="ts">
  /*
   * Tile-cross intro loader.
   *
   * Three volunteer faces are revealed in sequence. Each gets its own
   * 0→100 % cycle: tiles bloom outward from the core (assemble), the full
   * face holds for a beat, then a soft blur-pulse hands off to the next
   * photo. The whole cross breathes gently while loading. On exit the outer
   * tiles dissolve first and the face lingers last as the live page is
   * revealed underneath — no black-screen fade.
   */

  import { onMount } from 'svelte';

  /* ── Photo pool — three volunteer face portraits, one per third of the
        load. Chosen as tight close-ups so the face fills the cross. ─────── */
  /* `anchor` (0–1) places the face vertically in the crop — small = face high
     in the photo; larger = face sits lower. Tuned per photo. */
  const PHOTOS = [
    { src: '/volunteer_images/volontari/cavalluzzo-antonio/IMG_7705.webp',                       anchor: 0.40 }, // Antonio Cavalluzzo
    { src: '/volunteer_images/volontari/chiesa-roberta/IMG_7385.webp',                           anchor: 0.14 }, // Roberta Chiesa
    { src: '/volunteer_images/volontari/carera-carla/ce752846-cea1-448b-a4ad-48fc33037052.webp', anchor: 0.14 }, // Carla Carera
  ] as const;

  const N      = PHOTOS.length;      // 3 photo cycles
  const CYCLE  = 100 / N;            // ≈ 33.33 % of loaderProgress per photo

  /* ── Grid ───────────────────────────────────────────────────────── */
  const COLS = 5, ROWS = 5, CX = 2, CY = 2;
  const TILE = 106, MW = COLS * TILE, MH = ROWS * TILE; // mosaic px (matches CSS --t)

  const CROSS: [number, number][] = [
            [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
            [1, 4], [2, 4], [3, 4],
  ];

  /* Deterministic hash → organic per-tile variation */
  function h(c: number, r: number) {
    let v = (c * 2654435769 ^ r * 2246822519) >>> 0;
    v = ((v >> 16) ^ v) >>> 0;
    return v / 4294967295;
  }

  /* Tiles ordered centre-out. Each carries its own reveal threshold and organic
     delay / duration / blur, so the face blooms slowly from the core outward. */
  const TILES = [...CROSS]
    .map(([c, r]) => ({ c, r, dist: Math.sqrt((c - CX) ** 2 + (r - CY) ** 2) }))
    .sort((a, b) => a.dist - b.dist)
    .map((t, i) => {
      const rng = h(t.c, t.r);
      return {
        ...t,
        // Assemble across the first ~58% of each cycle, then the face holds.
        threshold: (i / CROSS.length) * 58,
        delay:     Math.round(rng * 100),        // 0–100 ms reveal delay
        dur:       780 + Math.round(rng * 280),  // 780–1060 ms (slow, cinematic)
        blur:      7 + Math.round(rng * 9),       // 7–16 px starting blur
      };
    });

  /* ── Props ──────────────────────────────────────────────────────── */
  let {
    showIntro      = true,
    introExiting   = false,
    loaderProgress = 0,
  } = $props<{
    showIntro?: boolean;
    introExiting?: boolean;
    loaderProgress?: number;
  }>();

  /* ── Per-photo cycle logic ──────────────────────────────────────── *
   *  cycleIdx : which of the 3 photos we're on (0, 1, 2)              *
   *  cycleP   : local 0–100 progress within the current photo         *
   *  swap     : brief blur-pulse on the mosaic while the photo swaps   */
  /* Clamp just below 100 so the final face stays fully assembled at the end —
     progress === 100 would otherwise wrap cycleP back to 0 and blank it out. */
  const eff      = $derived(Math.min(loaderProgress, 99.999));
  const cycleIdx = $derived(Math.min(Math.floor(eff / CYCLE), N - 1));
  const cycleP   = $derived(Math.min(100, ((eff - cycleIdx * CYCLE) / CYCLE) * 100));

  let swap     = $state(false);
  let _prevIdx = 0;              // plain var — not tracked by Svelte

  $effect(() => {
    const idx = cycleIdx;        // track this reactive value
    if (idx === _prevIdx) return;
    _prevIdx = idx;
    swap = true;
    const t = setTimeout(() => (swap = false), 280);
    return () => clearTimeout(t);
  });

  /* ── Cover-crop ─────────────────────────────────────────────────── *
   *  Load each photo's natural size so the cross shows a centred,      *
   *  undistorted "cover" crop (zoomed onto the face) instead of        *
   *  stretching the image into the 5×7 portrait grid.                  */
  let dims = $state<({ w: number; h: number } | null)[]>(PHOTOS.map(() => null));

  onMount(() => {
    PHOTOS.forEach((p, i) => {
      const img = new Image();
      img.onload = () => {
        dims[i] = { w: img.naturalWidth, h: img.naturalHeight };
        dims = [...dims];   // reassign so $derived recomputes
      };
      img.src = p.src;
    });
  });

  const ZOOM = 1.2; // tighter than plain cover so the face dominates the cross
  const cover = $derived.by(() => {
    const d = dims[cycleIdx];
    if (!d || !d.w || !d.h) return { bw: MW, bh: MH, ox: 0, oy: 0 }; // pre-load fallback
    const scale = Math.max(MW / d.w, MH / d.h) * ZOOM;
    const bw = d.w * scale, bh = d.h * scale;
    return { bw, bh, ox: (MW - bw) / 2, oy: (MH - bh) * PHOTOS[cycleIdx].anchor };
  });
</script>

{#if showIntro}
  <div class={`intro-loader${introExiting ? ' intro-loader--exit' : ''}`}>

    <div class="mosaic-wrap">
      <div
        class={`mosaic${swap ? ' mosaic--swap' : ''}`}
        style="--cols:{COLS}; --rows:{ROWS}; --t:{TILE}px; --bw:{cover.bw}px; --bh:{cover.bh}px; --ox:{cover.ox}px; --oy:{cover.oy}px;"
      >
        {#each TILES as tile (tile.c + '-' + tile.r)}
          <div
            class="tile"
            class:on={!swap && cycleP >= tile.threshold}
            style="
              --c:{tile.c}; --r:{tile.r};
              --td:{tile.delay}ms; --dur:{tile.dur}ms; --blur:{tile.blur}px;
              background-image: url('{PHOTOS[cycleIdx].src}');
            "
            aria-hidden="true"
          ></div>
        {/each}
      </div>
    </div>

    <div class="hud" aria-hidden="true">
      <div class="bar"><span class="bar-fill" style="--p:{loaderProgress};"></span></div>
      <span class="pct">{Math.round(loaderProgress)}%</span>
    </div>

  </div>
{/if}

<style>
  /* ── Shell ────────────────────────────────────────────────────── */
  .intro-loader {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
    background: #0e0e0e;
    pointer-events: none;
    overflow: hidden;
  }

  /* Cinematic vignette that breathes very gently — adds depth and life. */
  .intro-loader::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(120% 90% at 50% 44%, transparent 52%, rgba(0, 0, 0, 0.62) 100%);
    opacity: 1;
    transition: opacity 360ms ease;
    animation: vignette-breathe 5s ease-in-out infinite;
  }

  @keyframes vignette-breathe {
    0%, 100% { opacity: 0.75; }
    50%       { opacity: 1; }
  }

  /* ── Exit: the final face dissolves into the dark background FIRST, then  *
   * the dark shell fades to reveal the homepage — the photo is fully gone   *
   * before the page shows through (it never melts on top of the homepage).  */
  .intro-loader--exit .mosaic-wrap {
    animation: none;
    opacity: 0;
    transform: scale(1.05);
    filter: blur(7px);
    transition:
      opacity   1300ms cubic-bezier(0.33, 0, 0.2, 1),
      transform 1500ms cubic-bezier(0.16, 1, 0.3, 1),
      filter    1300ms ease;
  }

  .intro-loader--exit .hud {
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 300ms ease, transform 300ms ease;
  }

  /* Hold the dark background until the photo has faded out, THEN reveal the
     homepage underneath (delayed transition). */
  .intro-loader--exit {
    background: transparent;
    transition: background 560ms ease 1400ms;
  }
  .intro-loader--exit::before {
    opacity: 0;
    transition: opacity 560ms ease 1400ms;
  }

  /* ── Mosaic ───────────────────────────────────────────────────── */
  /* Wrapper breathes; inner mosaic owns the swap / exit transforms so the
     two never fight over `transform`. */
  .mosaic-wrap {
    animation: breathe 7s ease-in-out infinite;
    will-change: transform;
  }

  /* Slightly more organic breathe: scale + drift + micro-rotation */
  @keyframes breathe {
    0%   { transform: scale(1)     translateY(0px)  rotate(0deg); }
    33%  { transform: scale(1.018) translateY(-7px) rotate(0.28deg); }
    66%  { transform: scale(1.011) translateY(-4px) rotate(-0.18deg); }
    100% { transform: scale(1)     translateY(0px)  rotate(0deg); }
  }

  .mosaic {
    position: relative;
    --t: 106px;
    width:  calc(var(--cols) * var(--t));
    height: calc(var(--rows) * var(--t));
    transition: filter 280ms ease, transform 280ms ease;
  }

  /* Photo hand-off: deeper blur + desaturation + stronger contract */
  .mosaic--swap {
    filter: blur(14px) saturate(0.25);
    transform: scale(0.972);
  }

  /* ── Tile ─────────────────────────────────────────────────────── */
  .tile {
    position: absolute;
    width:  var(--t);
    height: var(--t);
    left: calc(var(--c) * var(--t));
    top:  calc(var(--r) * var(--t));
    transform-origin: center;
    /* Centred "cover" crop — --bw/--bh/--ox/--oy come from .mosaic (JS-measured);
       falls back to a plain stretch before the image size is known. */
    background-size:
      var(--bw, calc(var(--cols) * var(--t)))
      var(--bh, calc(var(--rows) * var(--t)));
    background-position:
      calc(var(--ox, 0px) - var(--c) * var(--t))
      calc(var(--oy, 0px) - var(--r) * var(--t));
    background-repeat: no-repeat;

    opacity:   0;
    transform: translateY(22px) scale(0.72);
    filter:    blur(var(--blur, 8px));
    will-change: opacity, transform, filter;
    transition:
      opacity   var(--dur, 720ms) cubic-bezier(0.16, 1, 0.3, 1)        var(--td, 0ms),
      transform var(--dur, 720ms) cubic-bezier(0.16, 1, 0.3, 1)        var(--td, 0ms),
      filter    calc(var(--dur, 720ms) * 1.25) cubic-bezier(0.16, 1, 0.3, 1) var(--td, 0ms);
  }

  .tile.on {
    opacity:   1;
    transform: translateY(0) scale(1);
    filter:    blur(0px);
  }

  /* ── HUD: thin progress line + counter ────────────────────────── */
  .hud {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .bar {
    position: relative;
    width: 132px;
    height: 2px;
    border-radius: 2px;
    background: rgba(250, 250, 250, 0.12);
    overflow: hidden;
  }

  .bar-fill {
    position: absolute;
    inset: 0;
    transform: scaleX(calc(var(--p, 0) / 100));
    transform-origin: left center;
    background: linear-gradient(90deg, rgba(189, 255, 93, 0.55), #bdff5d);
    /* keeps the fill smooth even if progress arrives in small steps */
    transition: transform 120ms linear;
  }

  .pct {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.22em;
    font-variant-numeric: tabular-nums;
    color: rgba(250, 250, 250, 0.5);
  }

  /* ── Mobile — scale the 530px mosaic down to fit the screen ──────
     transform: scale keeps the layout box at 530px; negative margins on
     .mosaic-wrap collapse that dead space so the HUD sits correctly.   */
  @media (max-width: 599px) {
    .intro-loader { gap: 24px; }
    .mosaic-wrap {
      /* (530 × (1 - 0.6)) / 2 = 106px — pulls the layout edges inward */
      margin: -106px 0;
    }
    .mosaic {
      transform: scale(0.6);
    }
    .mosaic--swap {
      /* combine base mobile scale with the swap pull-back: 0.6 × 0.972 */
      transform: scale(0.583);
      filter: blur(14px) saturate(0.25);
    }
  }

  /* ── Reduced motion — keep it simple and quick ─────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .mosaic-wrap { animation: none; }
    .mosaic, .mosaic--swap { filter: none; transform: none; transition: none; }
    .tile {
      transform: none;
      filter: none;
      transition: opacity 200ms ease var(--td, 0ms);
    }
    .tile.on { transform: none; }
    .intro-loader--exit .mosaic-wrap {
      opacity: 0;
      transform: none;
      filter: none;
      transition: opacity 320ms ease;
    }
    .intro-loader--exit { transition: background 240ms ease 340ms; }
    .intro-loader--exit::before { transition: opacity 240ms ease 340ms; }
    .bar-fill { transition: none; }
  }
</style>
