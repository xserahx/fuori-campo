<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';

  /* ── Build ordered unique-volunteer list ─────────────────────── */
  type VolEntry = { slug: string; name: string; src: string };
  const volunteerList: VolEntry[] = [];
  {
    const seen = new Set<string>();
    for (let i = 0; i < imagesRaw.length; i++) {
      const img = imagesRaw[i];
      if (!img.name) continue;
      const s = slugify(img.name, i);
      if (!seen.has(s)) { seen.add(s); volunteerList.push({ slug: s, name: img.name, src: img.src }); }
    }
  }

  /* ── Background scatter: all images with valid positions ─────── */
  /* Figma design canvas is ~1920 × 1200 px */
  const CANVAS_W = 1920;
  const CANVAS_H = 1200;
  const bgPhotos = imagesRaw.filter(img => img.src);

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug = $derived(page.params.slug ?? '');

  const volunteer = $derived(
    imagesRaw.find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  const vIdx = $derived(
    volunteerList.findIndex(v => v.slug === currentSlug)
  );

  /* ── Local UI state ──────────────────────────────────────────── */
  let infoOpen   = $state(false);
  let openQ      = $state(-1);

  /* Reset panel when volunteer changes */
  $effect(() => {
    currentSlug;
    infoOpen = false;
    openQ    = -1;
  });

  /* ── Navigation ──────────────────────────────────────────────── */
  function goTo(offset: number) {
    const len    = volunteerList.length;
    const target = volunteerList[((vIdx + offset) % len + len) % len];
    if (target) goto(`/volunteer/${target.slug}`);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  const questionTitles = [
    'COME MI VEDEVANO GLI ALTRI.',
    'IL MIO MOMENTO PREFERITO.',
    'QUELLO CHE VORREI DIMENTICARE.',
    'COSA MI PORTO A CASA.',
    'COSA (NON) MI AVETE CHIESTO.',
    'LA MIA RISPOSTA ONESTA.',
  ];

  function locationLine(vol: typeof volunteer): string {
    if (!vol) return 'BORMIO - STELVIO SKI CENTER';
    const parts = [vol.city, vol.region].filter(Boolean);
    return parts.length ? parts.join(' - ').toUpperCase() : 'BORMIO - STELVIO SKI CENTER';
  }
</script>

<svelte:head>
  <title>{volunteer?.name ?? 'Volunteer'} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="lb">

  <!-- ── Blurred background scatter ─────────────────────────────── -->
  <div class="bg-scatter" aria-hidden="true">
    {#each bgPhotos as img}
      <img
        src={img.src}
        alt=""
        class="bg-photo"
        loading="lazy"
        draggable="false"
        style="
          left: {((img.left ?? 0) / CANVAS_W * 100).toFixed(2)}vw;
          top:  {((img.top  ?? 0) / CANVAS_H * 100).toFixed(2)}vh;
          width:{((img.width?? 160) / CANVAS_W * 100).toFixed(2)}vw;
        "
      />
    {/each}
  </div>

  <!-- Overlay 1 — desaturate + heavy blur -->
  <div class="bg-ov bg-ov-1" aria-hidden="true"></div>
  <!-- Overlay 2 — darken + medium blur -->
  <div class="bg-ov bg-ov-2" aria-hidden="true"></div>

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
  <div class="photo-frame">

    <!-- Main image -->
    {#if volunteer?.src}
      <img
        src={volunteer.src}
        alt={volunteer.name ?? 'Volunteer'}
        class="photo-img"
        draggable="false"
      />
    {:else}
      <div class="photo-placeholder"></div>
    {/if}

    <!-- Bottom gradient + text caption (overlays photo) -->
    <div class="photo-caption">
      <div class="caption-grad" aria-hidden="true"></div>
      <div class="caption-text">
        <p class="cap-location">{locationLine(volunteer)}</p>
        <p class="cap-role">{(volunteer?.role ?? 'Event Services Volunteer').toUpperCase()}</p>
        <p class="cap-name">{volunteer?.name?.toUpperCase() ?? 'ALESSANDRA SCALVINI'}</p>
      </div>
    </div>

    <!-- ⊕ expand button (bottom-right of photo) -->
    <button
      class="expand-btn"
      class:expand-btn--open={infoOpen}
      type="button"
      aria-label={infoOpen ? 'Chiudi info' : 'Apri info'}
      onclick={() => { infoOpen = !infoOpen; openQ = -1; }}
      aria-expanded={infoOpen}
    >
      <span aria-hidden="true">{infoOpen ? '×' : '+'}</span>
    </button>
  </div>

  <!-- ── Info drawer (slides up from below photo) ──────────────── -->
  <div class="info-drawer" class:info-drawer--open={infoOpen} aria-hidden={!infoOpen}>
    {#each questionTitles as q, i}
      <button
        class="q-row"
        class:q-row--open={openQ === i}
        type="button"
        tabindex={infoOpen ? 0 : -1}
        onclick={() => { openQ = openQ === i ? -1 : i; }}
        aria-expanded={openQ === i}
      >
        <span class="q-text">{q}</span>
        <span class="q-icon" aria-hidden="true">{openQ === i ? '−' : '+'}</span>
      </button>

      {#if openQ === i}
        <div class="q-answer" role="region" aria-live="polite">
          <p>{volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.'}</p>
        </div>
      {/if}
    {/each}
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
    height: 100vh;
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

  /* Overlay 1: full desaturation via mix-blend-mode + blur */
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

  /* Overlay 2: darken + softer blur */
  .bg-ov-2 {
    z-index: 2;
    background: rgba(26, 26, 26, 0.65);
    backdrop-filter: blur(5px);
  }

  /* ── Navigation arrows ──────────────────────────────────────────── */
  .arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    width: 59px;
    height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.2s ease;
  }

  .arrow:hover { opacity: 0.65; }

  .arrow--prev { left: 70px; }
  .arrow--next { right: 70px; }

  /* ── Main photo frame ───────────────────────────────────────────── */
  /*
   * Figma: 1091 × 581 px in a 1728-wide artboard.
   * We keep the aspect ratio and scale with the viewport.
   * Center: 50% left, ~56vh top (accounts for navbar offset).
   */
  .photo-frame {
    position: absolute;
    left: 50%;
    top: 56vh;
    transform: translate(-50%, -50%);
    z-index: 5;
    width: min(1091px, 63vw);
    aspect-ratio: 1091 / 581;
    overflow: hidden;
    box-shadow: 0 0 7px rgba(0, 0, 0, 0.25);
    background: #111;
  }

  .photo-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .photo-placeholder {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #111 0%, #1c1c1c 100%);
  }

  /* ── Caption area ────────────────────────────────────────────────── */
  /* Overlays the bottom of the photo frame */
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
    /* Matches Figma: h-143px from-#0e0e0e to transparent */
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
    font-family: var(--font-display, 'Forma DJR Display');
    font-size: clamp(9px, 0.64vw, 13px);   /* ~11px @ 1728px */
    font-weight: 500;
    line-height: 4.12;                      /* ~45px leading @ 11px */
    color: #fafafa;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .cap-role {
    margin: 0;
    font-family: var(--font-display, 'Forma DJR Display');
    font-size: clamp(16px, 1.53vw, 28px);  /* ~26px @ 1728px */
    font-weight: 500;
    line-height: 1.1;
    color: #fafafa;
  }

  .cap-name {
    margin: 0;
    font-family: var(--font-display, 'Forma DJR Display');
    font-size: clamp(24px, 2.55vw, 46px);  /* ~44px @ 1728px */
    font-weight: 800;
    line-height: 1.03;
    color: var(--color-content-accent, #bdff5d);
    text-transform: uppercase;
  }

  /* ── Expand (+) button ──────────────────────────────────────────── */
  /* Positioned at bottom-right corner of the photo, inside the caption */
  .expand-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 3;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: var(--color-content-accent, #bdff5d);
    font-size: 30px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
  }

  .expand-btn:hover { opacity: 0.75; }

  /* Rotate × into + when open */
  .expand-btn--open { transform: rotate(45deg); }

  /* ── Info drawer ─────────────────────────────────────────────────── */
  /*
   * Anchored to the bottom of the viewport, slides up via clip-path.
   * Width matches the photo frame; horizontally centred.
   */
  .info-drawer {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: min(1091px, 63vw);
    max-height: 44vh;
    overflow-y: auto;
    scrollbar-width: none;
    background: #0e0e0e;
    border-top: 1px solid rgba(250, 250, 250, 0.08);
    display: flex;
    flex-direction: column;
    /* Clip from the bottom → slides upward when revealed */
    clip-path: inset(0 0 100% 0);
    transition: clip-path 0.40s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .info-drawer::-webkit-scrollbar { display: none; }

  .info-drawer--open {
    clip-path: inset(0 0 0% 0);
  }

  /* ── Question rows ───────────────────────────────────────────────── */
  .q-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 26px;
    min-height: 56px;
    border: 0;
    border-bottom: 1px solid rgba(250, 250, 250, 0.1);
    background: transparent;
    color: #fafafa;
    font-family: var(--font-display, 'Forma DJR Display');
    font-size: clamp(14px, 1.2vw, 20px);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    cursor: pointer;
    text-align: left;
    flex-shrink: 0;
    transition: color 0.15s ease;
  }

  .q-row:hover,
  .q-row--open { color: var(--color-content-accent, #bdff5d); }

  .q-text { flex: 1; }

  .q-icon {
    color: var(--color-content-accent, #bdff5d);
    font-size: 20px;
    min-width: 22px;
    text-align: right;
  }

  .q-answer {
    padding: 14px 26px 18px;
    border-bottom: 1px solid rgba(250, 250, 250, 0.1);
    background: #111;
    flex-shrink: 0;
  }

  .q-answer p {
    margin: 0;
    font-size: clamp(14px, 1vw, 18px);
    font-weight: 400;
    line-height: 1.55;
    color: #fafafa;
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .arrow--prev { left: 16px; }
    .arrow--next { right: 16px; }

    .photo-frame {
      width: min(900px, 90vw);
    }
  }

  @media (max-width: 700px) {
    .photo-frame {
      width: 96vw;
      top: 52vh;
    }

    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }

    .arrow--prev { left: 8px; }
    .arrow--next { right: 8px; }
  }
</style>
