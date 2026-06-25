<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrl, fetchAllVolunteers, getCachedVolunteers, type VolunteerSummary } from '$lib/data/volunteers';
  import type { PageData } from './$types';

  /* ── Fixed positions for the blurred background photos ──────── */
  const BG_POS = [
    'left:3%;top:5%;width:24%;',
    'right:2%;top:3%;width:20%;',
    'left:58%;top:35%;width:22%;',
    'left:2%;bottom:4%;width:28%;',
    'right:2%;bottom:6%;width:22%;',
    'left:30%;top:8%;width:18%;',
    'left:42%;bottom:10%;width:20%;',
    'left:18%;top:45%;width:16%;',
  ];

  /* ── Page data ────────────────────────────────────────────────── */
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Navigation peers — from cache if available, otherwise lazy ─ */
  let allVols = $state<VolunteerSummary[]>(getCachedVolunteers());

  onMount(() => {
    fetchAllVolunteers().then(vols => { allVols = vols; });
  });

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug    = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));
  const imgParam       = $derived(page.url.searchParams.get('img'));

  /* ── Background: spatially adjacent volunteers passed from the gallery ──
     When arriving from PhotosView the URL carries `neighbors=slug1,slug2,…`
     (the 8 gallery cards closest to the clicked photo). Arrow navigation
     strips the param so we fall back to a seed-stable selection instead.  */
  const neighborSlugs = $derived(
    (page.url.searchParams.get('neighbors') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
  );

  const bgPaths = $derived.by(() => {
    const paths: string[] = [];

    if (neighborSlugs.length > 0) {
      // Ordered by gallery proximity — use one photo per neighbour volunteer.
      for (const s of neighborSlugs) {
        if (paths.length >= 8) break;
        const vol = allVols.find(v => v.slug === s);
        if (!vol?.ha_immagini) continue;
        const p = vol.image_paths?.[0] ?? vol.image_path;
        if (p) paths.push(p);
      }
    } else {
      // Fallback (direct navigation / arrow nav): seed-stable selection from
      // other volunteers so the background is never the current subject.
      const seed = currentSlug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const others = allVols.filter(v => v.slug !== currentSlug && v.ha_immagini);
      for (let i = 0; paths.length < 8 && i < others.length; i++) {
        const vol = others[(seed + i) % others.length];
        const p = vol.image_paths?.[0] ?? vol.image_path;
        if (p) paths.push(p);
      }
    }

    return paths;
  });

  let imgError      = $state(false);
  let detectedRatio = $state<'16-9' | '4-3' | '3-4' | '9-16'>('16-9');
  const isPortrait  = $derived(detectedRatio === '3-4' || detectedRatio === '9-16');

  $effect(() => { currentSlug; imgParam; imgError = false; detectedRatio = '16-9'; });

  function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    const r = img.naturalWidth / img.naturalHeight;
    // Geometric midpoints between adjacent supported ratios
    if      (r < 0.649) detectedRatio = '9-16'; // < √(9/16 × 3/4)
    else if (r < 1.0)   detectedRatio = '3-4';  // < √(3/4 × 4/3) = 1
    else if (r < 1.540) detectedRatio = '4-3';  // < √(4/3 × 16/9)
    else                detectedRatio = '16-9';
  }

  /* ── Display values — DB is the single source of truth ──────── */
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : ''
  );

  const volunteerRole = $derived(
    dbVol ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? '').toUpperCase() : ''
  );

  const resolvedVenue = $derived(
    dbVol ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? '').toUpperCase() : ''
  );

  const resolvedSrc = $derived(
    dbVol?.ha_immagini
      ? getImageUrl(imgParam ?? dbVol.image_path)
      : null
  );

  /* ── Navigation: same role, volunteers with images ───────────── */
  const peers = $derived(
    dbVol?.ruolo_generale
      ? allVols.filter(v => v.ruolo_generale === dbVol!.ruolo_generale && v.ha_immagini)
      : allVols.filter(v => v.ha_immagini)
  );

  const vIdx = $derived(peers.findIndex(v => v.slug === currentSlug));

  function goTo(offset: number) {
    const len    = peers.length;
    if (len === 0) return;
    const target = peers[((vIdx + offset) % len + len) % len];
    if (target) {
      const search = buildGallerySearchParams(currentContext);
      goto(search ? `/volunteer/${target.slug}?${search}` : `/volunteer/${target.slug}`);
    }
  }

  function goBackToGallery() {
    goto(buildGalleryHref(currentContext));
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<main class="lb" id="main-content">

  <!-- ── Blurred background: only this volunteer's photos ──────── -->
  <div class="bg-scatter" aria-hidden="true">
    {#each bgPaths as path, i (path)}
      <img
        src={getImageUrl(path)}
        alt=""
        class="bg-photo"
        draggable="false"
        style={BG_POS[i]}
      />
    {/each}
  </div>

  <!-- Overlay 1 — desaturate + heavy blur -->
  <div class="bg-ov bg-ov-1" aria-hidden="true"></div>
  <!-- Overlay 2 — darken + medium blur -->
  <div class="bg-ov bg-ov-2" aria-hidden="true"></div>

  <!-- ── Click-background-to-close ────────────────────────────────── -->
  <!-- z:3 — above dark overlays, below photo frame (z:5) and arrows (z:20) -->
  <button
    class="close-bg"
    type="button"
    aria-label="Torna alla galleria"
    onclick={goBackToGallery}
  ></button>

  <!-- ── Close × button (top-right, per Figma) ───────────────────── -->
  <button class="close-x" type="button" aria-label="Chiudi" onclick={goBackToGallery}>
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M2 2L20 20M20 2L2 20" stroke="#BDFF5D" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

  <!-- ── Navigation arrows ───────────────────────────────────────── -->
  <button class="arrow arrow--prev" type="button" aria-label="Volunteer precedente" onclick={() => goTo(-1)}>
    <svg width="28" height="50" viewBox="0 0 28 50" fill="none" aria-hidden="true">
      <path d="M24 4L4 25L24 46" stroke="#BDFF5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <button class="arrow arrow--next" type="button" aria-label="Volunteer successivo" onclick={() => goTo(1)}>
    <svg width="28" height="50" viewBox="0 0 28 50" fill="none" aria-hidden="true">
      <path d="M4 4L24 25L4 46" stroke="#BDFF5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <!-- ── Photo frame + caption ────────────────────────────────────── -->
  <div class="photo-frame photo-frame--{detectedRatio}" class:photo-frame--portrait={isPortrait}>

    <!-- Main image -->
    {#if resolvedSrc && !imgError}
      <img
        src={resolvedSrc}
        alt={volunteerTitle}
        class="photo-img"
        draggable="false"
        onload={handleImageLoad}
        onerror={() => { imgError = true; }}
      />
    {:else}
      <div class="photo-placeholder"></div>
    {/if}

    <!-- Bottom gradient + text caption -->
    <div class="photo-caption">
      <div class="caption-grad" aria-hidden="true"></div>
      <div class="caption-text">
        <p class="cap-location">{resolvedVenue}</p>
        <p class="cap-role">{volunteerRole}</p>
        <p class="cap-name">{volunteerTitle.toUpperCase()}</p>
      </div>
    </div>

    <!-- "SCOPRI DI PIÙ" → navigate to full profile page -->
    <button
      class="expand-btn"
      type="button"
      aria-label="Apri profilo completo"
      onclick={() => {
        const search = buildGallerySearchParams(currentContext);
        goto(search ? `/volunteer/${currentSlug}/profile?${search}` : `/volunteer/${currentSlug}/profile`);
      }}
    >
      <span class="expand-btn-label">SCOPRI DI PIÙ</span>
    </button>
  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
    overflow: hidden;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: var(--font-display);
  }

  /* ── Lightbox shell ─────────────────────────────────────────────── */
  .lb {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: #0e0e0e;
  }

  /* ── Background scatter ─────────────────────────────────────────── */
  .bg-scatter {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .bg-photo {
    position: absolute;
    opacity: 0.5;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .bg-ov {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bg-ov-1 {
    z-index: 1;
    background: #0e0e0e;
    opacity: 0.5;
    mix-blend-mode: saturation;
    backdrop-filter: blur(11px);
  }

  .bg-ov-2 {
    z-index: 2;
    background: rgba(26, 26, 26, 0.65);
    backdrop-filter: blur(5px);
  }

  /* ── Close background ───────────────────────────────────────────── */
  /* Sits above overlays (z:2) but below photo frame (z:5) & arrows (z:20).
     Clicking any dark area outside the photo returns to the gallery.     */
  .close-bg {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
  }

  /* ── Close × button — Figma: left:1614px top:173px in 1728px canvas ── */
  .close-x {
    position: fixed;
    top: 61px;    /* 173px - 112px browser chrome */
    right: 82px;  /* 1728 - 1614 - 32 */
    z-index: 25;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition:
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      filter    0.24s ease;
    will-change: transform;
  }

  .close-x:hover {
    transform: scale(1.2) rotate(8deg);
    filter: drop-shadow(0 0 10px rgba(189, 255, 93, 0.5));
  }

  .close-x:active {
    transform: scale(0.88);
    transition-duration: 80ms;
  }

  /* ── Navigation arrows ──────────────────────────────────────────── */
  .arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    width: 48px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition:
      opacity   0.28s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.36s cubic-bezier(0.22, 1, 0.36, 1),
      filter    0.28s ease;
    will-change: transform;
  }

  .arrow--prev {
    left: 70px;
    transform: translateY(-50%) translateX(0);
  }
  .arrow--prev:hover {
    opacity: 1;
    transform: translateY(-50%) translateX(-6px);
    filter: drop-shadow(-4px 0 12px rgba(189, 255, 93, 0.28));
  }
  .arrow--prev:active {
    transform: translateY(-50%) translateX(-10px) scale(0.92);
    transition-duration: 80ms;
  }

  .arrow--next {
    right: 69px;
    transform: translateY(-50%) translateX(0);
  }
  .arrow--next:hover {
    opacity: 1;
    transform: translateY(-50%) translateX(6px);
    filter: drop-shadow(4px 0 12px rgba(189, 255, 93, 0.28));
  }
  .arrow--next:active {
    transform: translateY(-50%) translateX(10px) scale(0.92);
    transition-duration: 80ms;
  }

  /* ── Main photo frame ───────────────────────────────────────────── */
  @keyframes frame-enter {
    from {
      opacity: 0;
      filter: blur(18px) saturate(0.4);
      transform: translate(-50%, calc(-50% + 18px)) scale(0.97);
    }
    to {
      opacity: 1;
      filter: blur(0px) saturate(1);
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* ── Base frame (positioning only, no size) ────────────────────── */
  .photo-frame {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
    overflow: hidden;
    background: #111;
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* ── Frame size per snapped ratio ───────────────────────────────
     Width = min(Figma-max, vw-cap, height-cap derived from 80vh).
     This ensures the frame never exceeds 80 vh in height at any
     viewport size while keeping proportions exact.               */
  .photo-frame--16-9 { width: min(1091px, 63vw, calc(80vh * 16 / 9)); aspect-ratio: 16 / 9; }
  .photo-frame--4-3  { width: min(1091px, 63vw, calc(78vh * 4  / 3)); aspect-ratio: 4  / 3; }
  .photo-frame--3-4  { width: min(588px,  34vw, calc(80vh * 3  / 4)); aspect-ratio: 3  / 4; }
  .photo-frame--9-16 { width: min(588px,  34vw, calc(80vh * 9  / 16)); aspect-ratio: 9 / 16; }

  /* Portrait button moves to top-right (avoids caption overlap) */
  .photo-frame--portrait .expand-btn { bottom: auto; top: 18px; }

  /* ── Image: always contain, never crop or distort ───────────── */
  .photo-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .photo-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #111 0%, #1c1c1c 100%);
  }

  /* ── Caption ────────────────────────────────────────────────────── */
  .photo-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
    /* gradient fade zone — must extend well above the tallest text line */
    padding-top: 110px;
  }

  .caption-grad {
    position: absolute;
    inset: 0;
    /* opaque at bottom, fully transparent only at the very top of the padding zone */
    background: linear-gradient(to top, #0e0e0e 0%, rgba(14,14,14,0.9) 45%, transparent 100%);
  }

  .caption-text {
    position: relative;
    padding: 0 26px 18px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .cap-location {
    margin: 0 0 10px;
    font-size: clamp(9px, 0.64vw, 13px);
    font-weight: 500;
    line-height: 1.4;
    color: #fafafa;
    /* allow long venue names to wrap instead of overflowing */
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .cap-role {
    margin: 0;
    font-size: clamp(16px, 1.53vw, 28px);
    font-weight: 500;
    line-height: 1.1;
    color: #fafafa;
  }

  .cap-name {
    margin: 0;
    font-size: clamp(24px, 2.55vw, 46px);
    font-weight: 800;
    line-height: 1.03;
    color: var(--color-content-accent, #bdff5d);
    text-transform: uppercase;
  }

  /* ── "SCOPRI DI PIÙ" pill button ───────────────────────────────── */
  .expand-btn {
    position: absolute;
    bottom: 18px;   /* landscape: bottom-right */
    right: 18px;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
    border-radius: 999px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    background: #0e0e0e;
    cursor: pointer;
    overflow: hidden;
    transition:
      transform    0.36s cubic-bezier(0.22, 1, 0.36, 1),
      background   0.36s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow   0.36s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .expand-btn:hover {
    transform: scale(1.05);
    background: rgba(189, 255, 93, 0.08);
    box-shadow: 0 0 24px rgba(189, 255, 93, 0.25), inset 0 0 12px rgba(189, 255, 93, 0.06);
  }
  .expand-btn:active {
    transform: scale(0.97);
    transition-duration: 80ms;
  }

  .expand-btn-label {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    width: 141px;
    text-align: center;
    color: #fafafa;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    transition: filter 0.28s ease, color 0.28s ease;
  }

  /* Hover: text blooms with blur */
  .expand-btn:hover .expand-btn-label {
    filter: blur(4px);
    color: var(--color-content-accent, #bdff5d);
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1300px) {
    .photo-frame        { top: 50%; }
    .photo-frame--16-9  { width: min(900px, 80vw, calc(80vh * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 80vw, calc(78vh * 4  / 3)); }
    .photo-frame--3-4   { width: min(500px, 44vw, calc(80vh * 3  / 4)); }
    .photo-frame--9-16  { width: min(500px, 44vw, calc(80vh * 9  / 16)); }
  }

  @media (max-width: 1100px) {
    .photo-frame--16-9  { width: min(900px, 90vw, calc(80vh * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 90vw, calc(78vh * 4  / 3)); }
    .photo-frame--3-4   { width: min(460px, 50vw, calc(80vh * 3  / 4)); }
    .photo-frame--9-16  { width: min(460px, 50vw, calc(80vh * 9  / 16)); }
  }

  @media (max-width: 700px) {
    .photo-frame        { top: 50%; }
    .photo-frame--16-9  { width: min(96vw,  calc(80vh * 16 / 9)); }
    .photo-frame--4-3   { width: min(96vw,  calc(78vh * 4  / 3)); }
    .photo-frame--3-4   { width: min(82vw,  calc(80vh * 3  / 4)); }
    .photo-frame--9-16  { width: min(82vw,  calc(80vh * 9  / 16)); }
    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }
    /* Keep arrows in-viewport on small screens */
    .arrow--prev { left: 20px; }
    .arrow--next { right: 20px; }
    /* Close button safe area */
    .close-x { top: 24px; right: 24px; }
  }

  /* ── Touch target compensation ──────────────────────────────────── */
  /* Extend hit areas via pseudo-element without changing visual size. */
  @media (pointer: coarse) {
    .arrow {
      position: fixed; /* keep fixed for coarse-pointer layers */
    }
    .arrow::after,
    .close-x::after,
    .expand-btn::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width:  max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(80px, calc(44px / var(--page-zoom, 1)));
    }
    .close-x::after {
      min-width:  max(44px, calc(44px / var(--page-zoom, 1)));
      min-height: max(44px, calc(44px / var(--page-zoom, 1)));
    }
    .expand-btn::after {
      min-width:  100%;
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .photo-frame {
      animation: none;
      opacity: 1;
      filter: none;
      transform: translate(-50%, -50%) !important;
    }
  }
</style>
