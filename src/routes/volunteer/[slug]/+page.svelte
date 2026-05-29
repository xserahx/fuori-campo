<script lang="ts">
  import '../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';

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

  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  const vIdx = $derived(volunteerList.findIndex(v => v.slug === currentSlug));

  /* ── Navigation ──────────────────────────────────────────────── */
  function goTo(offset: number) {
    const len    = volunteerList.length;
    const target = volunteerList[((vIdx + offset) % len + len) % len];
    if (target) goto(`/volunteer/${target.slug}`);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function locationLine(vol: Volunteer | null): string {
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
    onclick={() => goto('/gallery')}
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

    <!-- + button → navigate to full profile page -->
    <button
      class="expand-btn"
      type="button"
      aria-label="Apri profilo completo"
      onclick={() => goto(`/volunteer/${currentSlug}/profile`)}
    >
      <span aria-hidden="true">+</span>
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

  /* ── Expand / profile button ────────────────────────────────────── */
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
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .expand-btn:hover {
    opacity: 0.75;
    transform: scale(1.18);
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  /* Small laptop 1024–1300 px */
  @media (max-width: 1300px) {
    .photo-frame { width: min(900px, 80vw); top: 54vh; }
    .arrow--prev { left: 32px; }
    .arrow--next { right: 32px; }
  }

  @media (max-width: 1100px) {
    .arrow--prev { left: 16px; }
    .arrow--next { right: 16px; }
    .photo-frame { width: min(900px, 90vw); }
  }

  @media (max-width: 700px) {
    .photo-frame { width: 96vw; top: 52vh; }
    .cap-location { font-size: 10px; }
    .cap-role     { font-size: 14px; }
    .cap-name     { font-size: 20px; }
    .arrow--prev  { left: 8px; }
    .arrow--next  { right: 8px; }
  }
</style>
