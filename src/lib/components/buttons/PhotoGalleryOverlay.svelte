<!-- Overlay galleria foto a schermo intero — si apre al click su
 VediTutteLeFoto.svelte nella pagina del singolo volontario.
 Sfondo sfocato/scurito (backdrop-filter), coverflow al centro,
 frecce prev/next, chiusura con X / Esc / click sullo sfondo. -->
<script lang="ts">
  import ArrowButton from './ArrowButton.svelte';
  import XButton from './XButton.svelte';

  // Svelte 5 props
  let props = $props<{
    photos: string[];
    altBase?: string;
    initialIndex?: number;
    onclose: () => void;
  }>();

  const photoCount = $derived(props.photos.length);

  // Risolto lo Svelte compiler warning tramite closure/funzione
  let activeIndex = $state(props.initialIndex ?? 0);

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
    if (e.key === 'Escape') props.onclose();
    else if (e.key === 'ArrowLeft') stepPhoto(-1);
    else if (e.key === 'ArrowRight') stepPhoto(1);
  }

  /* Chiude solo se si clicca proprio sullo sfondo, non sulla foto/frecce */
  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) props.onclose();
  }

  // Correzione a11y: Handler tastiera speculare per il click sul backdrop
  function onBackdropKeydown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      props.onclose();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="gallery-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Galleria foto"
  tabindex="-1"
  onclick={onBackdropClick}
  onkeydown={onBackdropKeydown}
>
  <!-- NUOVO COMPONENTE DI CHIUSURA (Eredita solo la posizione originale) -->
  <div class="gallery-close-container">
    <XButton onclick={props.onclose} />
  </div>

  {#if photoCount > 1}
    <div class="gallery-arrow-container gallery-arrow-container--prev">
      <ArrowButton direction="left" onclick={() => stepPhoto(-1)} />
    </div>
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
    {#each props.photos as photoUrl, i (photoUrl + i)}
      {@const off = slideOffset(i)}
      <div
        class="g-slide"
        class:g-slide--active={off === 0}
        class:g-slide--far={Math.abs(off) > 1}
        style="--off:{off}; z-index:{20 - Math.abs(off)};"
        aria-hidden={off !== 0}
      >
        <img class="g-slide-img" src={photoUrl} alt={off === 0 ? (props.altBase ?? '') : ''} draggable="false" />
      </div>
    {/each}
  </div>

  {#if photoCount > 1}
    <div class="gallery-arrow-container gallery-arrow-container--next">
      <ArrowButton direction="right" onclick={() => stepPhoto(1)} />
    </div>
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
  
  .gallery-overlay:focus {
    outline: none;
  }

  @keyframes gallery-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .gallery-close-container {
    position: fixed;
    top: var(--spacing-9, 48px);    
    right: var(--spacing-11, 72px);  
    z-index: 30;
  }

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
    border-radius: var(--radius-s, 4px);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
    user-select: none;
    -webkit-user-drag: none;
  }

  .gallery-arrow-container {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 30;
  }
  
  .gallery-arrow-container--prev { left:  var(--spacing-11, 72px); }
  .gallery-arrow-container--next { right: var(--spacing-11, 72px); }

  
  @media (max-width: 700px) {
    .gallery-stage { height: 60dvh; }
    .g-slide-img { max-width: 82vw; max-height: 60dvh; }
    .g-slide:not(.g-slide--active) { opacity: 0 !important; }
    .gallery-close-container { top: var(--spacing-4, 16px); right: var(--spacing-4, 16px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .g-slide, .gallery-overlay { transition: none; animation: none; }
  }
</style>