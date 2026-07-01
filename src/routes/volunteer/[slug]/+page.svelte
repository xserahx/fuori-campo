<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrl, fetchAllVolunteers, getCachedVolunteers, ruoloToTag, type VolunteerSummary } from '$lib/data/volunteers';
  import type { PageData } from './$types';
  import ScopriDiPiuButton from '$lib/components/buttons/ScopriDiPiuButton.svelte';
  import XButton from '$lib/components/buttons/XButton.svelte';
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';

  /* ── Blurred background photo field (the "cosmos" atmosphere) ─────
     Each neighbour photo is a soft, low-opacity tile scattered around
     the central frame. Tiles carry their own size / blur / opacity so
     the field reads with depth: larger + sharper + brighter nearer the
     frame ("near"), smaller + blurrier + fainter toward the corners
     ("far"). All values are inline so they win over the base .bg-photo. */
  /* ── Scattered collage layout ────────────────────────────────────
     One tile per cell of a 6×4 grid (a few cells left empty), each at a
     varied size, aspect and alignment so the field reads as an organic
     collage — like the gallery — with generous dark space between tiles.
     One-tile-per-cell + within-cell sizing guarantees NO overlap. */
  const BG_COLS = 6;
  const BG_ROWS = 4;
  const BG_SKIP = new Set(['4-1', '2-2', '5-3', '3-4']); // "col-row" empty cells
  // Deterministic pseudo-random so the scatter is stable (no reshuffle per frame).
  const rnd = (n: number) => {
    const x = Math.sin(n * 999.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const BG_TILES = (() => {
    const tiles: string[] = [];
    let k = 0;
    for (let r = 1; r <= BG_ROWS; r++) {
      for (let c = 1; c <= BG_COLS; c++) {
        if (BG_SKIP.has(`${c}-${r}`)) continue;
        const w    = 60 + Math.round(rnd(k * 1.3 + 1) * 36);                 // 60–96%
        const ar   = ['4 / 3', '3 / 2', '16 / 9', '1 / 1', '3 / 4'][Math.floor(rnd(k * 2.1 + 2) * 5)];
        const jx   = ['start', 'center', 'end'][Math.floor(rnd(k * 5.1 + 4) * 3)];
        const jy   = ['start', 'center', 'end'][Math.floor(rnd(k * 6.3 + 5) * 3)];
        const blur = 8 + Math.round(rnd(k * 3.7 + 3) * 8);                   // 8–16px
        const op   = (0.30 + rnd(k * 7.9 + 6) * 0.25).toFixed(2);           // .30–.55
        tiles.push(
          `grid-column:${c}; grid-row:${r}; width:${w}%; aspect-ratio:${ar};` +
          `justify-self:${jx}; align-self:${jy}; filter:blur(${blur}px) saturate(0.85); opacity:${op};`
        );
        k++;
      }
    }
    return tiles;
  })();

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

  const BG_COUNT = BG_TILES.length; // number of scatter cells (6×4 minus skipped)

  const bgPaths = $derived.by(() => {
    // Never show the current subject: exclude the displayed image and every
    // photo belonging to this volunteer.
    const excluded = new Set<string>();
    if (imgParam) excluded.add(imgParam);
    if (dbVol?.image_path) excluded.add(dbVol.image_path);
    for (const p of dbVol?.image_paths ?? []) excluded.add(p);

    const paths: string[] = [];
    const used = new Set<string>();
    const add = (p?: string | null) => {
      // Dedupe: a photo already used (or excluded) is never repeated.
      if (!p || excluded.has(p) || used.has(p)) return;
      used.add(p);
      paths.push(p);
    };

    // 1) Photos NEAR the selected one — the gallery passes the spatially
    //    closest volunteers, ordered by proximity, one photo each.
    for (const s of neighborSlugs) {
      if (paths.length >= BG_COUNT) break;
      if (s === currentSlug) continue;
      const vol = allVols.find(v => v.slug === s);
      if (vol?.ha_immagini) add(vol.image_paths?.[0] ?? vol.image_path);
    }

    // 2) Top up (direct/arrow nav, or few neighbours) with a seed-stable set
    //    of other volunteers — still deduped and never the current subject.
    if (paths.length < BG_COUNT) {
      const seed = currentSlug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const others = allVols.filter(v => v.slug !== currentSlug && v.ha_immagini);
      for (let i = 0; paths.length < BG_COUNT && i < others.length; i++) {
        const vol = others[(seed + i) % others.length];
        add(vol.image_paths?.[0] ?? vol.image_path);
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

  /* ── 3D card tilt — same feel as the gallery cards (GSAP, pointer-follow) ── */
  const TILT_MAX  = 12;
  const TILT_DEAD = 0.28;

  function onTiltMove(e: MouseEvent) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = e.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width  * 0.5)) / (rect.width  * 0.5);
    const ny = (e.clientY - (rect.top  + rect.height * 0.5)) / (rect.height * 0.5);
    const ax = Math.max(0, (Math.abs(nx) - TILT_DEAD) / (1 - TILT_DEAD));
    const ay = Math.max(0, (Math.abs(ny) - TILT_DEAD) / (1 - TILT_DEAD));
    const rotY =  Math.sign(nx) * ax * TILT_MAX;
    const rotX = -Math.sign(ny) * ay * TILT_MAX * 0.75;
    const sdx =  rotY * 2.0;
    const sdy = -rotX * 1.4 + 16;
    const sbl =  52 + (Math.abs(rotX) + Math.abs(rotY)) * 1.6;
    gsap.to(card, {
      rotateX: rotX, rotateY: rotY,
      z: 12,
      transformPerspective: 1100,
      transformOrigin: '50% 50%',
      boxShadow: `${sdx}px ${sdy}px ${sbl}px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`,
      duration: 0.25, ease: 'power2.out', overwrite: 'auto',
    });
  }

  function onTiltLeave(e: MouseEvent) {
    const card = e.currentTarget as HTMLElement;
    gsap.to(card, {
      rotateX: 0, rotateY: 0, z: 0,
      boxShadow: '0 18px 60px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
      duration: 0.6, ease: 'power3.out', overwrite: 'auto',
    });
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<main class="lb" id="main-content">

  <!-- ── Blurred background: photos near the selected one in the gallery ── -->
  <div class="bg-scatter" aria-hidden="true">
    {#each bgPaths.slice(0, BG_TILES.length) as path, i (path)}
      <img
        src={getImageUrl(path)}
        alt=""
        class="bg-photo"
        draggable="false"
        style={BG_TILES[i]}
      />
    {/each}
  </div>

  <!-- Depth vignette — darkens the edges into the cosmos, keeps the centre
       clear so the sharp frame reads as the focal point. -->
  <div class="bg-vignette" aria-hidden="true"></div>

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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="photo-frame photo-frame--{detectedRatio}"
    class:photo-frame--portrait={isPortrait}
    onmousemove={onTiltMove}
    onmouseleave={onTiltLeave}
  >

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

    <!-- Gallery "card" texture: fine grain + soft vignette (matches PhotosView) -->
    <div class="card-noise" aria-hidden="true"></div>
    <div class="card-vignette" aria-hidden="true"></div>

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
    /* ── COSMOS atmosphere ──────────────────────────────────────────
       A soft cool glow blooms behind the subject and falls off into a
       deep near-black at the edges — minimal, spacious, "deep space". */
    background:
      radial-gradient(120% 90% at 50% 34%, rgba(38, 44, 58, 0.55) 0%, rgba(20, 22, 28, 0.0) 52%),
      radial-gradient(140% 130% at 50% 50%, #101216 0%, #0a0a0c 62%, #070708 100%);
  }

  /* ── Background field ───────────────────────────────────────────
     A full 4×3 grid spanning the whole viewport. Each neighbour photo
     fills one cell, so the field covers the entire background (no empty
     space) with no overlaps and no repeats. A small gap gives a natural
     separation between tiles; the focal frame sits on top of the centre. */
  .bg-scatter {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(4, 1fr);
    /* Gutter + edge inset give the scatter its gallery-like dark spacing. */
    gap: 1.4vw;
    padding: 1.2vw;
  }

  .bg-photo {
    /* Per-tile width / aspect / alignment come inline (BG_TILES); the tile
       stays inside its own cell, so tiles never overlap. max-height caps any
       tall aspect so it can't bleed into the cell above/below. */
    height: auto;
    max-width: 100%;
    max-height: 100%;
    border-radius: 12px;
    object-fit: cover;
    /* Gently desaturated so the field reads as cool atmosphere, not a busy
       collage competing with the sharp subject. blur/opacity overridden inline. */
    opacity: 0.35;
    filter: blur(12px) saturate(0.85);
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* ── Depth vignette ─────────────────────────────────────────────
     One subtle layer (replaces the old double wash): darkens the edges
     so the scattered tiles melt into the cosmos, while leaving the
     centre clear for the focal frame. */
  .bg-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(115% 100% at 50% 50%, rgba(10, 10, 12, 0) 40%, rgba(9, 9, 11, 0.55) 74%, rgba(7, 7, 8, 0.82) 100%);
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
    /* ── Gallery "card" effect ── rounded corners, elevation shadow and a
       hairline border, mirroring .collage-item in PhotosView (scaled up for
       the larger focal frame). */
    border-radius: var(--radius-s, 4px);
    box-shadow:
      0 18px 60px rgba(0, 0, 0, 0.55),
      0 4px 20px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    /* `backwards` (not `both`): applies the `from` state before the entrance
       to avoid a flash, but does NOT forwards-fill — so after the animation
       the GSAP tilt is free to drive `transform` on hover. */
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

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

  /* ── Card texture overlays (match PhotosView .img-noise / .img-vignette) ──
     Sit above the image (z:1) but below the caption (z:2), so the caption
     text stays crisp. */
  .card-noise {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    opacity: 0.12;
  }

  .card-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.42) 100%);
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
