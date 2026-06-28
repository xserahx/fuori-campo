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

  // Pre-seed from cache so returning users see photos instantly (no loading flash).
  let dbVolunteers = $state<VolunteerSummary[]>(getCachedVolunteers());

  /* Clear overflow lock the instant navigation away starts, before any
     view-transition overlap window where the homepage could mount
     with overflow:hidden still in place from the gallery. */
  beforeNavigate(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  onMount(() => {
    /* Lock scroll on the root while the gallery is mounted.
       Done as inline styles (not CSS rules) so they are removed on unmount —
       SvelteKit never unloads a page's CSS after first visit, so a :global rule
       would keep overflow:hidden on every subsequent page. */
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    fetchAllVolunteers().then(vols => { dbVolunteers = vols; });

    /* Remove the gallery-entry marker after the bloom animation finishes (960ms + 80ms delay + margin). */
    const t = setTimeout(() => { delete document.documentElement.dataset.galleryEntry; }, 1200);
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  });

  const initialContext = readGalleryContext(page.url.searchParams);

  let activeToggle = $state<'photos' | 'names'>(initialContext.view);
  let activeFilter  = $state<string | null>(initialContext.filter);
  let isMobile = $state(false);

  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 600; };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  });

  const setToggle = (view: 'photos' | 'names') => { activeToggle = view; };
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<!--
  FiltraPerCategoriaFilter MUST be outside <main class="gallery-page">.
  gallery-page is position:fixed which creates its own stacking context —
  any z-index inside it is local to that context and can never exceed the
  navbar (z-index:40 in base.css, which is in the ROOT stacking context).
  Rendering the filter as a sibling of gallery-page puts it in the root
  context, where z-index:200 places it firmly above the navbar.
-->
<FiltraPerCategoriaFilter bind:activeFilter={activeFilter} />

<main class="gallery-page" id="main-content">
  <div class="bg-noise"></div>

  {#if activeToggle === 'photos'}
    {#if isMobile}
      <MobilePhotosView {activeFilter} {dbVolunteers} />
    {:else}
      <PhotosView {activeFilter} {dbVolunteers} />
    {/if}
  {:else}
    <NamesView {activeFilter} volunteers={dbVolunteers} />
  {/if}

  <!-- Edge fades -->
  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

  <!-- ── FOTO / NOMI toggle (bottom-left) ──────────────────────── -->
  <section class="toggle" aria-label="View toggle">
    <div class="toggle-track" class:toggle--names={activeToggle === 'names'}>
      <span class="toggle-selected" aria-hidden="true"></span>
      <button
        class="toggle-option toggle-option--photos"
        type="button"
        aria-pressed={activeToggle === 'photos'}
        onclick={() => setToggle('photos')}
      >
        <span class="toggle-label">FOTO</span>
      </button>
      <button
        class="toggle-option toggle-option--names"
        type="button"
        aria-pressed={activeToggle === 'names'}
        onclick={() => setToggle('names')}
      >
        <span class="toggle-label">NOMI</span>
      </button>
    </div>
  </section>

  <!-- Figma node 6197-16451: filter1_dd (two centred drop-shadows) + filter0_f (outer blur=4) -->
  <svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true">
    <defs>
      <filter id="figma-cat-hover" x="-20%" y="-50%" width="160%" height="200%" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="bg"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="alpha1"/>
        <feOffset in="alpha1" result="offset1"/>
        <feGaussianBlur in="offset1" stdDeviation="2" result="blurAlpha1"/>
        <feComposite in="blurAlpha1" in2="alpha1" operator="out" result="shadow1out"/>
        <feColorMatrix in="shadow1out" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" result="shadow1"/>
        <feBlend mode="normal" in="shadow1" in2="bg" result="shadow1Blend"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="alpha2"/>
        <feOffset in="alpha2" result="offset2"/>
        <feGaussianBlur in="offset2" stdDeviation="2" result="blurAlpha2"/>
        <feComposite in="blurAlpha2" in2="alpha2" operator="out" result="shadow2out"/>
        <feColorMatrix in="shadow2out" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" result="shadow2"/>
        <feBlend mode="normal" in="shadow2" in2="shadow1Blend" result="shadow2Blend"/>
        <feBlend mode="normal" in="SourceGraphic" in2="shadow2Blend" result="withShadows"/>
        <feGaussianBlur in="withShadows" stdDeviation="4"/>
      </filter>
    </defs>
  </svg>
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
  /* position:fixed + inset:0 covers the full viewport regardless of the
     body padding-top set by the navbar, giving true edge-to-edge coverage
     on every screen size. The navbar floats above via its own fixed layer. */
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
    /* GPU layer prevents 1-px rendering seams at non-integer zoom levels */
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
    left: clamp(var(--spacing-5, 24px), 4.5vw, var(--spacing-11, 72px));
    bottom: clamp(var(--spacing-5, 24px), 3.5vh, var(--unit-48, 48px));
    z-index: 100;
  }

  .toggle-track {
    position: relative;
    width: 190px;
    height: 45px;
    border-radius: var(--unit-999, 999px);
    background: var(--gallery-background, #0e0e0e);
  }

  /* Outlined sliding pill — 2px lime border, transparent fill (Figma: no glow) */
  .toggle-selected {
    position: absolute;
    top: 0;
    left: 0;
    width: 97px;
    height: 45px;
    border-radius: var(--unit-999, 999px);
    border: var(--stroke-1, 2px) solid var(--color-content-accent, #bdff5d);
    background: transparent;
    transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  /* Shift pill to right when NOMI is active: 190 - 97 = 93 */
  .toggle--names .toggle-selected {
    transform: translateX(93px);
  }

  .toggle-option {
    position: absolute;
    top: 0;
    width: 95px;
    height: 45px;
    border: 0;
    background: transparent;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
  }
  .toggle-option:active { transform: scale(0.96); transition-duration: 80ms; }

  .toggle-option--photos {
    left: 0;
    justify-content: flex-start;
    padding-left: var(--unit-20, 20px);
  }

  .toggle-option--names {
    right: 0;
    justify-content: flex-end;
    padding-right: var(--unit-20, 20px);
  }

  .toggle-label {
    font-family: var(--font-display);
    font-size: var(--unit-24, 24px);
    font-weight: 500;
    line-height: 26px;
    width: 57px;
    text-align: center;
    color: var(--color-content-body, #fafafa);
    transition: color 0.22s ease;
    pointer-events: none;
    user-select: none;
  }

  /* Hover: lime text + progressive blur (Figma blurType=PROGRESSIVE radius=4) */
  .toggle-option:hover .toggle-label {
    color: var(--color-content-accent, #bdff5d);
    filter: url(#figma-cat-hover);
  }

  /* ── Responsive tweaks ──────────────────────────────────────────── */
  @media (max-width: 900px) {
    .toggle { left: var(--spacing-5); bottom: 20px; }
  }

  /* ── Touch target compensation using --page-zoom ────────────────── */
  @media (pointer: coarse) {
    .toggle-track {
      min-height: max(45px, calc(44px / var(--page-zoom, 1)));
    }
    .toggle-option {
      min-height: max(45px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Very small viewports (phones in portrait) ───────────────────── */
  @media (max-width: 640px) {
    /* Toggle sits at bottom-left (Figma positions: left 24, bottom 36) */
    .toggle { left: var(--spacing-5); bottom: 36px; }

    /* Mobile toggle: 180×56px track, 98px pill (Figma Mobile variant) */
    .toggle-track {
      width: 180px;
      height: 56px;
    }
    .toggle-selected {
      width: 98px;
      height: 56px;
    }
    /* NOMI shift: 180 - 98 = 82px */
    .toggle--names .toggle-selected {
      transform: translateX(82px);
    }
    .toggle-option {
      width: 90px;
      height: 56px;
    }
    .toggle-option--photos { padding-left: 27px; }
    .toggle-option--names  { padding-right: 27px; }
    .toggle-label {
      font-size: 16px;
      font-weight: 700;
      line-height: normal;
      width: 43px;
    }

    /* ── Blur BG effect (Figma EFFECT/BLUR BG, 388px ≈ 44% of 874px frame) ── */
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
    /* Side fades not needed on mobile — photos are full width */
    .edge-fade--left,
    .edge-fade--right { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-selected {
      transition: none;
    }
  }
</style>
