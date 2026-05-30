<script lang="ts">
  /*
   * Cross-tile loader.
   *
   * One photo, eight rectangular tiles arranged in a + pattern on a dark
   * background. Each tile is a viewport into the same underlying image —
   * a CSS background-position trick maps the correct slice of the photo
   * to each tile. Tiles emerge from the centre outward as progress rises.
   *
   *   Grid (4 cols × 3 rows, cross shape):
   *
   *       [1][2]
   *   [3][4][5][6]
   *       [7][8]
   *
   *   col indexes:  0  1  2  3
   *   row indexes:     0        ← only cols 1-2
   *                0  1  2  3  ← all cols
   *                   2        ← only cols 1-2
   */

  const COLS = 4;
  const ROWS = 3;

  /* Tiles in reveal order — centre first, arms last. */
  const TILES = [
    { col: 1, row: 1, revealAt:  5 },
    { col: 2, row: 1, revealAt: 18 },
    { col: 1, row: 0, revealAt: 30 },
    { col: 2, row: 0, revealAt: 42 },
    { col: 0, row: 1, revealAt: 53 },
    { col: 3, row: 1, revealAt: 63 },
    { col: 1, row: 2, revealAt: 74 },
    { col: 2, row: 2, revealAt: 85 },
  ] as const;

  let {
    showIntro = true,
    introExiting = false,
    loaderPhotoSrc = "",
    loaderBlockLayouts = [],   // kept for prop compat, unused
    activeLoaderSet = 0,       // kept for prop compat, unused
    loaderProgress = 0,
  } = $props<{
    showIntro?: boolean;
    introExiting?: boolean;
    loaderPhotoSrc?: string;
    loaderBlockLayouts?: Array<
      { left: number; top: number; width: number; height: number }[]
    >;
    activeLoaderSet?: number;
    loaderProgress?: number;
  }>();
</script>

{#if showIntro}
  <div class={`intro-loader${introExiting ? ' intro-loader--exit' : ''}`}>

    <!-- ── Cross-tile photo ───────────────────────────────────────── -->
    <div class="tile-cross" style="--cols:{COLS}; --rows:{ROWS};">
      {#each TILES as tile}
        <!--
          --c / --r drive both the tile's absolute position AND the
          background-position offset so every tile shows the correct
          slice of the same underlying photo.
        -->
        <div
          class="tile"
          class:tile--visible={loaderProgress >= tile.revealAt}
          style="--c:{tile.col}; --r:{tile.row};"
        >
          <div
            class="tile-photo"
            style="background-image: url('{loaderPhotoSrc}');"
          ></div>
        </div>
      {/each}
    </div>

    <!-- ── Progress counter ───────────────────────────────────────── -->
    <p class="loader-percent">{Math.round(loaderProgress)}%</p>

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
    gap: 28px;
    background: var(--color-background-primary, #0e0e0e);
    opacity: 1;
    transform: scale(1);
    transition: opacity 0.6s ease, transform 0.6s ease;
    pointer-events: none;
    overflow: hidden;
  }

  .intro-loader--exit {
    opacity: 0;
    transform: scale(0.985);
  }

  /* ── Tile cross ───────────────────────────────────────────────── *
   *                                                                  *
   *  --tile  : size of each square tile                              *
   *  --gap   : space between tiles (the dark background shows here)  *
   *  --w / --h: total bounding box of the 4×3 grid                   *
   *                                                                  *
   *  The cross leaves the four corners empty, so the container is    *
   *  sized to the full grid but only tiles 1-8 exist in the DOM.     */
  .tile-cross {
    position: relative;
    --tile: clamp(64px, 9.5vw, 130px);
    --gap:  clamp(5px, 0.65vw, 9px);
    --w: calc(var(--cols) * var(--tile) + (var(--cols) - 1) * var(--gap));
    --h: calc(var(--rows) * var(--tile) + (var(--rows) - 1) * var(--gap));
    width:  var(--w);
    height: var(--h);
  }

  /* ── Individual tile ──────────────────────────────────────────── *
   *  Positioned by --c (column) and --r (row) CSS vars.             *
   *  overflow:hidden clips the oversized .tile-photo inside.        */
  .tile {
    position: absolute;
    left: calc(var(--c) * (var(--tile) + var(--gap)));
    top:  calc(var(--r) * (var(--tile) + var(--gap)));
    width:  var(--tile);
    height: var(--tile);
    overflow: hidden;
    border-radius: 4px;

    opacity: 0;
    transform: scale(0.82);
    transition:
      opacity   680ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 680ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .tile--visible {
    opacity: 1;
    transform: scale(1);
  }

  /* ── Photo slice ──────────────────────────────────────────────── *
   *  Sized to the full grid (--w × --h) and shifted so that the     *
   *  visible window of each tile corresponds to its grid position.   *
   *  background-size:cover centres the photo with correct cropping.  */
  .tile-photo {
    position: absolute;
    /* Offset: slide the full-grid image so this tile's area is shown */
    left: calc(-1 * var(--c) * (var(--tile) + var(--gap)));
    top:  calc(-1 * var(--r) * (var(--tile) + var(--gap)));
    width:  var(--w);
    height: var(--h);
    background-size: cover;
    background-position: center 20%; /* favour face / upper body */
    background-repeat: no-repeat;
  }

  /* ── Progress counter ─────────────────────────────────────────── */
  .loader-percent {
    margin: 0;
    font-family: var(--font-display, sans-serif);
    font-size: clamp(18px, 2.2vw, 28px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.06em;
    color: var(--color-content-body, #fafafa);
    opacity: 0.7;
  }
</style>
