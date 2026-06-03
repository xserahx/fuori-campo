<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  let { src }: { src?: string } = $props();

  const dispatch = createEventDispatcher();

  // Virtual grid dimensions — cross tiles reference this for background-size / position
  const COLS = 5;
  const ROWS = 7;

  // Cross/plus pattern as [col, row] coordinates
  const CROSS: [number, number][] = [
                      [2, 0],
              [1, 1], [2, 1], [3, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
              [1, 5], [2, 5], [3, 5],
                      [2, 6],
  ];

  // Approximate visual center of the cross
  const CX = 2, CY = 3;

  type Tile = { c: number; r: number; id: string; delay: number; revealed: boolean };

  let tiles    = $state<Tile[]>([]);
  let revealed = $state(0);
  const timers: ReturnType<typeof setTimeout>[] = [];

  const percent = $derived(tiles.length ? Math.round((revealed / tiles.length) * 100) : 0);

  function buildAndReveal() {
    const built: Tile[] = CROSS.map(([c, r]) => {
      const dist  = Math.sqrt((c - CX) ** 2 + (r - CY) ** 2);
      const delay = Math.round(50 + dist * 140 + Math.random() * 210);
      return { c, r, id: `t${c}-${r}`, delay, revealed: false };
    });
    tiles = built;

    built.forEach((t) => {
      const id = setTimeout(() => {
        tiles = tiles.map(tt => tt.id === t.id ? { ...tt, revealed: true } : tt);
        revealed++;
        if (revealed === tiles.length) {
          timers.push(setTimeout(() => dispatch('complete'), 440));
        }
      }, t.delay);
      timers.push(id);
    });
  }

  onDestroy(() => timers.forEach(clearTimeout));

  onMount(() => {
    if (!src) return;
    const img = new Image();
    img.onload  = buildAndReveal;
    img.onerror = buildAndReveal;
    img.src = src;
  });
</script>

<div class="wrap" role="status" aria-label="Loading">
  {#if src && tiles.length}
    <div class="mosaic" style="--cols:{COLS};--rows:{ROWS};">
      {#each tiles as tile (tile.id)}
        <div
          class="tile"
          class:on={tile.revealed}
          style="--c:{tile.c};--r:{tile.r};--d:{tile.delay}ms;background-image:url('{src}');"
          aria-hidden="true"
        ></div>
      {/each}
    </div>
    <span class="pct" aria-live="polite">{percent}%</span>
  {/if}
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(18px, 2.8vh, 36px);
    background: #000;
  }

  .mosaic {
    position: relative;
    /* --t is the tile edge length, responsive */
    --t: clamp(54px, 9.2vw, 106px);
    width:  calc(var(--cols) * var(--t));
    height: calc(var(--rows) * var(--t));
  }

  .tile {
    position: absolute;
    width:  var(--t);
    height: var(--t);
    /* place tile at its grid coordinate */
    left: calc(var(--c) * var(--t));
    top:  calc(var(--r) * var(--t));
    /* background-image comes from inline style; size + position here */
    background-size:
      calc(var(--cols) * var(--t))
      calc(var(--rows) * var(--t));
    background-position:
      calc(-1 * var(--c) * var(--t))
      calc(-1 * var(--r) * var(--t));
    background-repeat: no-repeat;

    /* start hidden */
    opacity: 0;
    transform: scale(0.86);
    filter: grayscale(1) blur(7px);
    will-change: opacity, transform, filter;
    transition:
      opacity   680ms cubic-bezier(.18,.88,.2,1) var(--d),
      transform 680ms cubic-bezier(.18,.88,.2,1) var(--d),
      filter    680ms cubic-bezier(.18,.88,.2,1) var(--d);
  }

  .tile.on {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(1) blur(0px);
  }

  .pct {
    display: block;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(10px, 1vw, 13px);
    font-weight: 400;
    letter-spacing: 0.14em;
    color: rgba(250, 250, 250, 0.48);
  }
</style>
