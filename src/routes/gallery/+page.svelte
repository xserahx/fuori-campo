<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import { onMount } from 'svelte';

  let activeToggle = $state<'photos' | 'names'>('photos');
  let activeFilter = $state<string | null>(null);

  // Collage images 
  const imagesRaw = [
    { src: 'https://www.figma.com/api/mcp/asset/aa1bcc44-33a0-48b1-a75c-913f2d3630eb', left: 1384.95, top: 494.84, width: 223.864, height: 298.485, tags: ['organizzativa'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06 },
    { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06, tags: ['logistica'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/cf92030a-f76a-466e-83d6-f94316719d6e', left: 628.47, top: 155.8, width: 161.035, height: 286.285, tags: ['gestione'], name: 'Elisa Filippi' },
    { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425 },
    { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425, tags: ['relazioni'], name: 'Adriano Lacchin' },
    { src: 'https://www.figma.com/api/mcp/asset/9dc12179-c0fb-4d55-988b-c055d87fecb1', left: 320.99, top: 1041.6, width: 184.303, height: 138.452, tags: ['cerimonie'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938 },
    { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938, tags: ['sport'], name: 'Rudy Bre' },
    { src: 'https://www.figma.com/api/mcp/asset/005b2d2c-0afe-4335-9bff-7580699b45c3', left: 1509.16, top: 889.88, width: 263.09, height: 199.246, tags: ['organizzativa'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919 },
    { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919, tags: ['logistica'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/331fa98b-1d4f-4c52-84df-2f4e0da7c169', left: 159.12, top: 774.83, width: 158.83, height: 211.773, tags: ['gestione'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684 },
    { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684, tags: ['relazioni'], name: 'Gualtiero D\'Amiano' },
    { src: 'https://www.figma.com/api/mcp/asset/1f8a6af0-1ed8-4150-9b19-e988572ea609', left: 648.83, top: 811.48, width: 185.429, height: 247.239, tags: ['cerimonie'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948 },
    { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948, tags: ['sport'], name: 'Lisa Liz' },
    { src: 'https://www.figma.com/api/mcp/asset/57845de6-3257-4345-b245-5582dcd71fed', left: 413.64, top: 554.91, width: 165.865, height: 221.153, tags: ['organizzativa'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714 },
    { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714, tags: ['logistica'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/08aad09d-f709-4304-b39f-2a12aad3373f', left: 1207.8, top: 935.69, width: 157.939, height: 210.586, tags: ['gestione'], name: 'Gualtiero D\'Amiano' },
    { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479 },
    { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479, tags: ['relazioni'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/f11ba762-b329-4551-a3d6-ef7950a6bb8d', left: 736.39, top: 564.07, width: 214.461, height: 160.846, tags: ['cerimonie'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095 },
    { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095, tags: ['sport'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/ded9c5f3-a6e9-4d84-be2c-7b125c11b710', left: -131.05, top: 793.15, width: 102.25, height: 136.334, tags: ['logistica'], name: 'Romano Cecchin' },
    { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864 },
    { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864, tags: ['gestione'], name: 'Mariagrazia Toscano' },
    { src: 'https://www.figma.com/api/mcp/asset/bd2e4233-abf8-4255-b73b-9c2060bdbf2d', left: -198.26, top: 309.54, width: 203.567, height: 152.675, tags: ['organizzativa'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963 },
    { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963, tags: ['logistica'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/fd4440df-10b0-46de-9533-973bb268cf89', left: 626.66, top: 388.45, width: 155.829, height: 161.1, tags: ['relazioni'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633 },
    { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633, tags: ['cerimonie'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/721f6cef-83d5-4035-be4d-9652b82b9c81', left: 1049.7, top: 780.99, width: 359.169, height: 215.501, tags: ['relazioni'], name: 'Laura Giovanessi' },
    { src: 'https://www.figma.com/api/mcp/asset/e99ac53f-6fba-4a2e-ba86-d6f12f9eb068', left: 244.8, top: 810.1, width: 248.122, height: 186.092, tags: ['organizzativa'], name: 'Lisa Liz' },
    { src: 'https://www.figma.com/api/mcp/asset/c42edf09-a934-400c-bae9-0eaf96a509bd', left: 390, top: 593, width: 250.15, height: 187.612, tags: ['gestione'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/f47cc2c2-c580-4acf-ad82-83302c739cc7', left: 749.52, top: 565.56, width: 361.128, height: 192.267, tags: ['sport'], name: 'Anna Passarella' }
  ];

  let scale = $state<number>(1);

  const designWidth = 1920;
  const designHeight = 1080;

  function updateScale() {
    scale = Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight);
  }

  onMount(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  });

  const filters = [
    { id: 'organizzativa', label: 'Area organizzativa e servizi generali' },
    { id: 'logistica', label: 'Logistica e territorio' },
    { id: 'gestione', label: 'Gestione Operativa e Fan Experience' },
    { id: 'relazioni', label: 'Relazioni e comunicazione' },
    { id: 'cerimonie', label: 'Cerimonie e revenue' },
    { id: 'sport', label: 'Sport e discipline' }
  ];

  function setToggle(next: 'photos' | 'names') {
    activeToggle = next;
  }

  function setFilter(next: string | null) {
    activeFilter = next;
  }
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<Navbar />

<main class="gallery-page">
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

  <div class="collage" aria-hidden="false">
    <div
      class="collage-inner"
      style="width: {designWidth}px; height: {designHeight}px; transform: scale({scale}); transform-origin: top left;"
    >
      {#each imagesRaw as img, i (img.src + '-' + i)}
        <div
          class="collage-item"
          style="left: {img.left}px; top: {img.top}px; width: {img.width}px; height: {img.height}px;"
          class:img-unmatched={activeFilter && !(img.tags && img.tags.includes(activeFilter))}
        >
          <img
            src={img.src}
            alt={img.name ?? 'photo'}
            class="collage-img"
            class:img--names={activeToggle === 'names'}
          />

          {#if activeToggle === 'names' && (!activeFilter || (img.tags && img.tags.includes(activeFilter)))}
            <div class="img-name">{img.name ?? 'Name'}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <section class="toggle" aria-label="Gallery view toggle">
    <div class="toggle-track" aria-hidden="true"></div>
    <div class:toggle-selected--names={activeToggle === 'names'} class="toggle-selected" aria-hidden="true"></div>
    <button
      class:toggle-label--active={activeToggle === 'photos'}
      class="toggle-label toggle-label--photos"
      type="button"
      aria-pressed={activeToggle === 'photos'}
      onclick={() => setToggle('photos')}
    >
      PHOTOS
    </button>
    <button
      class:toggle-label--active={activeToggle === 'names'}
      class="toggle-label toggle-label--names"
      type="button"
      aria-pressed={activeToggle === 'names'}
      onclick={() => setToggle('names')}
    >
      NAMES
    </button>
  </section>
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  .gallery-page {
    width: 100%;
    height: 100vh;
    background: var(--color-background-primary);
    position: relative;
    overflow: hidden;
  }

  .filters {
    position: fixed;
    top: 46px;
    right: 58px;
    z-index: 120;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    width: 100%;
    text-align: right;
    text-transform: uppercase;
    font-size: 20px;
  }

  .filter-item {
    appearance: none;
    border: 0;
    background: transparent;
    margin: 0;
    padding: 0;
    color: var(--color-content-body);
    text-transform: uppercase;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 24px;
    letter-spacing: 0;
    white-space: nowrap;
    cursor: pointer;
    text-align: right;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.25),
      0 4px 4px rgba(0, 0, 0, 0.25);
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      color 180ms ease,
      opacity 180ms ease;
  }

  .filter-item + .filter-item {
    margin-top: 0;
  }

  .filter-item--active {
    color: var(--color-link-selected);
    font-family: 'Forma DJR Display', sans-serif;
    font-weight: 700;
    opacity: 1;
    transform: none;
  }

  .filter-item:hover {
    opacity: 0.98;
    transform: none;
  }

  .toggle {
    position: absolute;
    left: 54px;
    bottom: 24px;
    width: 180px;
    height: 35px;
    border-radius: 53.5px;
    isolation: isolate;
  }

  .toggle-track,
  .toggle-selected {
    position: absolute;
    inset: 0;
    border-radius: 53.5px;
  }

  .toggle-track {
    background: var(--color-background-primary);
    box-shadow: inset 0 0 0 1px rgba(250, 250, 250, 0.08);
  }

  .toggle-selected {
    left: 4px;
    top: 4px;
    width: 89px;
    height: 27px;
    background: var(--color-link-selected);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.08),
      0 8px 18px rgba(189, 255, 93, 0.26),
      0 0 18px rgba(189, 255, 93, 0.2);
    transform: translateX(0);
    transition:
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .toggle-selected--names {
    transform: translateX(85px);
  }

  .toggle-label {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: 0.02em;
    cursor: pointer;
    z-index: 1;
    transition:
      color 220ms ease,
      opacity 220ms ease,
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .toggle-label--photos {
    left: 20px;
    color: var(--color-content-body);
  }

  .toggle-label--names {
    right: 18px;
    color: var(--color-content-body);
  }

  .toggle-label--active.toggle-label--photos {
    color: var(--color-content-primary);
    transform: translateY(-50%) scale(1.02);
  }

  .toggle-label--active.toggle-label--names {
    color: var(--color-content-primary);
    opacity: 0.92;
    transform: translateY(-50%) scale(1.02);
  }

  .toggle-label:not(.toggle-label--active) {
    opacity: 0.88;
  }

  .toggle:hover .toggle-selected {
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.08),
      0 10px 24px rgba(189, 255, 93, 0.3),
      0 0 22px rgba(189, 255, 93, 0.26);
  }

  .collage {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .collage-inner {
    position: relative;
    transform-origin: top left;
    pointer-events: none;
  }

  .collage-img {
    position: absolute;
    object-fit: cover;
    display: block;
    pointer-events: none;
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.15);
    -webkit-user-drag: none;
  }

  .collage-item {
    position: absolute;
    overflow: hidden;
    border-radius: 6px;
  }

  .img--names {
    filter: grayscale(100%) brightness(0.7) contrast(0.9);
    transform-origin: center;
  }

  .img-unmatched .collage-img,
  .collage-item.img-unmatched > .collage-img {
    filter: grayscale(100%) brightness(0.6) contrast(0.95);
    opacity: 0.7;
  }

  .img-name {
    position: absolute;
    left: 10px;
    bottom: 10px;
    color: white;
    font-family: var(--font-display);
    font-size: 14px;
    background: rgba(0,0,0,0.5);
    padding: 6px 8px;
    border-radius: 4px;
    pointer-events: none;
    text-transform: none;
    z-index: 2;
    white-space: nowrap;
  }
</style>
