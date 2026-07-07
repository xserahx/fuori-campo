<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { beforeNavigate, replaceState } from '$app/navigation';
  import '../../lib/styles/tokens.css';
  import PhotosView from '$lib/components/gallery/PhotosView.svelte';
  import MobilePhotosView from '$lib/components/gallery/MobilePhotosView.svelte';
  import NamesView from '$lib/components/gallery/NamesView.svelte';
  import { readGalleryContext } from '$lib/data/gallery-context';
  import { fetchAllVolunteers, getCachedVolunteers, type VolunteerSummary } from '$lib/data/volunteers';
  import FiltraPerCategoriaFilter from '$lib/components/filters/FiltraPerCategoriaFilter.svelte';
  import ToggleFotoNomi from '$lib/components/buttons/ToggleFotoNomi.svelte';
  import IconButton from '$lib/components/buttons/IconButton.svelte';

  // Pre-carico dalla cache, così chi torna vede subito le foto (niente flash di caricamento).
  let dbVolunteers = $state<VolunteerSummary[]>(getCachedVolunteers());

  beforeNavigate(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  onMount(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // I dati in cache sono già completi: sostituisco solo se un riferimento cambia, così al rientro il layout non si
    // ricalcola né si rimescola.
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

  // Salvo la vista attiva nell'URL, così un reload riapre la stessa scheda
  // (NOMI resta su NOMI) invece di tornare alla vista foto di default.
  $effect(() => {
    const url = new URL(page.url);
    const current = url.searchParams.get('view') === 'names' ? 'names' : 'photos';
    if (current === activeToggle) return;
    if (activeToggle === 'names') url.searchParams.set('view', 'names');
    else url.searchParams.delete('view');
    replaceState(url, page.state);
  });

  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 600; };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  });

  // ── Zoom della galleria ───────────────────────────────────────────
  // MIN: circa 2× foto in più a schermo, comunque leggibili senza sforzo.
  // MAX: ingrandimento gradevole, prima che le immagini ottimizzate perdano nitidezza.
  const MIN_ZOOM     = 0.5;
  const MAX_ZOOM     = 1.8;
  const ZOOM_STEP    = 1.25;
  // Parte da una panoramica neutra e un po' arretrata, così si vedono più foto
  // insieme e all'arrivo la galleria non sembra mai già zoomata.
  const INITIAL_ZOOM = 0.72;
  let zoom = $state(INITIAL_ZOOM);

  const canZoomIn  = $derived(zoom < MAX_ZOOM - 0.001);
  const canZoomOut = $derived(zoom > MIN_ZOOM + 0.001);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const zoomIn  = () => { zoom = clampZoom(zoom * ZOOM_STEP); };
  const zoomOut = () => { zoom = clampZoom(zoom / ZOOM_STEP); };

  // Torno al livello panoramico ogni volta che il collage di foto non è la vista attiva.
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
    <IconButton variant="zoom-in"  ariaLabel="Aumenta zoom" onclick={zoomIn}  disabled={!canZoomIn} />
    <IconButton variant="zoom-out" ariaLabel="Riduci zoom"  onclick={zoomOut} disabled={!canZoomOut} />
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

  <!-- Sfumature ai bordi -->
  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

</main>

<style>
  /* ── Reset globali ─────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
  }

  :global(*) {
    font-family: var(--font-display);
    box-sizing: border-box;
  }

  /* ── Contenitore della pagina ───────────────────────────────────── */
  .gallery-page {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--gallery-background, #0e0e0e);
  }

  /* ── Grana stile pellicola ───────────────────────────────────────── */
  .bg-noise {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  /* ── Sfumature ai bordi ─────────────────────────────────────────── */
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

  /* ── Toggle FOTO / NOMI ─────────────────────────────────────────── */
  .toggle {
    position: fixed;

    left: var(--spacing-11, 72px);
    bottom: var(--unit-48, 48px);

    z-index: 999;
    pointer-events: auto;
  }

  /* ── Controlli zoom (desktop, solo vista foto) ──────────────────────
     Ancorati in alto a sinistra sotto il logo: il bordo sinistro si allinea
     al logo (padding orizzontale della navbar = --spacing-11) e in alto
     restano sotto la navbar.
     + sopra, − sotto; raggruppati per coerenza funzionale. */
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
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40vh;
    z-index: 5;
    pointer-events: none;

    /* 1. SFONDO: sfumatura morbida verso lo scuro */
    background: linear-gradient(
      to bottom,
      rgba(14, 14, 14, 1) 0%,
      rgba(14, 14, 14, 0.73) 20%,
      rgba(14, 14, 14, 0.45) 45%,
      rgba(14, 14, 14, 0.18) 70%,
      transparent 100%
    );

    /* 2. BACKDROP FILTER: disattivato — su mobile il blur con easing lineare impastava troppo */
    /* backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px); */

    /* 3. MASK IMAGE: dissolve la sfumatura in modo fotografico e impercettibile */
    mask-image: linear-gradient(
      to bottom,
      #000 0%,
      #000 15%,
      rgba(0, 0, 0, 0.75) 35%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0%,
      #000 15%,
      rgba(0, 0, 0, 0.75) 35%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%
    );
  }

  .edge-fade--bottom {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40vh;
    z-index: 5;
    pointer-events: none;

    /* 1. SFONDO: speculare, per il bordo inferiore */
    background: linear-gradient(
      to top,
      rgba(14, 14, 14, 1) 0%,
      rgba(14, 14, 14, 0.73) 20%,
      rgba(14, 14, 14, 0.45) 45%,
      rgba(14, 14, 14, 0.18) 70%,
      transparent 100%
    );

    /* 2. BACKDROP FILTER: disattivato (come sopra) */
    /* backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px); */

    /* 3. MASK IMAGE: speculare */
    mask-image: linear-gradient(
      to top,
      #000 0%,
      #000 15%,
      rgba(0, 0, 0, 0.75) 35%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to top,
      #000 0%,
      #000 15%,
      rgba(0, 0, 0, 0.75) 35%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%
    );
  }
    .edge-fade--left,
    .edge-fade--right { display: none; }
  }
</style>