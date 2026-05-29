<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  let { src, tilesX = 8, tilesY = 6, baseDelay = 60, spread = 520, duration = 700, easing = 'cubic-bezier(.2,.9,.2,1)' }:
    { src?: string; tilesX?: number; tilesY?: number; baseDelay?: number; spread?: number; duration?: number; easing?: string } = $props();

  const dispatch = createEventDispatcher();

  type Tile = { r: number; c: number; id: string; delay: number; revealed: boolean };

  let tiles = $state<Tile[]>([]);
  let revealedCount = $state(0);
  let timeouts = $state<number[]>([]);

  // progress percent (runes-safe derived value)
  let percent = $derived(tiles.length ? Math.round((revealedCount / tiles.length) * 100) : 0);

  function createTiles() {
    const local: Tile[] = [];
    for (let r = 0; r < tilesY; r++) {
      for (let c = 0; c < tilesX; c++) {
        const idx = r * tilesX + c;
        // randomized delay with slight position bias for natural motion
        const posBias = (r / Math.max(1, tilesY)) * 40 + (c / Math.max(1, tilesX)) * 40;
        const d = Math.round(baseDelay + Math.random() * spread + posBias + idx * 6);
        local.push({ r, c, id: `t-${r}-${c}`, delay: d, revealed: false });
      }
    }
    tiles = local;
  }

  function clearAllTimeouts() {
    timeouts.forEach((id) => clearTimeout(id));
    timeouts = [];
  }

  onDestroy(() => {
    clearAllTimeouts();
  });

  onMount(() => {
    if (!src) return;

    // preload the source image so tiles reveal a coherent photo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      // once loaded, build tiles and stagger reveals
      createTiles();

      tiles.forEach((t) => {
        const id = setTimeout(() => {
          tiles = tiles.map(tt => tt.id === t.id ? { ...tt, revealed: true } : tt);
          revealedCount = revealedCount + 1;
          if (revealedCount === tiles.length) {
            const hold = 300;
            const doneId = setTimeout(() => dispatch('complete'), hold);
            timeouts = [...timeouts, doneId];
          }
        }, t.delay);
        timeouts = [...timeouts, id];
      });
    };
    img.onerror = () => {
      // fallback: still create tiles and reveal so UI doesn't hang
      createTiles();
      tiles.forEach((t) => {
        const id = setTimeout(() => {
          tiles = tiles.map(tt => tt.id === t.id ? { ...tt, revealed: true } : tt);
          revealedCount = revealedCount + 1;
          if (revealedCount === tiles.length) dispatch('complete');
        }, t.delay);
        timeouts = [...timeouts, id];
      });
    };
  });

  // compute style helpers
  const tileW = 100 / tilesX;
  const tileH = 100 / tilesY;
</script>

<style>
  .intro-wrap {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    background: #000;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .mosaic {
    position: relative;
    width: min(88vw, 1200px);
    max-width: 1200px;
    aspect-ratio: 4/5; /* tall portrait-friendly default */
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
  }

  .tile {
    position: relative;
    overflow: hidden;
    background: transparent;
    transform-origin: center center;
  }

  .tile-inner {
    position: absolute;
    inset: 0;
    will-change: transform, filter, opacity;
    transform: translateZ(-40px) scale(1.06);
    filter: blur(6px) saturate(1.05);
    opacity: 0;
  }

  .tile.revealed .tile-inner {
    transform: translateZ(0) scale(1);
    filter: blur(0px) saturate(1);
    opacity: 1;
  }

  /* subtle shadow/depth for tiles */
  .tile::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    pointer-events: none;
    opacity: 0.06;
  }

  /* hide if no image */
  .mosaic:empty { display: none; }
</style>

<div class="intro-wrap" role="dialog" aria-label="Intro" aria-hidden={src ? 'false' : 'true'}>
  <div class="mosaic" style="--cols: {tilesX}; --rows: {tilesY};">
    {#if src}
      {#each tiles as tile (tile.id)}
        <div
          class="tile {tile.revealed ? 'revealed' : ''}"
          style="width: calc(100% / {tilesX}); height: calc(100% / {tilesY});"
          aria-hidden="true"
        >
          <div
            class="tile-inner"
            style="transition: transform {duration}ms {easing} {tile.delay}ms, filter {duration}ms {easing} {tile.delay}ms, opacity {duration}ms {easing} {tile.delay}ms;"
          >
            <img
              src={src}
              alt=""
              draggable="false"
              style="position: absolute; width: calc({tilesX} * 100%); height: calc({tilesY} * 100%); left: calc(-{tile.c} * 100%); top: calc(-{tile.r} * 100%); object-fit: cover;"
            />
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
