<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let activeToggle = $state<'photos' | 'names'>('photos');
  let activeFilter = $state<string | null>(null);

  let collageRef: HTMLDivElement;
  let innerRef: HTMLDivElement;
  let scale = $state<number>(1);

  const designWidth = 1920;
  const designHeight = 1080;

  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;
  let velX = 0, velY = 0;
  let isDragging = false;
  let lastX = 0, lastY = 0, lastTime = 0;
  let rafId: number;

  const FRICTION = 0.92;
  const LERP = 0.1;

  function animate() {
    if (!isDragging) {
      velX *= FRICTION; velY *= FRICTION;
      targetX += velX; targetY += velY;
    }
    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;
    gsap.set(innerRef, { x: currentX, y: currentY, force3D: true });
    rafId = requestAnimationFrame(animate);
  }

  function pointerDown(e: PointerEvent) {
    isDragging = true;
    lastX = e.clientX; lastY = e.clientY;
    lastTime = performance.now();
    velX = 0; velY = 0;
    collageRef?.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dt = Math.max(performance.now() - lastTime, 1);
    targetX += (e.clientX - lastX) * 1.2;
    targetY += (e.clientY - lastY) * 1.2;
    velX = ((e.clientX - lastX) / dt) * 16;
    velY = ((e.clientY - lastY) / dt) * 16;
    lastX = e.clientX; lastY = e.clientY;
    lastTime = performance.now();
  }

  function pointerUp() { isDragging = false; }

  function wheelMove(e: WheelEvent) {
    e.preventDefault();
    targetX -= e.deltaX * 0.85;
    targetY -= e.deltaY * 0.85;
  }

  function updateScale() {
    scale = Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight);
  }

  onMount(() => {
    updateScale();
    animate();
    window.addEventListener('resize', updateScale);
    window.addEventListener('pointerup', pointerUp);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('pointerup', pointerUp);
      cancelAnimationFrame(rafId);
    };
  });

  const filters = [
    { id: 'organizzativa', label: 'Area organizzativa e servizi generali' },
    { id: 'logistica', label: 'Logistica e territorio' },
    { id: 'gestione', label: 'Gestione Operativa e Fan Experience' },
    { id: 'relazioni', label: 'Relazioni e comunicazione' },
    { id: 'cerimonie', label: 'Cerimonie e revenue' },
    { id: 'sport', label: 'Sport e discipline' }
  ];

  const setToggle = (v: 'photos' | 'names') => activeToggle = v;
  const setFilter = (v: string | null) => activeFilter = v;

  const COL_W = 220;   // larghezza card
  const ROW_H = 160;   // altezza card
  const GAP   = 8;     // spazio tra card
  const STEP  = COL_W + GAP;
  const VSTEP = ROW_H + GAP;
  const OFFSET_X = 10;
  const OFFSET_Y = 10;

  const imagesRaw = [
    // ROW 1
    { src: '/images/placeholder.jpg', name: 'Mario Rossi',      tags: ['organizzativa'], left: OFFSET_X + STEP * 0, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Laura Bianchi',    tags: ['logistica'],     left: OFFSET_X + STEP * 1, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Giulia Verdi',     tags: ['gestione'],      left: OFFSET_X + STEP * 2, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Marco Ferrari',    tags: ['relazioni'],     left: OFFSET_X + STEP * 3, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Sara Colombo',     tags: ['cerimonie'],     left: OFFSET_X + STEP * 4, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Luca Ricci',       tags: ['sport'],         left: OFFSET_X + STEP * 5, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Anna Marino',      tags: ['organizzativa'], left: OFFSET_X + STEP * 6, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Paolo Greco',      tags: ['logistica'],     left: OFFSET_X + STEP * 7, top: OFFSET_Y + VSTEP * 0, width: COL_W, height: ROW_H },
    // ROW 2
    { src: '/images/placeholder.jpg', name: 'Elena Conti',      tags: ['gestione'],      left: OFFSET_X + STEP * 0, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Roberto Esposito', tags: ['relazioni'],     left: OFFSET_X + STEP * 1, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Chiara Bruno',     tags: ['cerimonie'],     left: OFFSET_X + STEP * 2, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Fabio Romano',     tags: ['sport'],         left: OFFSET_X + STEP * 3, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Valentina Gallo',  tags: ['organizzativa'], left: OFFSET_X + STEP * 4, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Simone Costa',     tags: ['logistica'],     left: OFFSET_X + STEP * 5, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Martina Fontana',  tags: ['gestione'],      left: OFFSET_X + STEP * 6, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Davide Lombardi',  tags: ['relazioni'],     left: OFFSET_X + STEP * 7, top: OFFSET_Y + VSTEP * 1, width: COL_W, height: ROW_H },
    // ROW 3
    { src: '/images/placeholder.jpg', name: 'Silvia Moretti',   tags: ['cerimonie'],     left: OFFSET_X + STEP * 0, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Andrea Barbieri',  tags: ['sport'],         left: OFFSET_X + STEP * 1, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Francesca Poli',   tags: ['organizzativa'], left: OFFSET_X + STEP * 2, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Matteo Santoro',   tags: ['logistica'],     left: OFFSET_X + STEP * 3, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Alessia Gentile',  tags: ['gestione'],      left: OFFSET_X + STEP * 4, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Claudio Marini',   tags: ['relazioni'],     left: OFFSET_X + STEP * 5, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Serena Ferretti',  tags: ['cerimonie'],     left: OFFSET_X + STEP * 6, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Gianluca Leone',   tags: ['sport'],         left: OFFSET_X + STEP * 7, top: OFFSET_Y + VSTEP * 2, width: COL_W, height: ROW_H },
    // ROW 4
    { src: '/images/placeholder.jpg', name: 'Paola Vitale',     tags: ['organizzativa'], left: OFFSET_X + STEP * 0, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Stefano Caruso',   tags: ['logistica'],     left: OFFSET_X + STEP * 1, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Irene De Luca',    tags: ['gestione'],      left: OFFSET_X + STEP * 2, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Nicola Serra',     tags: ['relazioni'],     left: OFFSET_X + STEP * 3, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Monica Riva',      tags: ['cerimonie'],     left: OFFSET_X + STEP * 4, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Emanuele Grassi',  tags: ['sport'],         left: OFFSET_X + STEP * 5, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Rossella Fiore',   tags: ['organizzativa'], left: OFFSET_X + STEP * 6, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
    { src: '/images/placeholder.jpg', name: 'Vincenzo Palma',   tags: ['logistica'],     left: OFFSET_X + STEP * 7, top: OFFSET_Y + VSTEP * 3, width: COL_W, height: ROW_H },
  ];

  const collageSlots = [
    { left: 48, top: 152, width: 220, height: 150 },
    { left: 260, top: 68, width: 150, height: 110 },
    { left: 470, top: 108, width: 200, height: 140 },
    { left: 700, top: 52, width: 260, height: 170 },
    { left: 980, top: 150, width: 210, height: 145 },
    { left: 1260, top: 120, width: 150, height: 110 },
    { left: 118, top: 332, width: 270, height: 180 },
    { left: 450, top: 296, width: 330, height: 210 },
    { left: 860, top: 276, width: 245, height: 160 },
    { left: 1100, top: 206, width: 140, height: 104 },
    { left: 1328, top: 320, width: 108, height: 82 },
    { left: 24, top: 598, width: 255, height: 170 },
    { left: 392, top: 626, width: 190, height: 130 },
    { left: 614, top: 606, width: 208, height: 140 },
    { left: 885, top: 582, width: 322, height: 185 },
    { left: 1260, top: 558, width: 150, height: 106 }
  ];

  const COLLAGE_SCALE = 1.28;
  const COLLAGE_TIER_SCALE = 0.88;
  const COLLAGE_TIER_SHIFT_X = 120;
  const COLLAGE_TIER_SHIFT_Y = 72;

  const positionedImages = imagesRaw.map((image, index) => {
    const slot = collageSlots[index % collageSlots.length];
    const tier = Math.floor(index / collageSlots.length);
    const scaleFactor = tier === 0 ? 1 : COLLAGE_TIER_SCALE;
    const xShift = tier === 0 ? 0 : COLLAGE_TIER_SHIFT_X;
    const yShift = tier === 0 ? 0 : COLLAGE_TIER_SHIFT_Y;

    return {
      ...image,
      left: Math.round((slot.left + xShift) * COLLAGE_SCALE),
      top: Math.round((slot.top + yShift) * COLLAGE_SCALE),
      width: Math.round(slot.width * scaleFactor * COLLAGE_SCALE),
      height: Math.round(slot.height * scaleFactor * COLLAGE_SCALE)
    };
  });
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Forma+DJR+Display:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<svelte:window on:pointermove={pointerMove} />

<Navbar />

<main class="gallery-page">

  <div class="bg-glow bg-glow-1"></div>
  <div class="bg-glow bg-glow-2"></div>
  <div class="bg-noise"></div>

  <!-- FILTERS -->
  <section class="filters" aria-label="Gallery filters">
    {#each filters as filter}
      <button
        class:filter-item--active={activeFilter === filter.id}
        class="filter-item"
        type="button"
        aria-pressed={activeFilter === filter.id}
        on:click={() => setFilter(activeFilter === filter.id ? null : filter.id)}
      >
        {filter.label}
      </button>
    {/each}
  </section>

  <!-- COLLAGE -->
  <div
    bind:this={collageRef}
    class="collage"
    on:pointerdown={pointerDown}
    on:wheel|preventDefault={wheelMove}
  >
    <div
      bind:this={innerRef}
      class="collage-inner"
      style="
        width:{designWidth}px;
        height:{designHeight}px;
        transform:scale({scale});
        transform-origin:center center;
        left:calc(50vw - {designWidth / 2}px);
        top:calc(50vh - {designHeight / 2}px);
      "
    >
      {#each positionedImages as img, i (img.src + '-' + i + '-' + img.name)}
        {@const isUnmatched = !!(activeFilter && !(img.tags && img.tags.includes(activeFilter)))}
        <div
          class="collage-item"
          class:img-unmatched={isUnmatched}
          style="left:{img.left}px;top:{img.top}px;width:{img.width}px;height:{img.height}px;"
        >
          <div class="img-bw-layer">
            <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--bw" draggable="false" />
          </div>
          <div class="img-color-layer">
            <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--color" class:img--names={activeToggle === 'names'} draggable="false" />
          </div>
          <div class="img-noise"></div>
          <div class="img-vignette"></div>
          {#if activeToggle === 'names' && (!activeFilter || (img.tags && img.tags.includes(activeFilter)))}
            <div class="img-name">{img.name ?? 'Name'}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- EDGE FADES -->
  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

  <!-- TOGGLE -->
  <section class="toggle" aria-label="View toggle">
    <div class:toggle--names={activeToggle === 'names'} class="toggle-track">
      <span class="toggle-selected"></span>
      <button class="toggle-option toggle-option--photos" type="button" aria-pressed={activeToggle === 'photos'} on:click={() => setToggle('photos')}>
        <span class="toggle-label">FOTO</span>
      </button>
      <button class="toggle-option toggle-option--names" type="button" aria-pressed={activeToggle === 'names'} on:click={() => setToggle('names')}>
        <span class="toggle-label">NOMI</span>
      </button>
    </div>
  </section>

  <div class="item-count">{imagesRaw.length} MEMBERS</div>

</main>

<style>
  :global(html), :global(body) {
    margin: 0;
    overflow: hidden;
    background: #060606;
  }

  :global(*) {
    font-family: 'Forma DJR Display', 'FormaDJRDisplay', ui-sans-serif, sans-serif;
    box-sizing: border-box;
  }

  .gallery-page {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
    background: #1a1a1a;
  }

  .bg-noise {
    position: fixed; inset: 0;
    pointer-events: none; z-index: 1; opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  .bg-glow { position:absolute; border-radius:50%; filter:blur(160px); pointer-events:none; z-index:0; }
  .bg-glow-1 {
    width:700px; height:700px;
    background:radial-gradient(circle, rgba(189,255,93,0.09) 0%, transparent 70%);
    top:-200px; left:-180px;
    animation: gd1 20s ease-in-out infinite alternate;
  }
  .bg-glow-2 {
    width:500px; height:500px;
    background:radial-gradient(circle, rgba(76,126,255,0.07) 0%, transparent 70%);
    right:-150px; bottom:-150px;
    animation: gd2 25s ease-in-out infinite alternate;
  }
  @keyframes gd1 { 0%{transform:translate(0,0)} 100%{transform:translate(60px,80px)} }
  @keyframes gd2 { 0%{transform:translate(0,0)} 100%{transform:translate(-50px,-60px)} }

  .edge-fade { position:fixed; pointer-events:none; z-index:10; }
  .edge-fade--top    { top:0;    left:0; right:0;  height:110px; background:linear-gradient(to bottom,#060606,transparent); }
  .edge-fade--top    { top:0;    left:0; right:0;  height:110px; background:linear-gradient(to bottom,#1a1a1a,transparent); }
  .edge-fade--bottom { bottom:0; left:0; right:0;  height:130px; background:linear-gradient(to top,   #1a1a1a,transparent); }
  .edge-fade--left   { left:0;   top:0;  bottom:0; width:70px;   background:linear-gradient(to right, #1a1a1a,transparent); }
  .edge-fade--right  { right:0;  top:0;  bottom:0; width:70px;   background:linear-gradient(to left,  #1a1a1a,transparent); }

  /* COLLAGE */
  .collage { position:absolute; inset:0; z-index:2; cursor:grab; }
  .collage:active { cursor:grabbing; }
  .collage-inner { position:absolute; will-change:transform; }

  /* CARD */
  .collage-item {
    position:absolute; overflow:hidden; border-radius:5px;
    box-shadow:0 2px 16px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);
    transition:box-shadow .4s ease, opacity .45s ease;
  }
  .collage-item:hover {
    z-index:50;
    box-shadow:0 8px 48px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07);
  }

  /* GRAYSCALE ↔ COLOR LAYERS */
  .img-bw-layer, .img-color-layer {
    position:absolute; inset:0; width:100%; height:100%;
  }
  .img-bw-layer    { z-index:1; transition:opacity .5s cubic-bezier(.25,.46,.45,.94); }
  .img-color-layer { z-index:2; transition:opacity .5s cubic-bezier(.25,.46,.45,.94); }

  .collage-img {
    width:100%; height:100%; object-fit:cover; display:block;
    user-select:none; -webkit-user-drag:none;
    will-change:transform,filter;
    transform:scale(1.04);
    transition:transform .65s cubic-bezier(.25,.46,.45,.94), filter .5s ease;
  }
  .collage-img--bw {
    filter:grayscale(100%) contrast(1.05) brightness(0.82);
  }
  .collage-img--color.img--names {
    filter:grayscale(80%) brightness(0.55);
  }

  /* Hover on matched: show colour */
  .collage-item:hover .img-bw-layer { opacity:0; }
  .collage-item:hover .collage-img  { transform:scale(1.09); }

  /* UNMATCHED */
  .img-unmatched { opacity:0.45; }
  .img-unmatched .img-color-layer { opacity:0; transition:opacity .5s ease; }
  .img-unmatched .img-bw-layer    { opacity:1; }
  .img-unmatched .collage-img--bw { filter:grayscale(100%) contrast(0.82) brightness(0.42); }

  /* Hover on unmatched: colour reveal */
  .img-unmatched:hover .img-color-layer { opacity:1; }
  .img-unmatched:hover .img-bw-layer    { opacity:0; }
  .img-unmatched:hover                  { opacity:1; }

  /* OVERLAYS */
  .img-noise {
    position:absolute; inset:0; z-index:3;
    background-image:radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size:3px 3px; mix-blend-mode:overlay; opacity:0.12; pointer-events:none;
  }
  .img-vignette {
    position:absolute; inset:0; z-index:4;
    background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%);
    pointer-events:none; opacity:0; transition:opacity .4s ease;
  }
  .collage-item:hover .img-vignette { opacity:1; }

  .img-name {
    position:absolute; left:8px; bottom:8px; z-index:5;
    color:white; font-size:10px; font-weight:400;
    padding:5px 9px; border-radius:999px;
    background:rgba(0,0,0,0.52); backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.07);
    letter-spacing:0.09em; text-transform:uppercase; pointer-events:none;
  }

  /* FILTERS */
  .filters {
    position:fixed; top:12px; right:10px;
    z-index:100; display:flex; flex-direction:column; align-items:flex-end;
    gap:2px; max-width:220px; text-align:right;
  }
  .filter-item {
    border:0; background:transparent;
    color:rgba(255,255,255,0.72);
    font-size:9px; font-weight:600; line-height:1;
    text-transform:uppercase; letter-spacing:0.02em;
    cursor:pointer; padding:0;
    transition:color .2s ease;
  }
  .filter-item:hover { color:rgba(255,255,255,0.92); }
  .filter-item--active { color:#bdff5d; }

  /* TOGGLE */
  .toggle {
    position:fixed; left:32px; bottom:32px; z-index:100;
    width:143px; height:35px;
  }
  .toggle-track {
    position:relative;
    width:143px; height:35px;
    border-radius:24px;
    background:#1a1a1a;
    overflow:hidden;
  }
  .toggle-selected {
    position:absolute; top:4px; left:4px;
    width:69px; height:27px; border-radius:16px;
    background:#bdff5d;
    transition:transform .38s cubic-bezier(.22,1,.36,1); pointer-events:none;
  }
  .toggle--names .toggle-selected { transform:translateX(66px); }
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
  .toggle-option--photos { left:0; }
  .toggle-option--names { right:0; }
  .toggle-label {
    position:absolute; top:50%; transform:translateY(-50%);
    font-family:'Forma DJR Display',sans-serif;
    font-size:16px; 
    font-weight:700; 
    line-height:1; 
    letter-spacing:0;
    text-transform:uppercase;
    transition:color .2s ease;
  }
  .toggle-option--photos .toggle-label {
    left:19px; color:#1a1a1a;
  }
  .toggle-option--names .toggle-label {
    right:19px; color:#fafafa;
  }
  .toggle--names .toggle-option--photos .toggle-label { color:#fafafa; }
  .toggle--names .toggle-option--names .toggle-label { color:#1a1a1a; }

  /* COUNT */
  .item-count {
    position:fixed; left:32px; top:50%; transform:translateY(-50%);
    z-index:100; writing-mode:vertical-rl; text-orientation:mixed;
    font-size:9px; font-weight:400; letter-spacing:0.18em;
    color:rgba(255,255,255,0.15); text-transform:uppercase; pointer-events:none;
  }
</style>