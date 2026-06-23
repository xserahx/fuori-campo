<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { fade }   from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import '../../lib/styles/tokens.css';
  import PhotosView from '$lib/components/gallery/PhotosView.svelte';
  import NamesView from '$lib/components/gallery/NamesView.svelte';
  import { readGalleryContext } from '$lib/data/gallery-context';
  import { fetchAllVolunteers, type VolunteerSummary } from '$lib/supabase';

  let dbVolunteers = $state<VolunteerSummary[]>([]);

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

<main class="gallery-page">
  <div class="bg-noise"></div>

  {#if activeToggle === 'photos'}
    <PhotosView {activeFilter} {dbVolunteers} />
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

  <!-- ── FILTRA PER CATEGORIA button — hidden while panel is open ── -->
  {#if !filterPanelOpen}
    <button
      class="filter-btn"
      class:filter-btn--active={activeFilter !== null}
      type="button"
      onclick={() => { filterPanelOpen = true; }}
    >
      <span class="filter-btn-label">FILTRA PER CATEGORIA</span>
    </button>
  {/if}

  <!-- ── Category overlay (right gradient panel) ───────────────── -->
  {#if filterPanelOpen}
    <div
      class="cat-overlay"
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

      <!-- Lime circle X — closes the panel -->
      <button
        class="cat-close"
        type="button"
        aria-label="Chiudi filtri"
        onclick={(e) => { e.stopPropagation(); filterPanelOpen = false; }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <line x1="3" y1="3" x2="17" y2="17" stroke="#0e0e0e" stroke-width="2" stroke-linecap="round"/>
          <line x1="17" y1="3" x2="3" y2="17" stroke="#0e0e0e" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  {/if}
</main>

<style>
  /* ── Global resets ─────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
  }

  :global(*) {
    font-family: 'Forma DJR Display', 'FormaDJRDisplay', ui-sans-serif, sans-serif;
    box-sizing: border-box;
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .gallery-page {
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    position: relative;
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
  }

  .edge-fade--top {
    top: 0; left: 0; right: 0;
    height: 214px;
    background: linear-gradient(to bottom, var(--gallery-background, #0e0e0e), transparent);
  }

  .edge-fade--bottom {
    bottom: 0; left: 0; right: 0;
    height: 130px;
    background: linear-gradient(to top, var(--gallery-background, #0e0e0e), transparent);
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
    left: clamp(24px, 4.5vw, 72px);
    bottom: clamp(24px, 3.5vh, 48px);
    z-index: 100;
  }

  .toggle-track {
    position: relative;
    width: 190px;
    height: 45px;
    border-radius: 999px;
    background: var(--gallery-background, #0e0e0e);
  }

  /* Outlined sliding pill — lime border, transparent fill */
  .toggle-selected {
    position: absolute;
    top: 0;
    left: 0;
    width: 97px;
    height: 45px;
    border-radius: 995px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    background: transparent;
    box-shadow: 0 0 12px rgba(189, 255, 93, 0.22), inset 0 0 8px rgba(189, 255, 93, 0.06);
    transition:
      transform   0.42s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow  0.42s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }
  .toggle-track:hover .toggle-selected {
    box-shadow: 0 0 20px rgba(189, 255, 93, 0.35), inset 0 0 12px rgba(189, 255, 93, 0.1);
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
    transition: filter 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .toggle-option:active { transform: scale(0.96); transition-duration: 80ms; }

  .toggle-option--photos {
    left: 0;
    justify-content: flex-start;
    padding-left: 20px;
  }

  .toggle-option--names {
    right: 0;
    justify-content: flex-end;
    padding-right: 20px;
  }

  .toggle-label {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    width: 57px;
    text-align: center;
    color: #fafafa;
    transition: color 0.22s ease;
    pointer-events: none;
    user-select: none;
  }

  /* Any hovered side: text turns lime */
  .toggle-option:hover .toggle-label {
    color: var(--color-content-accent, #bdff5d);
  }

  /* Hovering the ALREADY-SELECTED side adds a cinematic bloom blur */
  .toggle-track:not(.toggle--names) .toggle-option--photos:hover,
  .toggle-track.toggle--names       .toggle-option--names:hover {
    filter: blur(4px);
  }

  /* ── FILTRA PER CATEGORIA button ───────────────────────────────── */
  .filter-btn {
    position: fixed;
    right: clamp(24px, 5vw, 81px);
    bottom: clamp(24px, 3.5vh, 48px);
    z-index: 100;
    width: 275px;
    padding: 12px 20px;
    border-radius: 999px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    background: #0e0e0e;
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

  .filter-btn-label {
    display: block;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    text-align: center;
    white-space: nowrap;
    color: #fafafa;
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
    padding-bottom: 48px;
    padding-right: 72px;
    gap: 80px;
    background: linear-gradient(to left, #0e0e0e 0%, rgba(26, 26, 26, 0) 100%);
    cursor: default;
  }

  .cat-items {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 36px;
  }

  .cat-item {
    border: 0;
    background: transparent;
    color: #fafafa;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 32px;
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 1.28px;
    text-align: right;
    white-space: pre-line;
    cursor: pointer;
    padding: 0;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.25), 0 0 4px rgba(0, 0, 0, 0.25);
    transition:
      color     0.22s cubic-bezier(0.22, 1, 0.36, 1),
      filter    0.22s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Hover: slide left + bloom blur + lime */
  .cat-item:hover {
    color: var(--color-content-accent, #bdff5d);
    filter: blur(4px);
    transform: translateX(-10px);
  }

  /* Selected: lime only, no blur, nudge left */
  .cat-item--active {
    color: var(--color-content-accent, #bdff5d);
    transform: translateX(-6px);
  }
  .cat-item--active:hover {
    filter: none;
    transform: translateX(-10px);
  }

  /* Lime circle X button */
  .cat-close {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: var(--color-content-accent, #bdff5d);
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition:
      transform  0.36s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.36s cubic-bezier(0.22, 1, 0.36, 1),
      filter     0.22s ease;
  }

  .cat-close:hover {
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 0 20px rgba(189, 255, 93, 0.4);
  }
  .cat-close:active {
    transform: rotate(90deg) scale(0.94);
    transition-duration: 80ms;
  }

  /* ── Responsive tweaks ──────────────────────────────────────────── */
  @media (max-width: 900px) {
    .toggle      { left: 16px; bottom: 20px; }
    .filter-btn  { right: 16px; bottom: 20px; }
    .cat-overlay { width: 100vw; padding-right: 24px; padding-bottom: 32px; gap: 48px; }
    .cat-item    { font-size: 24px; }
    .cat-items   { gap: 24px; }
  }
</style>
