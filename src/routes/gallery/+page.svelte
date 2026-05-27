<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import PhotosView from '$lib/components/gallery/PhotosView.svelte';
  import NamesView from '$lib/components/gallery/NamesView.svelte';

  let activeToggle = $state<'photos' | 'names'>('photos');
  let activeFilter = $state<string | null>(null);

  const filters = [
    { id: 'organizzativa', label: 'Area organizzativa e servizi generali' },
    { id: 'logistica', label: 'Logistica e territorio' },
    { id: 'gestione', label: 'Gestione Operativa e Fan Experience' },
    { id: 'relazioni', label: 'Relazioni e comunicazione' },
    { id: 'cerimonie', label: 'Cerimonie e revenue' },
    { id: 'sport', label: 'Sport e discipline' }
  ];

  const setToggle = (view: 'photos' | 'names') => {
    activeToggle = view;
  };

  const setFilter = (value: string | null) => {
    activeFilter = value;
  };
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Forma+DJR+Display:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<Navbar pinned />

<main class="gallery-page">
  <div class="bg-glow bg-glow-1"></div>
  <div class="bg-glow bg-glow-2"></div>
  <div class="bg-noise"></div>

  <section class="filters" aria-label="Gallery filters">
    {#each filters as filter}
      <button
        class:filter-item--active={activeFilter === filter.id}
        class="filter-item"
        type="button"
        aria-pressed={activeFilter === filter.id}
        onclick={() => setFilter(activeFilter === filter.id ? null : filter.id)}
      >
        {filter.label}
      </button>
    {/each}
  </section>

  {#if activeToggle === 'photos'}
    <PhotosView activeFilter={activeFilter} />
  {:else}
    <NamesView activeFilter={activeFilter} />
  {/if}

  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

  <section class="toggle" aria-label="View toggle">
    <div class:toggle--names={activeToggle === 'names'} class="toggle-track">
      <span class="toggle-selected"></span>
      <button class="toggle-option toggle-option--photos" type="button" aria-pressed={activeToggle === 'photos'} onclick={() => setToggle('photos')}>
        <span class="toggle-label">FOTO</span>
      </button>
      <button class="toggle-option toggle-option--names" type="button" aria-pressed={activeToggle === 'names'} onclick={() => setToggle('names')}>
        <span class="toggle-label">NOMI</span>
      </button>
    </div>
  </section>
</main>

<style>
  :global(html),
  :global(body) {
    margin:0;
    overflow:hidden;
    background:#060606;
  }

  :global(*) {
    font-family:'Forma DJR Display', 'FormaDJRDisplay', ui-sans-serif, sans-serif;
    box-sizing:border-box;
  }

  .gallery-page {
    width:100vw;
    height:100vh;
    overflow:hidden;
    position:relative;
    background:var(--gallery-background);
  }

  .bg-noise {
    position:fixed;
    inset:0;
    pointer-events:none;
    z-index:1;
    opacity:0.03;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size:256px 256px;
  }

  .bg-glow {
    position:absolute;
    border-radius:50%;
    filter:blur(160px);
    pointer-events:none;
    z-index:0;
  }

  .bg-glow-1 {
    width:700px;
    height:700px;
    background:radial-gradient(circle, rgba(189,255,93,0.09) 0%, transparent 70%);
    top:-200px;
    left:-180px;
    animation:gd1 20s ease-in-out infinite alternate;
  }

  .bg-glow-2 {
    width:500px;
    height:500px;
    background:radial-gradient(circle, rgba(76,126,255,0.07) 0%, transparent 70%);
    right:-150px;
    bottom:-150px;
    animation:gd2 25s ease-in-out infinite alternate;
  }

  @keyframes gd1 {
    0% { transform:translate(0,0); }
    100% { transform:translate(60px,80px); }
  }

  @keyframes gd2 {
    0% { transform:translate(0,0); }
    100% { transform:translate(-50px,-60px); }
  }

  .edge-fade {
    position:fixed;
    pointer-events:none;
    z-index:10;
  }

  .edge-fade--top {
    top:0;
    left:0;
    right:0;
    height:110px;
    background:linear-gradient(to bottom, var(--gallery-background), transparent);
  }

  .edge-fade--bottom {
    bottom:0;
    left:0;
    right:0;
    height:130px;
    background:linear-gradient(to top, var(--gallery-background), transparent);
  }

  .edge-fade--left {
    left:0;
    top:0;
    bottom:0;
    width:var(--gallery-edge-width);
    background:linear-gradient(to right, var(--gallery-background), transparent);
  }

  .edge-fade--right {
    right:0;
    top:0;
    bottom:0;
    width:var(--gallery-edge-width);
    background:linear-gradient(to left, var(--gallery-background), transparent);
  }

  .filters {
    position:fixed;
    top:calc(var(--navbar-height) + 10px);
    right:14px;
    z-index:100;
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:1px;
    width:max-content;
    max-width:none;
    text-align:right;
  }

  .filter-item {
    border:0;
    background:transparent;
    color:rgba(255,255,255,0.84);
    font-size:11px;
    font-weight:700;
    line-height:1.02;
    text-transform:uppercase;
    letter-spacing:0;
    cursor:pointer;
    padding:0;
    white-space:nowrap;
    transition:color .2s ease;
  }

  .filter-item:hover {
    color:rgba(255,255,255,0.96);
  }

  .filter-item--active {
    color:var(--gallery-accent);
  }

  .toggle {
    position:fixed;
    left:32px;
    bottom:32px;
    z-index:100;
    width:143px;
    height:35px;
  }

  .toggle-track {
    position:relative;
    width:143px;
    height:35px;
    border-radius:24px;
    background:var(--gallery-background);
    overflow:hidden;
  }

  .toggle-selected {
    position:absolute;
    top:4px;
    left:4px;
    width:69px;
    height:27px;
    border-radius:16px;
    background:var(--gallery-accent);
    transition:transform .38s cubic-bezier(.22,1,.36,1);
    pointer-events:none;
  }

  .toggle--names .toggle-selected {
    transform:translateX(66px);
  }

  .toggle-option {
    position:absolute;
    top:0;
    width:69px;
    height:35px;
    border:0;
    background:transparent;
    padding:0;
    cursor:pointer;
    z-index:2;
  }

  .toggle-option--photos {
    left:0;
  }

  .toggle-option--names {
    right:0;
  }

  .toggle-label {
    position:absolute;
    top:50%;
    transform:translateY(-50%);
    font-family:'Forma DJR Display',sans-serif;
    font-size:16px;
    font-weight:700;
    line-height:1;
    letter-spacing:0;
    text-transform:uppercase;
    transition:color .2s ease;
  }

  .toggle-option--photos .toggle-label {
    left:19px;
    color:#1a1a1a;
  }

  .toggle-option--names .toggle-label {
    right:19px;
    color:var(--gallery-text);
  }

  .toggle--names .toggle-option--photos .toggle-label {
    color:var(--gallery-text);
  }

  .toggle--names .toggle-option--names .toggle-label {
    color:#1a1a1a;
  }
</style>
