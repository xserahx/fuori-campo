<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, volunteersNames, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';
  import { buildGalleryHref, buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';

  /* ── Extended volunteer type ─────────────────────────────────── */
  type Volunteer = GalleryImage & {
    city?:   string;
    region?: string;
    role?:   string;
    age?:    number;
  };

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

  /* ── Background scatter ──────────────────────────────────────── */
  const CANVAS_W = 1920;
  const CANVAS_H = 1200;
  const bgPhotos = imagesRaw as Volunteer[];

  /* ── Reactive state from URL ─────────────────────────────────── */
  const currentSlug = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  const isManualVolunteer = $derived(!volunteer);

  const volunteerTitle = $derived(
    volunteer?.name
      ?? (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug)?.name
      ?? volunteersNames.find((name, i) => slugify(name, i) === currentSlug)
      ?? 'Volunteer'
  );

  const volunteerRole = $derived((volunteer?.role ?? 'Event Services Volunteer').toUpperCase());

  const vIdx = $derived(volunteerList.findIndex(v => v.slug === currentSlug));

  /* ── Navigation ──────────────────────────────────────────────── */
  function goTo(offset: number) {
    const len    = volunteerList.length;
    const target = volunteerList[((vIdx + offset) % len + len) % len];
    if (target) {
      const search = buildGallerySearchParams(currentContext);
      goto(search ? `/volunteer/${target.slug}?${search}` : `/volunteer/${target.slug}`);
    }
  }

  function goBackToGallery() {
    goto(buildGalleryHref(currentContext));
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function locationLine(vol: Volunteer | null): string {
    if (!vol) return 'BORMIO - STELVIO SKI CENTER';
    const parts = [vol.city, vol.region].filter(Boolean);
    return parts.length ? parts.join(' - ').toUpperCase() : 'BORMIO - STELVIO SKI CENTER';
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
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
          width:{((img.width ?? 160) / CANVAS_W * 100).toFixed(2)}vw;
        "
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

    <!-- Bottom gradient + text caption -->
    <div class="photo-caption">
      <div class="caption-grad" aria-hidden="true"></div>
      <div class="caption-text">
        <p class="cap-location">{locationLine(volunteer)}</p>
        <p class="cap-role">{(volunteer?.role ?? 'Event Services Volunteer').toUpperCase()}</p>
        <p class="cap-name">{volunteer?.name?.toUpperCase() ?? 'ALESSANDRA SCALVINI'}</p>
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
    width: min(1091px, 63vw);
    aspect-ratio: 1091 / 581;
    overflow: hidden;
    box-shadow: 0 0 7px rgba(0, 0, 0, 0.25);
    background: #111;
    animation: frame-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
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
    bottom: 18px;
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
  /* Small laptop 1024–1300 px */
  @media (max-width: 1300px) {
    .photo-frame { width: min(900px, 80vw); top: 54vh; }
  }

  @media (max-width: 1100px) {
    .photo-frame { width: min(900px, 90vw); }
  }

  @media (max-width: 700px) {
    .photo-frame { width: 96vw; top: 52vh; }
    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }
  }
</style>
