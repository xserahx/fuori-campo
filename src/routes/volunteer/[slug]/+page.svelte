<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/Navbar.svelte';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrl, fetchAllVolunteers, getCachedVolunteers, type VolunteerSummary } from '$lib/supabase';
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

  /* ── Background: this volunteer's own photos only ────────────── */
  const bgPaths = $derived(
    dbVol?.ha_immagini
      ? (dbVol.image_paths && dbVol.image_paths.length > 0
          ? dbVol.image_paths.slice(0, 8)
          : dbVol.image_path ? [dbVol.image_path] : [])
      : []
  );

  /* ── Navigation peers — from cache if available, otherwise lazy ─ */
  let allVols = $state<VolunteerSummary[]>(getCachedVolunteers());

  onMount(() => {
    fetchAllVolunteers().then(vols => { allVols = vols; });
  });

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug    = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  let imgError   = $state(false);
  let isPortrait = $state(false);
  $effect(() => { currentSlug; imgError = false; isPortrait = false; });

  function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    isPortrait = img.naturalHeight > img.naturalWidth;
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
    dbVol?.ha_immagini ? getImageUrl(dbVol.image_path) : null
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

<Navbar pinned />

<main class="lb">

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

  <!-- ── Close × button (top-right) ───────────────────────────────── -->
  <button class="close-x" type="button" aria-label="Chiudi" onclick={goBackToGallery}>×</button>

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
  <div class="photo-frame" class:photo-frame--portrait={isPortrait}>

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
    font-family: 'Forma DJR Display', sans-serif;
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

  /* ── Close × button ────────────────────────────────────────────── */
  .close-x {
    position: fixed;
    top: clamp(18px, 3.2vh, 48px);
    right: clamp(18px, 3.2vw, 56px);
    z-index: 25;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
    font-size: 36px;
    line-height: 1;
    color: var(--color-content-accent, #bdff5d);
    transition:
      opacity   0.24s ease,
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      filter    0.24s ease;
    will-change: transform;
  }

  .close-x:hover {
    transform: scale(1.18) rotate(5deg);
    filter: drop-shadow(0 0 10px rgba(189, 255, 93, 0.5));
  }

  .close-x:active {
    transform: scale(0.9);
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
    left: 4px;
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
    right: 4px;
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

  .photo-frame {
    position: absolute;
    left: 50%;
    top: 56vh;
    transform: translate(-50%, -50%);
    z-index: 5;
    width: min(1091px, 63vw);   /* landscape default */
    min-height: 180px;
    overflow: hidden;
    border: 2px solid #fafafa;
    background: #111;
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  /* Portrait: narrower frame — matches Figma 588px / 34vw × 784px tall */
  .photo-frame--portrait {
    width: min(588px, 34vw);
    max-height: min(784px, 84vh);
  }

  /* Portrait image: scale to fit within max-height without cropping */
  .photo-frame--portrait .photo-img {
    max-height: min(784px, 84vh);
    object-fit: contain;
  }

  .photo-img {
    width: 100%;
    height: auto;   /* natural proportions, never cropped */
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .photo-placeholder {
    width: 100%;
    aspect-ratio: 1091 / 581; /* keeps a reasonable frame when no image */
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
  }

  .caption-grad {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #0e0e0e 0%, transparent 100%);
  }

  .caption-text {
    position: relative;
    padding: 0 26px 18px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .cap-location {
    margin: 0;
    font-size: clamp(9px, 0.64vw, 13px);
    font-weight: 500;
    line-height: 4.12;
    color: #fafafa;
    white-space: nowrap;
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

  /* Portrait: button at top-right */
  .photo-frame--portrait .expand-btn {
    bottom: auto;
    top: 18px;
  }

  .expand-btn-label {
    font-family: 'Forma DJR Display', sans-serif;
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
    .photo-frame               { width: min(900px, 80vw); top: 54vh; }
    .photo-frame--portrait     { width: min(500px, 44vw); }
  }

  @media (max-width: 1100px) {
    .photo-frame               { width: min(900px, 90vw); }
    .photo-frame--portrait     { width: min(460px, 50vw); }
  }

  @media (max-width: 700px) {
    .photo-frame               { width: 96vw; top: 52vh; }
    .photo-frame--portrait     { width: min(360px, 82vw); }
    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }
  }
</style>
