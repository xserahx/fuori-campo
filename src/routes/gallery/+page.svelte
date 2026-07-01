<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import '../../lib/styles/tokens.css';
  import PhotosView from '$lib/components/gallery/PhotosView.svelte';
  import MobilePhotosView from '$lib/components/gallery/MobilePhotosView.svelte';
  import NamesView from '$lib/components/gallery/NamesView.svelte';
  import { readGalleryContext } from '$lib/data/gallery-context';
  import { fetchAllVolunteers, getCachedVolunteers, type VolunteerSummary } from '$lib/data/volunteers';
  import FiltraPerCategoriaFilter from '$lib/components/filters/FiltraPerCategoriaFilter.svelte';
  import ToggleFotoNomi from '$lib/components/buttons/ToggleFotoNomi.svelte';
  import ZoomInButton from '$lib/components/buttons/Zoom+Button.svelte';
  import ZoomOutButton from '$lib/components/buttons/Zoom-Button.svelte';

  // Pre-seed from cache so returning users see photos instantly (no loading flash).
  let dbVolunteers = $state<VolunteerSummary[]>(getCachedVolunteers());

  beforeNavigate(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  onMount(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Cached data is already the full bundled set; only swap if a different
    // reference comes back, so the layout never recomputes/reshuffles on entry.
    fetchAllVolunteers().then(vols => { if (vols !== dbVolunteers) dbVolunteers = vols; });

    const t = setTimeout(() => { delete document.documentElement.dataset.galleryEntry; }, 1200);
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  });

  const initialContext = readGalleryContext(page.url.searchParams);

  let activeToggle = $state<'photos' | 'names'>(initialContext.view);
  let activeFilters = $state<string[]>(initialContext.filters);
  let isMobile = $state(false);

  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 600; };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  });

  // ── Gallery zoom ──────────────────────────────────────────────────
  // MIN: ~2× more photos on screen, still comfortably readable.
  // MAX: pleasantly enlarged before the optimized images soften.
  const MIN_ZOOM     = 0.5;
  const MAX_ZOOM     = 1.8;
  const ZOOM_STEP    = 1.25;
  // Open in a neutral, slightly-out overview so several photos are visible at
  // once and the gallery never feels pre-zoomed-in on arrival.
  const INITIAL_ZOOM = 0.72;
  let zoom = $state(INITIAL_ZOOM);

  const canZoomIn  = $derived(zoom < MAX_ZOOM - 0.001);
  const canZoomOut = $derived(zoom > MIN_ZOOM + 0.001);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const zoomIn  = () => { zoom = clampZoom(zoom * ZOOM_STEP); };
  const zoomOut = () => { zoom = clampZoom(zoom / ZOOM_STEP); };

  // Reset to the overview level whenever the photo collage isn't the active view.
  $effect(() => { if (activeToggle !== 'photos') zoom = INITIAL_ZOOM; });

</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<FiltraPerCategoriaFilter bind:activeFilters={activeFilters} />

<section class="toggle" aria-label="Controlli galleria">
  <ToggleFotoNomi bind:view={activeToggle} />
</section>

{#if activeToggle === 'photos' && !isMobile}
  <section class="zoom" aria-label="Zoom galleria">
    <ZoomInButton  ariaLabel="Aumenta zoom" onclick={zoomIn}  disabled={!canZoomIn} />
    <ZoomOutButton ariaLabel="Riduci zoom"  onclick={zoomOut} disabled={!canZoomOut} />
  </section>
{/if}

<main class="gallery-page" id="main-content">
  <div class="bg-noise"></div>

  {#if activeToggle === 'photos'}
    {#if isMobile}
      <MobilePhotosView {activeFilters} {dbVolunteers} />
    {:else}
      <PhotosView {activeFilters} {dbVolunteers} {zoom} />
    {/if}
  {:else}
    <NamesView {activeFilters} volunteers={dbVolunteers} />
  {/if}

  <!-- Edge fades -->
  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

</main>

<style>
  /* ── Global resets ─────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
  }

  :global(*) {
    font-family: var(--font-display);
    box-sizing: border-box;
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .gallery-page {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--gallery-background, #0e0e0e);
  }

  /* ── Film-grain noise ───────────────────────────────────────────── */
  .bg-noise {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  /* ── Edge fades ─────────────────────────────────────────────────── */
  .edge-fade {
    position: fixed;
    pointer-events: none;
    z-index: 10;
    transform: translateZ(0);
  }

  .edge-fade--top {
    top: 0; left: 0; right: 0;
    height: 276px;
    background: linear-gradient(to bottom, var(--gallery-background, #0e0e0e), transparent);
  }

  .edge-fade--bottom {
    bottom: 0; left: 0; right: 0;
    height: 227px;
    background: linear-gradient(to top, var(--gallery-background, #0e0e0e), rgba(26, 26, 26, 0));
  }

  .edge-fade--left {
    left: 0; top: 0; bottom: 0;
    width: var(--gallery-edge-width, 80px);
    background: linear-gradient(to right, var(--gallery-background, #0e0e0e), transparent);
  }

  .edge-fade--right {
    right: 0; top: 0; bottom: 0;
    width: var(--gallery-edge-width, 80px);
    background: linear-gradient(to left, var(--gallery-background, #0e0e0e), transparent);
  }

  /* ── FOTO / NOMI toggle ─────────────────────────────────────────── */
  .toggle {
    position: fixed;

    left: var(--spacing-11, 72px);
    bottom: var(--unit-48, 48px);

    z-index: 999;
    pointer-events: auto;
  }

  /* ── Zoom controls (desktop, photos view only) ──────────────────────
     Anchored top-left under the logo: left edge aligns with the logo
     (navbar inline padding = --spacing-11), top clears the navbar.
     + on top, − below; grouped for functional coherence. */
  .zoom {
    position: fixed;
    align-items: center;
    left: var(--spacing-11, 72px);
    bottom: 132px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3, 12px);

    z-index: 999;
    pointer-events: auto;
  }

  @media (max-width: 599px) {
    .toggle { 
      left: var(--spacing-5, 24px); 
      bottom: var(--spacing-6-2, 36px); 
    }

    .edge-fade--top {
      height: 44vh;
      background: linear-gradient(to bottom, rgba(14, 14, 14, 0.85) 0%, transparent 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      mask-image: linear-gradient(to bottom, black 25%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 25%, transparent 100%);
    }
    .edge-fade--bottom {
      height: 44vh;
      background: linear-gradient(to top, rgba(14, 14, 14, 0.85) 0%, transparent 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      mask-image: linear-gradient(to top, black 25%, transparent 100%);
      -webkit-mask-image: linear-gradient(to top, black 25%, transparent 100%);
    }
    .edge-fade--left,
    .edge-fade--right { display: none; }
  }
</style>