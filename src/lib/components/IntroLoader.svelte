<script lang="ts">
  /*
   * Tile-cross intro loader.
   *
   * Three volunteer photos are shown sequentially. Each photo gets its
   * own full 0→100 % tile-reveal cycle: the face emerges from the core
   * outward, all tiles resolve, then a soft blur-reset transition leads
   * into the next photo. On exit the dark background vanishes instantly
   * and the individual tiles scatter upward — no black-screen fade.
   */

  /* ── Photo pool ─────────────────────────────────────────────────── */
  const PHOTOS = [
    'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1',  // Rudy Bre
    'https://www.figma.com/api/mcp/asset/aa1bcc44-33a0-48b1-a75c-913f2d3630eb',  // Michele Tomolillo
    'https://www.figma.com/api/mcp/asset/331fa98b-1d4f-4c52-84df-2f4e0da7c169',  // Valentina Guerrini
  ] as const;

  const N      = PHOTOS.length;      // 3 photo cycles
  const CYCLE  = 100 / N;            // ≈ 33.33 % of loaderProgress per photo

  /* ── Grid ───────────────────────────────────────────────────────── */
  const COLS = 5, ROWS = 7, CX = 2, CY = 3;

  const CROSS: [number, number][] = [
                    [2, 0],
            [1, 1], [2, 1], [3, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
            [1, 5], [2, 5], [3, 5],
                    [2, 6],
  ];

  /* Deterministic hash → organic per-tile variation */
  function h(c: number, r: number) {
    let v = (c * 2654435769 ^ r * 2246822519) >>> 0;
    v = ((v >> 16) ^ v) >>> 0;
    return v / 4294967295;
  }

  const TILES = [...CROSS]
    .map(([c, r]) => ({ c, r, dist: Math.sqrt((c - CX) ** 2 + (r - CY) ** 2) }))
    .sort((a, b) => a.dist - b.dist)
    .map((t, i) => {
      const rng = h(t.c, t.r);
      return {
        ...t,
        threshold: (i / CROSS.length) * 100,   // 0–100 within each cycle
        delay:  Math.round(rng * 90),           // 0–90 ms CSS delay
        dur:    580 + Math.round(rng * 220),    // 580–800 ms
        blur:   5   + Math.round(rng * 7),      // 5–12 px starting blur
      };
    });

  /* ── Props ──────────────────────────────────────────────────────── */
  let {
    showIntro       = true,
    introExiting    = false,
    loaderProgress  = 0,
    /* kept for prop-compat, not used for photo logic */
    loaderPhotoSrc  = '',
    loaderBlockLayouts = [],
    activeLoaderSet    = 0,
  } = $props<{
    showIntro?: boolean;
    introExiting?: boolean;
    loaderProgress?: number;
    loaderPhotoSrc?: string;
    loaderBlockLayouts?: unknown[];
    activeLoaderSet?: number;
  }>();

  /* ── Per-photo cycle logic ──────────────────────────────────────── *
   *  cycleIdx   : which of the 3 photos we're on (0, 1, 2)           *
   *  cycleP     : local 0–100 progress within the current photo      *
   *  cycling    : true for 200 ms during the reset between photos —  *
   *               makes revealed tiles blur back out before the new   *
   *               photo starts revealing                              */
  const cycleIdx = $derived(Math.min(Math.floor(loaderProgress / CYCLE), N - 1));
  const cycleP   = $derived(((loaderProgress % CYCLE) / CYCLE) * 100);

  let cycling   = $state(false);
  let _prevIdx  = 0;              // plain var — not tracked by Svelte

  $effect(() => {
    const idx = cycleIdx;         // track this reactive value
    if (idx === _prevIdx) return;
    _prevIdx = idx;
    cycling  = true;
    const t  = setTimeout(() => (cycling = false), 200);
    return () => clearTimeout(t);
  });
</script>

{#if showIntro}
  <div class={`intro-loader${introExiting ? ' intro-loader--exit' : ''}`}>

    <div class="mosaic" style="--cols:{COLS}; --rows:{ROWS};">
      {#each TILES as tile (tile.c + '-' + tile.r)}
        <div
          class="tile"
          class:on={!cycling && cycleP >= tile.threshold}
          style="
            --c:{tile.c}; --r:{tile.r};
            --td:{tile.delay}ms; --dur:{tile.dur}ms; --blur:{tile.blur}px;
            background-image: url('{PHOTOS[cycleIdx]}');
          "
          aria-hidden="true"
        ></div>
      {/each}
    </div>

    <span class="pct">{Math.round(loaderProgress)}%</span>

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
    gap: clamp(18px, 2.8vh, 36px);
    background: #0e0e0e;
    pointer-events: none;
    overflow: hidden;
    /* no transition on the shell itself — only tiles animate out */
  }

  /* ── Exit: tiles scatter, background vanishes instantly ──────── *
   * The dark background is removed immediately so the live page    *
   * shows through as the tiles dissolve — no black-screen moment.  */
  .intro-loader--exit {
    background: transparent;
  }

  .intro-loader--exit .tile.on {
    opacity:   0 !important;
    transform: translateY(-14px) !important;
    filter:    blur(10px) !important;
    transition:
      opacity   380ms cubic-bezier(0.22, 1, 0.36, 1) var(--td, 0ms),
      transform 380ms cubic-bezier(0.22, 1, 0.36, 1) var(--td, 0ms),
      filter    380ms cubic-bezier(0.16, 1, 0.3,  1) var(--td, 0ms);
  }

  .intro-loader--exit .pct {
    opacity: 0;
    transition: opacity 150ms ease;
  }

  /* ── Mosaic ───────────────────────────────────────────────────── */
  .mosaic {
    position: relative;
    --t: clamp(54px, 9.2vw, 106px);
    width:  calc(var(--cols) * var(--t));
    height: calc(var(--rows) * var(--t));
  }

  /* ── Tile ─────────────────────────────────────────────────────── */
  .tile {
    position: absolute;
    width:  var(--t);
    height: var(--t);
    left: calc(var(--c) * var(--t));
    top:  calc(var(--r) * var(--t));
    background-size:
      calc(var(--cols) * var(--t))
      calc(var(--rows) * var(--t));
    background-position:
      calc(-1 * var(--c) * var(--t))
      calc(-1 * var(--r) * var(--t));
    background-repeat: no-repeat;

    opacity:   0;
    transform: translateY(8px);
    filter:    blur(var(--blur, 7px));
    will-change: opacity, transform, filter;
    transition:
      opacity   var(--dur, 680ms) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--td, 0ms),
      transform var(--dur, 680ms) cubic-bezier(0.22, 1, 0.36, 1)       var(--td, 0ms),
      filter    calc(var(--dur, 680ms) * 1.3) cubic-bezier(0.16, 1, 0.3, 1) var(--td, 0ms);
  }

  .tile.on {
    opacity:   1;
    transform: translateY(0px);
    filter:    blur(0px);
  }

  /* ── Counter ──────────────────────────────────────────────────── */
  .pct {
    display: block;
    font-family: 'Forma DJR Display', sans-serif;
    font-size:   clamp(10px, 1vw, 13px);
    font-weight: 400;
    letter-spacing: 0.14em;
    color: rgba(250, 250, 250, 0.48);
  }
</style>
