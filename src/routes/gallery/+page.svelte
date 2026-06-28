<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { fade }   from 'svelte/transition';
  import { beforeNavigate } from '$app/navigation';
  import { cubicOut, cubicIn } from 'svelte/easing';
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
  let filterPanelOpen = $state(false);
  let isMobile = $state(false);

  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 600; };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  });

  const filters = [
    { id: 'organizzativa', label: 'Area organizzativa\ne servizi generali' },
    { id: 'cerimonie',     label: 'Cerimonie\ne revenue'                   },
    { id: 'gestione',      label: 'Gestione Operativa\ne Fan Experience'   },
    { id: 'logistica',     label: 'Logistica\ne territorio'                },
    { id: 'relazioni',     label: 'Relazioni\ne comunicazione'             },
    { id: 'sport',         label: 'Sport\ne discipline'                    },
  ];

  const setToggle = (view: 'photos' | 'names') => { activeToggle = view; };

  const selectFilter = (id: string) => {
    activeFilter    = activeFilter === id ? null : id;
    filterPanelOpen = false;
  };

  function slideBlur(node: Element, { duration = 360, x = 40 }: { duration?: number; x?: number } = {}) {
    return {
      duration,
      css: (t: number) => {
        const eased = cubicOut(t);
        return `
          opacity: ${eased};
          transform: translateX(${(1 - eased) * x}px);
          filter: blur(${(1 - eased) * 8}px);
        `;
      }
    };
  }

  function slideBlurOut(node: Element, { duration = 220, x = 24 }: { duration?: number; x?: number } = {}) {
    return {
      duration,
      css: (t: number) => {
        const eased = cubicIn(t);
        return `
          opacity: ${1 - eased};
          transform: translateX(${eased * x}px);
          filter: blur(${eased * 6}px);
        `;
      }
    };
  }
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<main class="gallery-page" id="main-content">
 <FiltraPerCategoriaFilter />
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

  <!-- ── FILTRA PER CATEGORIA — text button (desktop) ─────────────── -->
  <button
    class="filter-btn"
    class:filter-btn--active={activeFilter !== null}
    class:filter-btn--open={filterPanelOpen}
    type="button"
    onclick={() => { filterPanelOpen = !filterPanelOpen; }}
    aria-label="Filtra per categoria"
  >
    <span class="filter-btn-label">FILTRA PER CATEGORIA</span>
  </button>

  <!-- ── Filter icon — 48×48 circle (mobile only, Figma Filtro-categorie) ── -->
  <button
    class="filter-icon-btn"
    class:filter-icon-btn--active={activeFilter !== null || filterPanelOpen}
    type="button"
    aria-label="Filtra per categoria"
    onclick={() => { filterPanelOpen = !filterPanelOpen; }}
  >
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden="true">
      <path d="M1 2h16M1 8h16M1 14h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="6" cy="2" r="2" fill="var(--filter-icon-bg,#0e0e0e)" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="12" cy="8" r="2" fill="var(--filter-icon-bg,#0e0e0e)" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="6" cy="14" r="2" fill="var(--filter-icon-bg,#0e0e0e)" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  </button>

  <!-- ── Category overlay (right gradient panel) ───────────────── -->
  {#if filterPanelOpen}
    <div
      class="cat-overlay safe-area"
      role="presentation"
      in:slideBlur={{ duration: 380, x: 48 }}
      out:slideBlurOut={{ duration: 200, x: 28 }}
      onclick={() => { filterPanelOpen = false; }}
    >
      <div class="cat-items">
        {#each filters as filter}
          <button
            class="cat-item"
            class:cat-item--active={activeFilter === filter.id}
            type="button"
            onclick={(e) => { e.stopPropagation(); selectFilter(filter.id); }}
          >
            {filter.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

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

  /* ── FILTRA PER CATEGORIA button ───────────────────────────────── */
  .filter-btn {
    position: fixed;
    right: clamp(var(--spacing-5, 24px), 4.5vw, var(--spacing-11, 72px));
    bottom: clamp(var(--spacing-5, 24px), 3.5vh, var(--unit-48, 48px));
    z-index: 100;
    width: 275px;
    padding: var(--unit-12, 12px) var(--unit-20, 20px);
    border-radius: var(--unit-999, 999px);
    border: var(--stroke-1, 2px) solid var(--color-content-accent, #bdff5d);
    background: var(--gallery-background, #0e0e0e);
    cursor: pointer;
    transition:
      background   0.32s cubic-bezier(0.22, 1, 0.36, 1),
      transform    0.32s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow   0.32s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }
  .filter-btn:hover {
    transform: scale(1.025);
    box-shadow: 0 0 22px rgba(189, 255, 93, 0.2);
  }
  .filter-btn:active { transform: scale(0.97); transition-duration: 80ms; }

  /* Same position in both views. The alphabet sidebar reserves vertical
     clearance above the button (--_reserve), so no horizontal shift is
     needed in names view — keeping the button consistent between FOTO/NOMI. */

  .filter-btn-label {
    display: block;
    font-family: var(--font-display);
    font-size: var(--unit-24, 24px);
    font-weight: 500;
    line-height: 26px;
    text-align: center;
    white-space: nowrap;
    color: var(--color-content-body, #fafafa);
    transition: color 0.28s ease, filter 0.28s ease;
  }

  /* Hover (default, no active filter): text turns lime with bloom blur */
  .filter-btn:not(.filter-btn--active):hover .filter-btn-label {
    color: var(--color-content-accent, #bdff5d);
    filter: blur(4px);
  }

  /* Active state (a filter is selected): lime fill, dark text */
  .filter-btn--active {
    background: var(--color-content-accent, #bdff5d);
    box-shadow: 0 0 28px rgba(189, 255, 93, 0.3);
  }
  .filter-btn--active:hover {
    box-shadow: 0 0 36px rgba(189, 255, 93, 0.45);
  }
  .filter-btn--active .filter-btn-label {
    color: #0e0e0e;
  }

  /* ── Category overlay (right gradient panel) ────────────────────── */
  .cat-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 95;
    width: min(880px, 51vw);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end;
    /* Top clearance so the first category never tucks under the fixed navbar
       on shorter screens (tracks the responsive --navbar-height). */
    padding-top: calc(var(--navbar-height, 125px) + var(--spacing-4, 16px));
    /* padding-bottom = filter-btn bottom (48) + filter-btn height (48) + gap (80) */
    padding-bottom: 176px;
    background: linear-gradient(to left, #0e0e0e 0%, rgba(26, 26, 26, 0) 100%);
    cursor: default;
  }

  .cat-items {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    /* Gap scales with viewport height: roomy spacing on taller screens (as in
       the target layout), tightening gracefully on shorter ones so the list
       still clears the navbar without ever feeling cramped. */
    gap: clamp(20px, 5vh, 56px);
  }

  /* ── Filtri categoria stati — Desktop Unselected ────────────────── */
  .cat-item {
    border: 0;
    background: transparent;
    color: var(--color-content-body);
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 500;
    line-height: 28px;
    letter-spacing: 1.28px;
    text-transform: uppercase;
    text-align: right;
    white-space: pre-line;
    cursor: pointer;
    padding: 0;
    transition: color 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Desktop Hover — Figma node 6197-16451: blur(4) + two centred drop-shadows */
  .cat-item:hover {
    color: var(--color-content-accent);
    filter: url(#figma-cat-hover);
  }

  /* Desktop Selected — sharp lime */
  .cat-item--active {
    color: var(--color-content-accent);
  }

  /* ── Mobile filter icon button (48×48 circle, Figma Filtro-categorie) ── */
  .filter-icon-btn {
    display: none; /* hidden on desktop */
    position: fixed;
    right: var(--spacing-5);
    bottom: 36px;
    z-index: 100;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    background: #0e0e0e;
    color: #fafafa;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.25s ease, transform 0.22s ease;
  }
  .filter-icon-btn--active {
    background: var(--color-content-accent, #bdff5d);
    color: #0e0e0e;
    --filter-icon-bg: var(--color-content-accent, #bdff5d);
  }
  .filter-icon-btn:active { transform: scale(0.93); transition-duration: 80ms; }

  /* ── Responsive tweaks ──────────────────────────────────────────── */
  @media (max-width: 900px) {
    .toggle      { left: var(--spacing-5); bottom: 20px; }
    .filter-btn  { right: var(--spacing-5); bottom: 20px; }
    /* padding-bottom = btn-bottom (20) + btn-height (48) + gap (48) */
    .cat-overlay { width: 100vw; padding-bottom: 116px; }
    /* Mobile Unselected / Selected — slightly smaller label */
    .cat-item  { font-size: 21px; line-height: 21px; letter-spacing: 0.96px; }
    /* gap governed by the height-adaptive base rule */
  }

  /* ── Touch target compensation using --page-zoom ────────────────── */
  /* At narrow viewports the zoom factor shrinks all elements;
     scale interactive targets up so physical tap area stays ≥ 44px. */
  @media (pointer: coarse) {
    .toggle-track {
      min-height: max(45px, calc(44px / var(--page-zoom, 1)));
    }
    .toggle-option {
      min-height: max(45px, calc(44px / var(--page-zoom, 1)));
    }
    .filter-btn {
      min-height: max(45px, calc(44px / var(--page-zoom, 1)));
    }
    .cat-item {
      padding: max(8px, calc(8px / var(--page-zoom, 1))) 0;
    }
  }

  /* ── Very small viewports (phones in portrait) ───────────────────── */
  @media (max-width: 640px) {
    /* Side-by-side at Figma positions: toggle left/bottom 24/36, icon right/bottom 24/36 */
    .toggle     { left: var(--spacing-5); bottom: 36px; }
    .filter-btn { display: none; }
    .filter-icon-btn { display: flex; }

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

    /* Full-width overlay, categories right-aligned (Figma Status=Opened: counterAxisAlignItems=MAX) */
    .cat-overlay {
      width: 100vw;
      /* bottom = icon-bottom (36) + icon-height (48) + gap (56, Figma itemSpacing) */
      padding-bottom: 140px;
      align-items: flex-end;
      background: #0e0e0e;
    }
    .cat-items { align-items: flex-end; }
    .cat-item  { font-size: 21px; line-height: 20px; letter-spacing: 0.96px; text-align: right; }

    /* ── Blur BG effect (Figma EFFECT/BLUR BG, 388px ≈ 44% of 874px frame) ── */
    /* Top and bottom edge fades gain backdrop-filter on mobile so adjacent   */
    /* photos peek through a soft frosted blur instead of a hard cut.         */
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

  /* ── Genuinely short viewports — safety only ──────────────────────
     Spacing is handled by the height-adaptive gap above. Here we only
     trim the type size and bottom clearance on very short screens so the
     six categories still fit between the navbar and the FILTRA button
     without the gap having to collapse. Placed after the width queries
     so it wins where both apply. */
  @media (max-height: 620px) {
    .cat-item {
      font-size: clamp(16px, 3.2vh, 21px);
      line-height: 1.1;
    }
    .cat-overlay { padding-bottom: clamp(96px, 14vh, 140px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-selected {
      transition: none;
    }
  }
</style>
