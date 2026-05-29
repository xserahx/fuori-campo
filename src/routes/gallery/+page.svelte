<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import PhotosView from '$lib/components/gallery/PhotosView.svelte';
  import NamesView from '$lib/components/gallery/NamesView.svelte';

  let activeToggle = $state<'photos' | 'names'>('photos');
  let activeFilter  = $state<string | null>(null);
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
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="gallery-page">
  <div class="bg-noise"></div>

  {#if activeToggle === 'photos'}
    <PhotosView {activeFilter} />
  {:else}
    <NamesView {activeFilter} />
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

  <!-- ── FILTRA PER CATEGORIA button (bottom-right) ────────────── -->
  <button
    class="filter-btn"
    class:filter-btn--active={activeFilter !== null}
    type="button"
    aria-expanded={filterPanelOpen}
    onclick={() => { filterPanelOpen = !filterPanelOpen; }}
  >
    FILTRA PER CATEGORIA
  </button>

  <!-- ── Category drawer (slides in from right) ────────────────── -->
  {#if filterPanelOpen}
    <!-- scrim: click outside to close -->
    <div
      class="cat-scrim"
      role="presentation"
      onclick={() => { filterPanelOpen = false; }}
    ></div>
  {/if}

  <div class="cat-panel" class:cat-panel--open={filterPanelOpen} aria-hidden={!filterPanelOpen}>
    <ul class="cat-list" role="list">
      {#each filters as filter}
        <li>
          <button
            class="cat-item"
            class:cat-item--active={activeFilter === filter.id}
            type="button"
            tabindex={filterPanelOpen ? 0 : -1}
            onclick={() => selectFilter(filter.id)}
          >
            {filter.label}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</main>

<style>
  /* ── Global resets ─────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    overflow: hidden;
    background: #0e0e0e;
  }

  :global(*) {
    font-family: 'Forma DJR Display', 'FormaDJRDisplay', ui-sans-serif, sans-serif;
    box-sizing: border-box;
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .gallery-page {
    width: 100vw;
    height: 100vh;
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
    width: 180px;
    height: 45px;
    border-radius: 999px;
    background: var(--gallery-background, #0e0e0e);
    overflow: hidden;
  }

  /* Sliding lime pill */
  .toggle-selected {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 88px;
    height: 37px;
    border-radius: 995px;
    background: var(--gallery-accent, #bdff5d);
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  /* Shift pill to right when NOMI is active
     right position = 180 - 88 - 4 = 88px → translateX = 88 - 4 = 84px */
  .toggle--names .toggle-selected {
    transform: translateX(84px);
  }

  .toggle-option {
    position: absolute;
    top: 0;
    width: 90px;   /* 180 / 2 */
    height: 45px;
    border: 0;
    background: transparent;
    padding-top: 11px;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: flex-start;
  }

  .toggle-option--photos {
    left: 0;
    justify-content: flex-start;
    padding-left: 20px;
    padding-right: 0;
  }

  .toggle-option--names  {
    right: 0;
    justify-content: flex-end;
    padding-left: 0;
    padding-right: 20px;
  }

  .toggle-label {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    width: 57px;
    text-transform: uppercase;
    text-align: center;
    transition: color 0.2s ease;
    pointer-events: none;
  }

  /* FOTO selected (default): dark text on lime pill */
  .toggle-option--photos .toggle-label { color: #0e0e0e; }
  /* NOMI unselected: white */
  .toggle-option--names  .toggle-label { color: var(--gallery-text, #fafafa); }
  /* When NOMI is active: flip colours */
  .toggle--names .toggle-option--photos .toggle-label { color: var(--gallery-text, #fafafa); }
  .toggle--names .toggle-option--names  .toggle-label { color: #0e0e0e; }

  /* ── FILTRA PER CATEGORIA button ───────────────────────────────── */
  .filter-btn {
    position: fixed;
    right: clamp(24px, 5vw, 81px);
    bottom: clamp(24px, 3.5vh, 48px);
    z-index: 100;
    width: clamp(200px, 18vw, 275px);
    padding: clamp(8px, 1vh, 12px) 20px;
    border-radius: 999px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    background: transparent;
    color: #fafafa;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(16px, 1.5vw, 24px);
    font-weight: 500;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.22s ease, color 0.22s ease;
  }

  /* Filter is active → lime fill, dark text */
  .filter-btn--active {
    background: var(--color-content-accent, #bdff5d);
    color: #0e0e0e;
  }

  /* ── Category panel ─────────────────────────────────────────────── */
  /* Invisible click-trap to close panel on outside click */
  .cat-scrim {
    position: fixed;
    inset: 0;
    z-index: 90;
  }

  /* The actual drawer slides in from the right */
  .cat-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 95;
    width: min(600px, 52vw);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 100px clamp(32px, 5.5vw, 81px) 120px 0;
    /* Dark-to-transparent gradient so photos are legible through it */
    background: linear-gradient(
      to left,
      rgba(14, 14, 14, 0.94) 55%,
      rgba(14, 14, 14, 0) 100%
    );
    /* Slide in/out */
    transform: translateX(100%);
    opacity: 0;
    transition:
      transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
      opacity   0.28s ease;
    pointer-events: none;
  }

  .cat-panel--open {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }

  .cat-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 3.2vw, 48px);
    align-items: flex-end;
  }

  .cat-item {
    border: 0;
    background: transparent;
    color: #fafafa;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(24px, 3.2vw, 48px);
    font-weight: 500;
    line-height: 0.9;
    text-transform: uppercase;
    letter-spacing: 1.92px;
    text-align: right;
    white-space: pre-line;   /* honour \n in label */
    cursor: pointer;
    padding: 0;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.25),
      0 0 4px rgba(0, 0, 0, 0.25);
    transition: color 0.18s ease;
  }

  .cat-item:hover,
  .cat-item--active {
    color: var(--color-content-accent, #bdff5d);
  }

  /* ── Responsive tweaks ──────────────────────────────────────────── */
  @media (max-width: 900px) {
    .toggle     { left: 16px; bottom: 20px; }
    .filter-btn { right: 16px; bottom: 20px; font-size: 14px; width: auto; padding: 10px 14px; }
    .cat-panel  { width: 100vw; padding: 100px 24px 120px; }
    .cat-item   { font-size: 28px; }
    .cat-list   { gap: 28px; }
  }
</style>
