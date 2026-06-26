<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto, preloadData } from '$app/navigation';
  import gsap from 'gsap';
  import { buildScatterLayoutCached, snapToStdFrame, slugify, type GalleryImage } from '$lib/data/gallery';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { buildGalleryFromVolunteers, type VolunteerSummary } from '$lib/data/volunteers';

  let { activeFilter = null, dbVolunteers = [] }: {
    activeFilter?: string | null;
    dbVolunteers?: VolunteerSummary[];
  } = $props();

  let collageRef: HTMLDivElement;
  let innerRef: HTMLDivElement;

  // Correction heights keyed by image src — stable across tile copies.
  // Only shrinks frames (never grows), fixing portrait images in landscape slots.
  let corrections = $state<Record<string, number>>({});

  function handleImageLoad(e: Event, img: GalleryImage) {
    const el = e.currentTarget as HTMLImageElement;
    if (!el.naturalWidth || !el.naturalHeight) return;
    const frameRatio = snapToStdFrame(el.naturalWidth / el.naturalHeight);
    const correctH   = img.width / frameRatio;
    if (correctH >= img.height - 0.5) return; // never grow
    corrections[img.src] = correctH;
  }

  // ── 3D card tilt (pure GSAP — zero Svelte re-renders at 60 fps) ───
  const TILT_MAX  = 14;
  const TILT_DEAD = 0.28;

  function onTiltMove(e: MouseEvent) {
    if (isDragging) return;
    const card = e.currentTarget as HTMLElement;
    const rect  = card.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width  * 0.5)) / (rect.width  * 0.5);
    const ny = (e.clientY - (rect.top  + rect.height * 0.5)) / (rect.height * 0.5);
    const ax = Math.max(0, (Math.abs(nx) - TILT_DEAD) / (1 - TILT_DEAD));
    const ay = Math.max(0, (Math.abs(ny) - TILT_DEAD) / (1 - TILT_DEAD));
    const rotY =  Math.sign(nx) * ax * TILT_MAX;
    const rotX = -Math.sign(ny) * ay * TILT_MAX * 0.75;
    const sdx =  rotY * 1.6;
    const sdy = -rotX * 1.1 + 7;
    const sbl =  28 + (Math.abs(rotX) + Math.abs(rotY)) * 0.9;
    gsap.to(card, {
      rotateX: rotX, rotateY: rotY,
      z: 10,
      transformPerspective: 720,
      transformOrigin: '50% 50%',
      boxShadow: `${sdx}px ${sdy}px ${sbl}px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)`,
      duration: 0.22, ease: 'power2.out', overwrite: 'auto',
    });
  }

  function onTiltLeave(e: MouseEvent) {
    const card = e.currentTarget as HTMLElement;
    gsap.to(card, {
      rotateX: 0, rotateY: 0, z: 0,
      boxShadow: '0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
      duration: 0.55, ease: 'power3.out', overwrite: 'auto',
    });
  }

  // Canvas layout width — scatter algorithm uses this as horizontal extent.
  const designWidth    = 3840;
  const initialContext = readGalleryContext(page.url.searchParams);

  // Plain vars — GSAP owns the transform; no Svelte reactivity at 60 fps.
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

  // windowX/Y: updated at ~10 Hz so Svelte only re-diffs the visible list 10× per second.
  let windowX = $state(initialContext.photoX);
  let windowY = $state(initialContext.photoY);
  let lastWindowUpdate = 0;
  let resizeCount = $state(0);

  const FRICTION    = 0.92;
  const LERP        = 0.1;
  const VIRT_MARGIN = 600; // px of off-screen buffer loaded ahead of viewport

  // ── Coordinate normalisation ───────────────────────────────────────
  // After the user pans many tile-widths away, snap raw coords back by
  // an integer number of tile periods. Visual position is identical
  // (tiles repeat), but floating-point precision is restored.
  function normalizeCoords() {
    // Horizontal period is always designWidth (3840).
    if (Math.abs(targetX) > designWidth * 6) {
      const snap = Math.round(targetX / designWidth) * designWidth;
      targetX -= snap; currentX -= snap;
    }
    // Vertical period equals the layout height.
    const th = designHeight;
    if (th > 0 && Math.abs(targetY) > th * 6) {
      const snap = Math.round(targetY / th) * th;
      targetY -= snap; currentY -= snap;
    }
  }

  function animate() {
    if (!isDragging) {
      velX *= FRICTION;
      velY *= FRICTION;
      targetX += velX;
      targetY += velY;
      // No clamping — gallery is infinite in all directions.
    }

    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;
    normalizeCoords();

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
    // No clamping — infinite scroll.
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = performance.now();
  }

  function pointerUp() { isDragging = false; }

  function updateScale() { resizeCount++; }

  function openVolunteer(image: GalleryImage) {
    const slug = image.slug ?? slugify(image.name, 0);

    // Unwrap tile offset to get base canvas coords for neighbour search.
    // H and V have separate periods (designWidth vs designHeight).
    const tw    = designWidth;
    const th    = designHeight;
    const baseL = ((image.left % tw) + tw) % tw;
    const baseT = ((image.top  % th) + th) % th;
    const cx = baseL + image.width  / 2;
    const cy = baseT + image.height / 2;

    const seen = new Set<string>([slug]);
    const neighborSlugs: string[] = [];
    const byDist = positionedImages
      .filter(img => img.slug && !img.noClick)
      .map(img => ({
        slug: img.slug!,
        d: Math.hypot((img.left + img.width / 2) - cx, (img.top + img.height / 2) - cy),
      }))
      .sort((a, b) => a.d - b.d);
    for (const { slug: s } of byDist) {
      if (seen.has(s)) continue;
      seen.add(s);
      neighborSlugs.push(s);
      if (neighborSlugs.length >= 8) break;
    }

    const params = new URLSearchParams(buildGallerySearchParams({
      view: 'photos',
      filter: activeFilter,
      photoX: currentX,
      photoY: currentY,
    }));
    if (image.path) params.set('img', image.path);
    if (neighborSlugs.length > 0) params.set('neighbors', neighborSlugs.join(','));
    goto(`/volunteer/${slug}?${params.toString()}`);
  }

  function hoverVolunteer(image: GalleryImage) {
    if (image.slug) preloadData(`/volunteer/${image.slug}`);
  }

  const rawImages = $derived(
    dbVolunteers.length > 0 ? buildGalleryFromVolunteers(dbVolunteers) : []
  );
  // buildScatterLayoutCached: ref-equal rawImages → same layout object, no recompute.
  const photoLayout      = $derived(buildScatterLayoutCached(rawImages, designWidth));
  const positionedImages = $derived(photoLayout.images);
  const designHeight     = $derived(photoLayout.canvasHeight);

  // ── Infinite tiling virtual-DOM culling ───────────────────────────
  // Horizontal period: designWidth (3840). Vertical period: designHeight (naturalH).
  // These differ — using a single square period would misplace the canvas horizontally
  // when naturalH >> designWidth (e.g. 30 000 px with the full volunteer dataset).
  const visibleImages = $derived.by((): GalleryImage[] => {
    void windowX; void windowY; void resizeCount; void designHeight;
    if (typeof window === 'undefined') return positionedImages;

    const vw   = document.documentElement.clientWidth  || window.innerWidth;
    const vh   = document.documentElement.clientHeight || window.innerHeight;
    const M    = VIRT_MARGIN;
    const tileW = designWidth;   // horizontal repeat period
    const tileH = designHeight;  // vertical repeat period

    // Screen position of the base tile's top-left corner.
    const ox = vw / 2 - tileW / 2 + windowX;
    const oy = vh / 2 - tileH / 2 + windowY;

    // Tile index ranges that may contribute visible images (with margin).
    const txMin = Math.floor((-M - ox) / tileW);
    const txMax = Math.ceil((vw + M - ox) / tileW);
    const tyMin = Math.floor((-M - oy) / tileH);
    const tyMax = Math.ceil((vh + M - oy) / tileH);

    const result: GalleryImage[] = [];
    for (let tx = txMin; tx <= txMax; tx++) {
      for (let ty = tyMin; ty <= tyMax; ty++) {
        const dx = tx * tileW;
        const dy = ty * tileH;
        for (const img of positionedImages) {
          const sx = ox + img.left + dx;
          const sy = oy + img.top  + dy;
          if (sx + img.width  > -M && sx < vw + M &&
              sy + img.height > -M && sy < vh + M) {
            result.push(dx === 0 && dy === 0 ? img : { ...img, left: img.left + dx, top: img.top + dy });
          }
        }
      }
    }
    return result;
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
      {@const h = corrections[img.src] ?? img.height}
      {@const isUnmatched = !!(activeFilter && !(img.tags?.includes(activeFilter)))}
      <button
        class="collage-item"
        class:img-unmatched={isUnmatched}
        class:img-no-click={img.noClick}
        type="button"
        style="left:{img.left}px;top:{img.top}px;width:{img.width}px;height:{h}px;"
        onpointerdown={(e) => e.stopPropagation()}
        onpointerenter={() => { if (!img.noClick) hoverVolunteer(img); }}
        onclick={() => { if (!img.noClick) openVolunteer(img); }}
        onmousemove={onTiltMove}
        onmouseleave={onTiltLeave}
      >
        <div class="img-bw-layer">
          <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--bw" draggable="false" onload={(e) => handleImageLoad(e, img)} />
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
    /* box-shadow is animated by GSAP on hover; opacity handled here */
    transition: opacity 0.45s ease;
    cursor: pointer;
    pointer-events: auto;
    border: 0;
    padding: 0;
    background: transparent;
    will-change: transform;
    transform-style: preserve-3d;
  }

  .collage-item:hover {
    z-index: 50;
    /* box-shadow intentionally omitted — GSAP drives it with tilt direction */
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

  /* object-fit: cover → no letterboxing; frame is corrected to natural ratio on load */
  .collage-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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


  .collage-item:hover .img-color-layer .collage-img {
    filter: brightness(1.06) saturate(1.08) contrast(1.02);
  }

  /* ── Non-clickable photos (no DB entry) ──────────────────────── */
  .img-no-click {
    cursor: default;
  }
  .img-no-click:hover .img-color-layer::after { opacity: 0; }
  .img-no-click:hover .collage-img { transform: scale(1); }

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
