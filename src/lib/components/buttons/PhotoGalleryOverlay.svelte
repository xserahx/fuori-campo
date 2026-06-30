<!-- Overlay galleria foto a schermo intero — si apre al click su
 VediTutteLeFoto.svelte nella pagina del singolo volontario.
 Sfondo sfocato/scurito (backdrop-filter), coverflow al centro,
 frecce prev/next, chiusura con X / Esc / click sullo sfondo. -->
<script lang="ts">
  let {
    photos,
    altBase = '',
    initialIndex = 0,
    onclose
  } = $props<{
    photos: string[];
    altBase?: string;
    initialIndex?: number;
    onclose: () => void;
  }>();

  const photoCount = $derived(photos.length);

  let activeIndex = $state(initialIndex);

  function stepPhoto(dir: number) {
    if (photoCount <= 1) return;
    activeIndex = (activeIndex + dir + photoCount) % photoCount;
  }

  /* Distanza circolare *con segno* dello slide i rispetto a quello attivo,
     così la foto precedente "avvolge" a sinistra e la successiva a destra. */
  function slideOffset(i: number): number {
    const n = photoCount;
    if (n <= 1) return 0;
    let d = (i - activeIndex) % n;
    if (d >  n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  /* ── Drag / swipe navigation ─────────────────────────────────── */
  let dragStartX = $state<number | null>(null);
  const DRAG_THRESHOLD = 50;

  function onDragStart(e: PointerEvent) {
    if (photoCount <= 1) return;
    dragStartX = e.clientX;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onDragEnd(e: PointerEvent) {
    if (dragStartX === null) return;
    const delta = e.clientX - dragStartX;
    dragStartX = null;
    if (Math.abs(delta) >= DRAG_THRESHOLD) stepPhoto(delta < 0 ? 1 : -1);
  }

  /* ── Keyboard navigation ──────────────────────────────────────── */
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowLeft') stepPhoto(-1);
    else if (e.key === 'ArrowRight') stepPhoto(1);
  }

  /* Chiude solo se si clicca proprio sullo sfondo, non sulla foto/frecce */
  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="gallery-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Galleria foto"
  onclick={onBackdropClick}
>
  <button class="gallery-close" type="button" aria-label="Chiudi galleria" onclick={onclose}>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M5 5L23 23M23 5L5 23" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  </button>

  {#if photoCount > 1}
    <button class="gallery-arrow gallery-arrow--prev" type="button" aria-label="Foto precedente" onclick={() => stepPhoto(-1)}>
      <svg width="14" height="28" viewBox="0 0 14 28" fill="none" aria-hidden="true">
        <path d="M11 2L3 14L11 26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  {/if}

  <div
    class="gallery-stage"
    class:gallery-stage--draggable={photoCount > 1}
    class:gallery-stage--dragging={dragStartX !== null}
    role="presentation"
    onpointerdown={onDragStart}
    onpointerup={onDragEnd}
    onpointercancel={onDragEnd}
  >
    {#each photos as photoUrl, i (photoUrl + i)}
      {@const off = slideOffset(i)}
      <div
        class="g-slide"
        class:g-slide--active={off === 0}
        class:g-slide--far={Math.abs(off) > 1}
        style="--off:{off}; z-index:{20 - Math.abs(off)};"
        aria-hidden={off !== 0}
      >
        <img class="g-slide-img" src={photoUrl} alt={off === 0 ? altBase : ''} draggable="false" />
      </div>
    {/each}
  </div>

  {#if photoCount > 1}
    <button class="gallery-arrow gallery-arrow--next" type="button" aria-label="Foto successiva" onclick={() => stepPhoto(1)}>
      <svg width="14" height="28" viewBox="0 0 14 28" fill="none" aria-hidden="true">
        <path d="M3 2L11 14L3 26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .gallery-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(14, 14, 14, 0.55);
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
    animation: gallery-fade-in 0.22s ease both;
  }
  @keyframes gallery-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .gallery-close {
    position: absolute;
    top: var(--spacing-6, 32px);
    right: var(--spacing-6, 32px);
    z-index: 30;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: var(--color-content-accent, #bdff5d);
    cursor: pointer;
    padding: 0;
    transition: opacity 0.18s ease, transform 0.18s ease;
  }
  .gallery-close:hover { opacity: 0.8; }
  .gallery-close:active { transform: scale(0.92); }

  .gallery-stage {
    position: relative;
    z-index: 5;
    width: 100%;
    height: min(76dvh, 800px);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gallery-stage--draggable { cursor: grab; }
  .gallery-stage--dragging  { cursor: grabbing; user-select: none; }

  .g-slide {
    position: absolute;
    left: 50%;
    top: 50%;
    transform:
      translate3d(-50%, -50%, 0)
      translate3d(calc(var(--off) * 56%), 0, 0)
      scale(0.74);
    filter: blur(7px) brightness(0.62);
    opacity: 0.5;
    transition:
      transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
      filter    0.55s ease,
      opacity   0.55s ease;
    will-change: transform, filter, opacity;
  }
  .g-slide--active {
    transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1);
    filter: blur(0px) brightness(1);
    opacity: 1;
  }
  .g-slide--far { opacity: 0 !important; pointer-events: none; transition: none !important; }

  .g-slide-img {
    display: block;
    max-height: min(76dvh, 800px);
    max-width: min(46vw, 640px);
    width: auto;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
    user-select: none;
    -webkit-user-drag: none;
  }

  .gallery-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 30;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: transparent;
    color: var(--color-content-body, #fafafa);
    cursor: pointer;
    padding: 0;
    transition:
      color 0.24s ease,
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gallery-arrow--prev { left:  var(--spacing-5, 24px); }
  .gallery-arrow--next { right: var(--spacing-5, 24px); }
  .gallery-arrow:hover  { color: var(--color-content-accent, #bdff5d); }
  .gallery-arrow:active { transform: translateY(-50%) scale(0.94); transition-duration: 80ms; }

  @media (min-width: 768px) {
    .gallery-arrow--prev { left:  var(--spacing-8, 48px); }
    .gallery-arrow--next { right: var(--spacing-8, 48px); }
  }
  @media (min-width: 1024px) {
    .gallery-arrow--prev { left:  var(--spacing-11, 72px); }
    .gallery-arrow--next { right: var(--spacing-11, 72px); }
  }

  @media (max-width: 700px) {
    .gallery-stage { height: 60dvh; }
    .g-slide-img { max-width: 82vw; max-height: 60dvh; }
    .g-slide:not(.g-slide--active) { opacity: 0 !important; }
    .gallery-arrow { width: 44px; height: 44px; }
    .gallery-close { top: var(--spacing-4, 16px); right: var(--spacing-4, 16px); }
  }

  @media (pointer: coarse) {
    .gallery-arrow {
      min-width:  max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
    .gallery-close {
      min-width:  max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .g-slide, .gallery-arrow, .gallery-close, .gallery-overlay { transition: none; animation: none; }
  }
</style>