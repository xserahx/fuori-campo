<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrl, fetchAllVolunteers, getCachedVolunteers, ruoloToTag, type VolunteerSummary } from '$lib/data/volunteers';
  import type { PageData } from './$types';
  import ScopriDiPiuButton from '$lib/components/buttons/ScopriDiPiuButton.svelte';
  import XButton from '$lib/components/buttons/XButton.svelte';
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';

  /* ── Fixed positions for the blurred background photos ──────────
     A spaced, non-overlapping perimeter layout: three down each side
     plus a top- and bottom-centre accent. Every tile is the same fixed
     box (width + aspect-ratio set in CSS), so the regions never touch.   */
  const BG_POS = [
    'left:2%;top:5%;',    'left:84%;top:3%;',
    'left:1%;top:40%;',   'left:85%;top:39%;',
    'left:3%;top:75%;',   'left:83%;top:73%;',
    'left:43%;top:2%;',   'left:44%;top:79%;',
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

  /* ── Navigation: same category as the current volunteer ─────────── */
  const peers = $derived.by(() => {
    const tag = ruoloToTag(dbVol?.ruolo_generale ?? null) ?? currentContext.filters[0] ?? null;
    if (tag) return allVols.filter(v => ruoloToTag(v.ruolo_generale) === tag && v.ha_immagini);
    return allVols.filter(v => v.ha_immagini);
  });

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

  <!-- ── Contenitore per la posizione del bottone di chiusura ── -->
  <div class="close-x-container">
    <XButton onclick={goBackToGallery} />
  </div>

  <!-- ── Navigation arrows ───────────────────────────────────────── -->
  <div class="arrow-container arrow-container--prev">
    <ArrowButton direction="left" onclick={() => goTo(-1)} />
  </div>

  <div class="arrow-container arrow-container--next">
    <ArrowButton direction="right" onclick={() => goTo(1)} />
  </div>

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
        <p class="cap-role">{volunteerRole}</p>
        <p class="cap-location">{resolvedVenue}</p>
        <p class="cap-name">{volunteerTitle.toUpperCase()}</p>
      </div>
    </div>

    <!-- "SCOPRI DI PIÙ" → navigate to full profile page -->
    <!-- Contenitore che eredita solo la posizione del vecchio bottone -->
    <div class="expand-btn-container">
      <ScopriDiPiuButton
        onclick={() => {
          const search = buildGallerySearchParams(currentContext);
          goto(search ? `/volunteer/${currentSlug}/profile?${search}` : `/volunteer/${currentSlug}/profile`);
        }}
      />
    </div>

  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  /* NB: no `overflow: hidden` here. SvelteKit never unloads a page's CSS
     after first visit, so a :global overflow lock would leak onto every
     later page (e.g. the profile page could no longer scroll). The fixed
     `.lb` shell below already covers the viewport, so the lightbox never
     scrolls without needing a body-level lock. */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: var(--font-display);
  }

  /* ── Lightbox shell ─────────────────────────────────────────────── */
  /* Fixed + inset:0 covers the whole viewport regardless of the body
     padding-top (navbar) or the global width-based zoom on <html>, and
     centres the frame on BOTH axes via flexbox — the same edge-to-edge
     approach the gallery uses. This is immune to the absolute-centering
     math drifting under zoom on smaller screens.                      */
  .lb {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
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
    /* Fixed, identical box for every tile → the spaced positions in BG_POS
       can never touch or overlap. */
    width: 14%;
    aspect-ratio: 4 / 3;
    height: auto;
    border-radius: 10px;
    object-fit: cover;
    /* Subtle: low opacity + a touch of blur so each photo reads as a soft,
       separated layer rather than a busy collage competing with the subject. */
    opacity: 0.28;
    filter: blur(1.5px);
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

 /* ── POSIZIONAMENTO BOTTONE DI CHIUSURA ── */
  .close-x-container {
    position: fixed;
    top: var(--spacing-9, 48px);    
    right: var(--spacing-11, 72px);  /* */
    z-index: 25;  
  }

  /* Gestione responsive per schermi piccoli */
  @media (max-width: 700px) {
    .close-x-container { 
      top: 24px; 
      right: 24px; 
    }
  }

  /* ── Navigation arrows ──────────────────────────────────────────── */
 /* ── POSIZIONAMENTO DELLE FRECCE LATERALI ── */
  .arrow-container {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;  /* Resta sopra il frame della foto */
  }

  .arrow-container--prev {
    left: var(--spacing-11, 72px); 
  }

  .arrow-container--next {
    right: var(--spacing-11, 72px); 
  }

  /* ── Main photo frame ───────────────────────────────────────────── */
  @keyframes frame-enter {
    from {
      opacity: 0;
      filter: blur(18px) saturate(0.4);
      transform: translateY(18px) scale(0.97);
    }
    to {
      opacity: 1;
      filter: blur(0px) saturate(1);
      transform: none;
    }
  }

  /* ── Base frame (positioning only, no size) ─────────────────────
     Centred by the flex parent (.lb) — no absolute/translate needed,
     which keeps it reliably centred on both axes at any zoom level.  */
  .photo-frame {
    position: relative;
    flex: 0 0 auto;
    z-index: 5;
    overflow: hidden;
    background: #111;
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;

    /* Vertical budget: how tall the frame may grow relative to the
       *dynamic* viewport height. dvh tracks mobile chrome show/hide,
       so the frame always fits without the page ever scrolling.    */
    --avail-h: 86dvh;

    /* Hard safety: never taller than the budget even if a width cap
       wins, so flexbox never has to clip it.                        */
    max-height: var(--avail-h);
  }

  /* ── Frame size per snapped ratio ───────────────────────────────
     The frame is sized by WIDTH so its aspect-ratio fixes the height.
     Width = min(Figma-max, vw-cap, height-cap), where the height-cap
     (--avail-h × ratio) guarantees the resulting HEIGHT never exceeds
     the vertical budget. The frame therefore always fits both axes
     and stays absolutely centred at every viewport size.          */
  .photo-frame--16-9 { width: min(1091px, 63vw, calc(var(--avail-h) * 16 / 9)); aspect-ratio: 16 / 9; }
  .photo-frame--4-3  { width: min(1091px, 63vw, calc(var(--avail-h) * 4  / 3)); aspect-ratio: 4  / 3; }
  .photo-frame--3-4  { width: min(588px,  34vw, calc(var(--avail-h) * 3  / 4)); aspect-ratio: 3  / 4; }
  .photo-frame--9-16 { width: min(588px,  34vw, calc(var(--avail-h) * 9  / 16)); aspect-ratio: 9 / 16; }

  /* Portrait button moves to top-right (avoids caption overlap) */
  .photo-frame--portrait .expand-btn-container { bottom: auto; top: 18px; }

  /* ── Image: cover fills the frame — no black bars ───────────── */
  .photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: var(--radius-s, 4px);
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
    padding-left: var(--spacing-4-2);
    padding-bottom: var(--spacing-4-2);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .cap-location {
    margin: 0 0 10px;
    font-size:      var(--ts-volunteer-location-size);
    font-weight:    var(--ts-volunteer-location-weight);
    line-height:    var(--ts-volunteer-location-line-height);
    letter-spacing: var(--ts-volunteer-location-letter-spacing);
    color: var(--color-content-body, #fafafa);
    /* allow long venue names to wrap instead of overflowing */
    max-width: 400px;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .cap-role {
    margin: 0;
    font-size: var(--ts-volunteer-role-size);
    font-weight: var(--ts-volunteer-role-weight);
    line-height: var(--ts-volunteer-role-line-height);
    color: var(--color-content-body, #fafafa);
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
  /* ── POSIZIONAMENTO DEL BOTTONE ── */
  .expand-btn-container {
    position: absolute;
    top: var(--spacing-4-2);   /* Mantiene la posizione esatta in basso a destra */
    right: var(--spacing-4-2);    /* */
    z-index: 3;     /* Resta sopra la didascalia[cite: 4] */
  }

  /* Se il frame è verticale (portrait), sposta il contenitore in alto a destra[cite: 4]
  .photo-frame--portrait .expand-btn-container { 
    bottom: auto; 
    top: 18px; 
  }  */

  /* ── Responsive ─────────────────────────────────────────────────────
     Only the per-breakpoint knobs change: the width cap (Figma-max),
     the viewport-width fraction (how much room to leave for the side
     blur + arrows), and the vertical budget --avail-h. The height-cap
     math itself lives once in the base rules above.                 */
  @media (max-width: 1300px) {
    .photo-frame--16-9  { width: min(900px, 80vw, calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 80vw, calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(500px, 44vw, calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(500px, 44vw, calc(var(--avail-h) * 9  / 16)); }
  }

  @media (max-width: 1100px) {
    .photo-frame--16-9  { width: min(900px, 90vw, calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(900px, 90vw, calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(460px, 50vw, calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(460px, 50vw, calc(var(--avail-h) * 9  / 16)); }
  }

  @media (max-width: 700px) {
    /* Phones: give the frame more height budget and nearly full width. */
    .photo-frame        { --avail-h: 80dvh; }
    .photo-frame--16-9  { width: min(96vw,  calc(var(--avail-h) * 16 / 9)); }
    .photo-frame--4-3   { width: min(96vw,  calc(var(--avail-h) * 4  / 3)); }
    .photo-frame--3-4   { width: min(88vw,  calc(var(--avail-h) * 3  / 4)); }
    .photo-frame--9-16  { width: min(88vw,  calc(var(--avail-h) * 9  / 16)); }
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
    .expand-btn-container::after {
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
    .expand-btn-container::after {
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
      transform: none;
    }
  }
</style>
