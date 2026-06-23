<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto, preloadData } from '$app/navigation';
  import gsap from 'gsap';
  import { buildScatterLayoutCached, slugify, type GalleryImage } from '$lib/data/gallery';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { buildGalleryFromVolunteers, type VolunteerSummary } from '$lib/supabase';

  let { activeFilter = null, dbVolunteers = [] }: {
    activeFilter?: string | null;
    dbVolunteers?: VolunteerSummary[];
  } = $props();

  let collageRef: HTMLDivElement;
  let innerRef: HTMLDivElement;

  const designWidth = 3840;
  const initialContext = readGalleryContext(page.url.searchParams);

  // Plain vars — GSAP owns the transform; no Svelte re-renders at 60 fps.
  let currentX = initialContext.photoX;
  let currentY = initialContext.photoY;
  let targetX  = initialContext.photoX;
  let targetY  = initialContext.photoY;
  let velX = 0;
  let velY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let rafId: number;

  // Virtual window — updated at ~10 Hz so Svelte only re-diffs the visible list 10× per second.
  let windowX = $state(initialContext.photoX);
  let windowY = $state(initialContext.photoY);
  let lastWindowUpdate = 0;
  let resizeCount = $state(0);

  const FRICTION = 0.92;
  const LERP     = 0.1;
  const VIRT_MARGIN = 600;

  function animate() {
    if (!isDragging) {
      velX *= FRICTION;
      velY *= FRICTION;
      targetX += velX;
      targetY += velY;
      clampPosition();
    }

    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;

    if (innerRef) gsap.set(innerRef, { x: currentX, y: currentY, force3D: true });

    const now = performance.now();
    if (now - lastWindowUpdate > 100) {
      windowX = currentX;
      windowY = currentY;
      lastWindowUpdate = now;
    }

    rafId = requestAnimationFrame(animate);
  }

  function pointerDown(e: PointerEvent) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = performance.now();
    velX = 0; velY = 0;
    collageRef?.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dt = Math.max(performance.now() - lastTime, 1);
    targetX += (e.clientX - lastX) * 1.2;
    targetY += (e.clientY - lastY) * 1.2;
    velX = ((e.clientX - lastX) / dt) * 16;
    velY = ((e.clientY - lastY) / dt) * 16;
    clampPosition();
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = performance.now();
  }

  function pointerUp() { isDragging = false; }

  function updateScale() {
    resizeCount++;
  }

  function clampPosition() {
    const maxX = Math.max(0, designWidth / 2 - window.innerWidth / 2);
    const maxY = Math.max(0, designHeight / 2 - window.innerHeight / 2);
    targetX = Math.min(maxX, Math.max(-maxX, targetX));
    targetY = Math.min(maxY, Math.max(-maxY, targetY));
  }

  function openVolunteer(image: GalleryImage) {
    const slug = image.slug ?? slugify(image.name, 0);
    const search = buildGallerySearchParams({
      view: 'photos',
      filter: activeFilter,
      photoX: currentX,
      photoY: currentY,
    });
    goto(search ? `/volunteer/${slug}?${search}` : `/volunteer/${slug}`);
  }

  function hoverVolunteer(image: GalleryImage) {
    if (image.slug) preloadData(`/volunteer/${image.slug}`);
  }

  const rawImages = $derived(
    dbVolunteers.length > 0 ? buildGalleryFromVolunteers(dbVolunteers) : []
  );
  // buildScatterLayoutCached: ref-equal rawImages → returns same layout object, no recompute.
  const photoLayout     = $derived(buildScatterLayoutCached(rawImages, designWidth));
  const positionedImages = $derived(photoLayout.images);
  const designHeight    = $derived(photoLayout.canvasHeight);

  const visibleImages = $derived.by(() => {
    void windowX; void windowY; void resizeCount; void designHeight;
    if (typeof window === 'undefined') return positionedImages;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2 - designWidth / 2;
    const cy = vh / 2 - designHeight / 2;
    const minL = -cx - windowX - VIRT_MARGIN;
    const maxL = -cx - windowX + vw + VIRT_MARGIN;
    const minT = -cy - windowY - VIRT_MARGIN;
    const maxT = -cy - windowY + vh + VIRT_MARGIN;
    return positionedImages.filter(img =>
      img.left < maxL && img.left + img.width > minL &&
      img.top  < maxT && img.top  + img.height > minT
    );
  });

  onMount(() => {
    if (innerRef) gsap.set(innerRef, { x: currentX, y: currentY, force3D: true });
    animate();
    window.addEventListener('resize', updateScale);
    window.addEventListener('pointerup', pointerUp);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('pointerup', pointerUp);
      cancelAnimationFrame(rafId);
    };
  });
</script>

<svelte:window onpointermove={pointerMove} />

<div bind:this={collageRef} class="collage" role="region" aria-label="Image collage" onpointerdown={pointerDown}>
  <div
    bind:this={innerRef}
    class="collage-inner"
    style="width:{designWidth}px;height:{designHeight}px;left:calc(50vw - {designWidth/2}px);top:calc(50vh - {designHeight/2}px);transform:translate({initialContext.photoX}px,{initialContext.photoY}px);"
  >
    {#each visibleImages as img (`${Math.round(img.left)}|${Math.round(img.top)}`)}
      {@const isUnmatched = !!(activeFilter && !(img.tags?.includes(activeFilter)))}
      <button
        class="collage-item"
        class:img-unmatched={isUnmatched}
        type="button"
        style="left:{img.left}px;top:{img.top}px;width:{img.width}px;height:{img.height}px;"
        onpointerdown={(e) => e.stopPropagation()}
        onpointerenter={() => hoverVolunteer(img)}
        onclick={() => openVolunteer(img)}
      >
        <div class="img-bw-layer">
          <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--bw" draggable="false" />
        </div>
        <div class="img-color-layer">
          <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--color" draggable="false" />
        </div>
        <div class="img-noise"    aria-hidden="true"></div>
        <div class="img-vignette" aria-hidden="true"></div>
      </button>
    {/each}
  </div>
</div>

<style>
  .collage {
    position: absolute;
    inset: 0;
    z-index: var(--gallery-shell-z);
    cursor: grab;
    pointer-events: auto;
  }
  .collage:active { cursor: grabbing; }

  .collage-inner {
    position: absolute;
    will-change: transform;
  }

  /* ── Gallery item ─────────────────────────────────────────────── */
  .collage-item {
    position: absolute;
    overflow: hidden;
    border-radius: 5px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
    transition: box-shadow 0.4s ease, opacity 0.45s ease;
    cursor: pointer;
    pointer-events: auto;
    border: 0;
    padding: 0;
    background: transparent;
  }

  .collage-item:hover {
    z-index: 50;
    box-shadow: 0 8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07);
  }

  /* ── Image layers ─────────────────────────────────────────────── */
  .img-bw-layer,
  .img-color-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .img-bw-layer {
    z-index: 1;
    transition: opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  .img-color-layer {
    z-index: 2;
    transition: opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  /* object-fit: contain → full image always visible, never cropped */
  .collage-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    will-change: transform, filter;
    transform: scale(1.0);
    transition: transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.5s ease;
  }

  .collage-img--bw {
    filter: grayscale(100%) contrast(1.05) brightness(0.82);
  }

  .collage-item:hover .img-bw-layer { opacity: 0; }

  .collage-item:hover .collage-img { transform: scale(1.04); }

  /* Lime glow on hover */
  .img-color-layer::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 5px;
    box-shadow: inset 0 0 40px rgba(189,255,93,0.18), 0 0 28px rgba(189,255,93,0.12);
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 220ms ease;
    z-index: 6;
  }
  .collage-item:hover .img-color-layer::after { opacity: 1; }

  .collage-item:hover .img-color-layer .collage-img {
    filter: brightness(1.06) saturate(1.08) contrast(1.02);
  }

  /* ── Filter state ─────────────────────────────────────────────── */
  .img-unmatched {
    opacity: 0.45;
    pointer-events: none;
  }
  .img-unmatched .img-color-layer { opacity: 0; }
  .img-unmatched .collage-img--bw {
    filter: grayscale(100%) contrast(0.82) brightness(0.42);
  }

  /* ── Texture overlays ─────────────────────────────────────────── */
  .img-noise {
    position: absolute;
    inset: 0;
    z-index: 3;
    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    opacity: 0.12;
    pointer-events: none;
  }

  .img-vignette {
    position: absolute;
    inset: 0;
    z-index: 4;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .collage-item:hover .img-vignette { opacity: 1; }
</style>
