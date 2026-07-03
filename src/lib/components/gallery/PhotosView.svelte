<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto, preloadData } from '$app/navigation';
  import gsap from 'gsap';
  import { tilt } from '$lib/actions/tilt';
  import { buildScatterLayoutCached, recordImageAspect, hasAllAspects, isLayoutBuilt, slugify, type GalleryImage } from '$lib/data/gallery';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { buildGalleryFromVolunteers, type VolunteerSummary } from '$lib/data/volunteers';
  import { rectOf, launchEntry } from '$lib/stores/photoFlight';

  let { activeFilters = [], dbVolunteers = [], zoom = 1 }: {
    activeFilters?: string[];
    dbVolunteers?: VolunteerSummary[];
    zoom?: number;
  } = $props();

  let collageRef: HTMLDivElement;
  let innerRef: HTMLDivElement;

  // ── Frame orientation ─────────────────────────────────────────────
  // The masonry reserves each tile at the photo's real orientation (snapped to
  // 16:9 / 4:3 / 3:4 / 9:16) — horizontal → landscape frame, vertical → portrait.
  // Orientation is only known once an image decodes. To enter the gallery ALREADY
  // in the correct layout (no placeholder → reflow "reload"), we build the masonry
  // exactly once — after every photo's orientation is known. Return visits read
  // the cache and are ready instantly; a first-ever visit measures every unique
  // photo up-front (in parallel, off-screen), which also warms the image cache so
  // they appear immediately. A timeout caps the wait so it can never hang.
  // Start ready if a layout was already built this session (i.e. we're re-mounting
  // after a toggle to the names view) — the switch back is then instant, no gate.
  let ready = $state(isLayoutBuilt());

  $effect(() => {
    if (ready) return;
    const imgs = rawImages;
    if (imgs.length === 0) return;
    if (hasAllAspects(imgs)) { ready = true; return; }   // cached → build now, no wait

    const uniq = new Map<string, string>();
    for (const im of imgs) uniq.set(im.path ?? im.src, im.src);

    let remaining = uniq.size;
    let done = false;
    const settle = () => { if (!done) { done = true; ready = true; } };
    const finish = () => { if (--remaining <= 0) settle(); };

    for (const [key, src] of uniq) {
      const probe = new Image();
      probe.decoding = 'async';
      probe.onload = () => {
        if (probe.naturalWidth) recordImageAspect(key, probe.naturalWidth / probe.naturalHeight);
        finish();
      };
      probe.onerror = finish;
      probe.src = src;
    }

    // Never block entry longer than this; any stragglers use a fallback box and
    // correct themselves (from cache) on the next visit.
    const cap = setTimeout(settle, 2500);
    return () => { done = true; clearTimeout(cap); };
  });

  // ── 3D card tilt — spring-driven (see $lib/actions/tilt, ReactBits feel).
  // A live, continuous box-shadow that eases with the same spring: it reads
  // as the CSS resting shadow at rest and deepens/leans as the card tilts.
  const tiltShadow = (rx: number, ry: number, h: number) => {
    const sdx = ry * 1.6;
    const sdy = -rx * 1.1 + 2 + 5 * h;
    const sbl = 16 + 12 * h + (Math.abs(rx) + Math.abs(ry)) * 0.9;
    const alpha = 0.5 + 0.35 * h;
    const rim = 0.03 + 0.03 * h;
    return `${sdx}px ${sdy}px ${sbl}px rgba(0,0,0,${alpha}), 0 0 0 1px rgba(255,255,255,${rim})`;
  };

  // Canvas layout width — scatter algorithm uses this as horizontal extent,
  // and it doubles as the horizontal tiling period. Kept wide so the tile
  // (and any repeated photo) only recurs after a long horizontal pan.
  const designWidth    = 9600;
  const initialContext = readGalleryContext(page.url.searchParams);

  // Fresh entry (no saved position in URL) → randomise spawn so every visit
  // starts somewhere different. Returns from volunteer pages preserve the URL
  // coords, so the user lands back exactly where they left.
  const hasSavedPosition = page.url.searchParams.has('photoX');

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

  // ── Zoom (magnification) ───────────────────────────────────────────
  // GSAP owns the live scale; `currentScale` eases toward `targetScale`
  // each frame (same loop as the pan), keeping pan + zoom on one transform.
  // `zoomWindow` mirrors the scale at ~10 Hz so the virtual-cull derived
  // recomputes without diffing on every frame.
  // Seed from the incoming zoom so the gallery opens at its medium overview
  // level immediately — no zoom-out animation on entry.
  let currentScale = untrack(() => zoom);
  let targetScale  = untrack(() => zoom);
  let zoomWindow   = $state(untrack(() => zoom));
  const SCALE_LERP = 0.14;
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sync the eased target with the prop; the rAF loop eases toward it
  // (reduced-motion snaps in one frame) and anchors the viewport centre.
  $effect(() => { targetScale = zoom; });

  // Momentum tuning — deliberately calm & floaty (not fast): a long, gentle
  // glide that eases to rest, à la the reference infinite-scroll feel.
  // FRICTION closer to 1 = longer, softer decay; a low LERP = the transform
  // trails the target smoothly (weighty, never snappy).
  const FRICTION    = 0.94;
  const LERP        = 0.055;
  // Wheel / trackpad → vertical navigation. Kept low so a scroll notch nudges
  // the gallery gently; the eased loop below smooths it into a glide.
  const WHEEL_SPEED = 0.75;
  // Off-screen buffer (screen px) rendered around the viewport on every side, so
  // tiles are already mounted — and their images already decoded (see the
  // up-front measure/preload) — before you scroll to them. Generous so photos
  // never pop in at the edge as you pan.
  const VIRT_MARGIN = 1600;

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

    // Ease the magnification toward the target and keep the viewport centre
    // fixed: when the scale changes by ratio r, the pan translate must scale
    // by r too, otherwise the content drifts off-centre while zooming.
    const prevScale = currentScale;
    currentScale += (targetScale - currentScale) * (prefersReduced ? 1 : SCALE_LERP);
    if (prevScale !== 0 && currentScale !== prevScale) {
      const r = currentScale / prevScale;
      currentX *= r; currentY *= r;
      targetX  *= r; targetY  *= r;
    }

    // NB: transformOrigin is set ONCE in onMount, never here. Passing it every
    // frame makes GSAP re-run its origin compensation, which fights the x/y we
    // write and makes the gallery tremble while scaling.
    if (innerRef) gsap.set(innerRef, {
      x: currentX, y: currentY,
      scale: currentScale,
      force3D: true,
    });

    const now = performance.now();
    if (now - lastWindowUpdate > 100) {
      windowX = currentX;
      windowY = currentY;
      zoomWindow = currentScale;
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
    // 1:1 drag tracking (content follows the cursor) with a gentle fling so a
    // release drifts a little and settles — never a fast throw.
    targetX += (e.clientX - lastX) * 1.0;
    targetY += (e.clientY - lastY) * 1.0;
    velX = ((e.clientX - lastX) / dt) * 5;
    velY = ((e.clientY - lastY) / dt) * 5;
    // No clamping — infinite scroll.
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = performance.now();
  }

  function pointerUp() { isDragging = false; }

  // Wheel / trackpad scrolls the gallery VERTICALLY; the ← / → arrow keys move
  // horizontally (drag still moves in every direction). Feeding the target lets
  // the eased loop glide the motion smoothly.
  function onWheel(e: WheelEvent) {
    if (isDragging) return;
    e.preventDefault();
    targetY -= e.deltaY * WHEEL_SPEED;
    velX = 0; velY = 0; // wheel drives the target directly — no leftover fling
  }

  // Keyboard: ← / → pan horizontally, ↑ / ↓ vertically. Auto-repeat while a key
  // is held feeds the eased loop for a continuous, smooth glide.
  const KEY_STEP = 220;
  function onKeyDown(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':  targetX += KEY_STEP; break;
      case 'ArrowRight': targetX -= KEY_STEP; break;
      case 'ArrowUp':    targetY += KEY_STEP; break;
      case 'ArrowDown':  targetY -= KEY_STEP; break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); velX = 0; velY = 0; }
  }

  function updateScale() { resizeCount++; }

  function openVolunteer(image: GalleryImage, tileEl: HTMLElement) {
    const slug = image.slug ?? slugify(image.name, 0);

    // Hand the clicked tile's on-screen rect + src to the shared-element
    // overlay (mounted in the root layout, so it survives this navigation)
    // before navigating — the zoom page reports its own frame rect once
    // mounted, and the overlay flies the clone between the two.
    launchEntry(image.src, rectOf(tileEl));

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
      if (neighborSlugs.length >= 20) break;
    }

    // Snapshot the on-screen neighbours as they sit RIGHT NOW, relative to the
    // clicked photo — the zoom page renders this fixed field as-is (no rescaling,
    // no animation), so it reads as a literal continuation of the gallery.
    // Coordinates are converted to on-screen px (× currentScale) up front, so
    // the zoom page can place them with a plain 1:1 offset.
    // (sessionStorage, not the URL, so it can hold the full field cheaply.)
    try {
      const ccx = image.left + image.width / 2;
      const ccy = image.top + image.height / 2;
      const field = visibleImages
        .filter((t) => t !== image)
        .map((t) => ({
          dx: ((t.left + t.width / 2) - ccx) * currentScale,
          dy: ((t.top + t.height / 2) - ccy) * currentScale,
          w: t.width * currentScale,
          h: t.height * currentScale,
          src: t.src,
        }))
        .sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))
        .slice(0, 48);
      sessionStorage.setItem('bgField', JSON.stringify({ cw: image.width * currentScale, tiles: field }));
    } catch { /* storage unavailable — zoom page falls back to its decorative field */ }

    const params = new URLSearchParams(buildGallerySearchParams({
      view: 'photos',
      filters: activeFilters,
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
  // Built once, only after orientations are known (`ready`), so the very first
  // render is already the correct layout — no placeholder pass, no reflow.
  const photoLayout      = $derived(
    ready ? buildScatterLayoutCached(rawImages, designWidth) : { images: [], canvasHeight: 1080 }
  );
  const positionedImages = $derived(photoLayout.images);
  const designHeight     = $derived(photoLayout.canvasHeight);

  // ── Infinite tiling virtual-DOM culling ───────────────────────────
  // Horizontal period: designWidth (3840). Vertical period: designHeight (naturalH).
  // These differ — using a single square period would misplace the canvas horizontally
  // when naturalH >> designWidth (e.g. 30 000 px with the full volunteer dataset).
  const visibleImages = $derived.by((): GalleryImage[] => {
    void windowX; void windowY; void zoomWindow; void resizeCount; void designHeight;
    if (typeof window === 'undefined') return positionedImages;

    const vw   = document.documentElement.clientWidth  || window.innerWidth;
    const vh   = document.documentElement.clientHeight || window.innerHeight;
    const M    = VIRT_MARGIN;
    const tileW = designWidth;   // horizontal repeat period
    const tileH = designHeight;  // vertical repeat period
    const s     = zoomWindow;    // live magnification — scales canvas px → screen px

    // Screen position of canvas local-x = 0 (top-left). With the centre
    // transform-origin, screen = ox + s · localX, so all extents below are
    // measured in scaled (screen) px.
    const ox = vw / 2 + windowX - s * tileW / 2;
    const oy = vh / 2 + windowY - s * tileH / 2;

    // Tile index ranges that may contribute visible images (with margin).
    const txMin = Math.floor((-M - ox) / (s * tileW));
    const txMax = Math.ceil((vw + M - ox) / (s * tileW));
    const tyMin = Math.floor((-M - oy) / (s * tileH));
    const tyMax = Math.ceil((vh + M - oy) / (s * tileH));

    const result: GalleryImage[] = [];
    for (let tx = txMin; tx <= txMax; tx++) {
      for (let ty = tyMin; ty <= tyMax; ty++) {
        const dx = tx * tileW;
        const dy = ty * tileH;
        for (const img of positionedImages) {
          const sx = ox + s * (img.left + dx);
          const sy = oy + s * (img.top  + dy);
          if (sx + img.width  * s > -M && sx < vw + M &&
              sy + img.height * s > -M && sy < vh + M) {
            result.push(dx === 0 && dy === 0 ? img : { ...img, left: img.left + dx, top: img.top + dy });
          }
        }
      }
    }
    return result;
  });

  onMount(() => {
    if (!hasSavedPosition) {
      // Spawn in the CENTER HALF of the tile (±25 % of width) so the user
      // always lands on dense middle columns.  The tile boundary sits at
      // ±designWidth/2 (≈ ±1920 px); staying within ±960 avoids the seam
      // where only edge columns from each tile repeat are visible, creating
      // a large empty strip in the middle of the viewport.
      const rx = Math.round((Math.random() - 0.5) * designWidth * 0.5);
      const ry = Math.round((Math.random() - 0.5) * 1000);
      currentX = rx; currentY = ry;
      targetX  = rx; targetY  = ry;
      windowX  = rx; windowY  = ry;
    }
    // Set the transform origin to the element centre ONCE here (it equals the
    // viewport centre at translate 0). The per-frame loop only updates x/y/scale,
    // so GSAP never re-compensates the origin → rock-steady zoom.
    if (innerRef) gsap.set(innerRef, {
      x: currentX, y: currentY,
      scale: currentScale,
      transformOrigin: '50% 50%',
      force3D: true,
    });
    animate();
    window.addEventListener('resize', updateScale);
    window.addEventListener('pointerup', pointerUp);
    collageRef?.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('pointerup', pointerUp);
      collageRef?.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
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
      {@const isUnmatched = activeFilters.length > 0 && !activeFilters.some((f) => img.tags?.includes(f))}
      <button
        class="collage-item"
        class:img-unmatched={isUnmatched}
        class:img-no-click={img.noClick}
        type="button"
        style="left:{img.left}px;top:{img.top}px;width:{img.width}px;height:{img.height}px;"
        onpointerdown={(e) => e.stopPropagation()}
        onpointerenter={() => { if (!img.noClick) hoverVolunteer(img); }}
        onclick={(e) => { if (!img.noClick) openVolunteer(img, e.currentTarget); }}
        use:tilt={{
          max: 14,
          tiltXFactor: 0.85,
          perspective: 720,
          scale: 1.05,
          lift: 10,
          shadow: tiltShadow,
          disabled: () => isDragging,
        }}
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
    border-radius: var(--radius-s, 4px);
    box-shadow: 0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
    /* box-shadow is animated by GSAP on hover; opacity handled here */
    transition: opacity 0.45s ease, filter 0.5s ease;
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
  /* Unselected photos get the zoom page's background treatment — a soft
     blur(12px) saturate(0.85) at low opacity — applied to the WHOLE tile so
     its rectangular edge/border feathers out too (not just the image), and the
     crisp elevation shadow is dropped. They recede into a dreamy field behind
     the sharp matches; eases in via .collage-item's filter transition. */
  .img-unmatched {
    opacity: 0.4;
    pointer-events: none;
    filter: blur(12px) saturate(0.85);
    box-shadow: none;
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
