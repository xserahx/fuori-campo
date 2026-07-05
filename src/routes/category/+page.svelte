<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { gsap } from 'gsap';
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import '$lib/styles/tokens.css';

  type Category = {
    id: number;
    label: string;
    image: string;
    mobileFillLh?: number;
    mobileOutlineLh?: number;
  };

  const IMG_RELAZIONI = '/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.webp';
  const IMG_CERIMONIE = '/volunteer_images/carosello_categorie/Cerimonia_e_revenue.webp';
  const IMG_SPORT = '/volunteer_images/carosello_categorie/Sport.webp';
  const IMG_AREAORGANIZZATIVA = '/volunteer_images/carosello_categorie/Area_organizzativa.webp';
  const IMG_LOGISTICA = '/volunteer_images/carosello_categorie/Logistica_e_territorio.webp';
  const IMG_GESTIONE = '/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.webp';
  
  const defaultCategories: Category[] = [
    { id: 1, label: 'RELAZIONI E COMUNICAZIONE',             image: IMG_RELAZIONI },
    { id: 2, label: 'CERIMONIE E REVENUE',                   image: IMG_CERIMONIE },
    { id: 3, label: 'SPORT E DISCIPLINE',                    image: IMG_SPORT },
    { id: 4, label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: IMG_AREAORGANIZZATIVA, mobileFillLh: 40 },
    { id: 5, label: 'LOGISTICA E TERRITORIO',                image: IMG_LOGISTICA,  mobileFillLh: 40, mobileOutlineLh: 40 },
    { id: 6, label: 'GESTIONE OPERATIVA E FAN EXPERIENCE',   image: IMG_GESTIONE },
  ];

  let { categories = defaultCategories }: { categories?: Category[] } = $props();

  // ─── STATI GLOBALI E CAROSELLO ───
  let isMobile  = $state(false);
  let targetPos = $state(0);
  let isReady   = $state(false);

  // ─── PRELOAD IMMAGINI (qualità piena al primo paint) ───
  // Usiamo l'immagine originale come sul mobile (che è già nitido): il mobile
  // la mostra come sfondo 2D piatto, senza layer 3D. Le decodifichiamo del
  // tutto PRIMA di mostrarle, così la card appare già nitida senza swap.
  let decoded = $state<Record<string, boolean>>({});

  function preloadImages() {
    for (const cat of categories) {
      if (decoded[cat.image]) continue;
      const img = new Image();
      img.src = cat.image;
      const done = () => { decoded[cat.image] = true; };
      (img.decode ? img.decode() : Promise.reject()).then(done).catch(done);
    }
  }

  const N = () => categories.length;
  function mod(n: number, m: number) { return ((n % m) + m) % m; }

  // Calcola l'indice reale (0-5) basato sulla rotazione infinita
  let currentIndex = $derived(mod(targetPos, N()));

  // L'angolo di rotazione dell'intero anello CSS 3D (6 elementi = 60 gradi ciascuno)
  let ringRotation = $derived(targetPos * 60);

  // ─── NAVIGAZIONE ───
  function navigate(dir: number) {
    targetPos += dir;
  }

  function onArrowClick(dir: number, e: MouseEvent) {
    e.stopPropagation();
    navigate(dir);
  }

  // ─── DRAG "MAGNETICO" (CSS 3D) ───
  let isDragging = false;
  let dragStartX = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    // Vuoto di proposito per l'effetto magnetico
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    
    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 50) { 
      // Soglia superata: scatta la card successiva/precedente
      navigate(diff > 0 ? 1 : -1);
    } else if (Math.abs(diff) < 10) {
      // Movimento minimo: è un click, apri la pagina
      handleTitleClick();
    }
  }

  // ─── TOUCH E WHEEL (Mobile e Mouse) ───
  let touchStartY = 0;

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) navigate(dy > 0 ? 1 : -1);
  }

  let wheelAccum = 0;
  let wheelLocked = false;
  let wheelStepTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  const WHEEL_STEP    = 30;   
  const WHEEL_LOCK_MS = 1000;  

  function onWheel(e: WheelEvent) {
    e.preventDefault(); 
    if (wheelLocked) return;

    wheelAccum += e.deltaX;
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => { wheelAccum = 0; }, 140);

    if (Math.abs(wheelAccum) >= WHEEL_STEP) {
      navigate(wheelAccum > 0 ? 1 : -1);
      wheelAccum  = 0;
      wheelLocked = true;
      clearTimeout(wheelStepTimer);
      wheelStepTimer = setTimeout(() => { wheelLocked = false; wheelAccum = 0; }, WHEEL_LOCK_MS);
    }
  }

  // ─── GESTIONE DATI E TITOLI ───
  function slugifyLabel(label: string) {
    return label.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  function categorySlug(label: string) {
    switch (slugifyLabel(label)) {
      case 'relazioni-e-comunicazione': return 'relazioni';
      case 'cerimonie-e-revenue':       return 'cerimonie';
      case 'sport-e-discipline':        return 'sport';
      case 'area-organizzativa-e-servizi-generali': return 'organizzativa';
      case 'logistica-e-territorio':    return 'logistica';
      case 'gestione-operativa-e-fan-experience':   return 'gestione';
      default: return slugifyLabel(label);
    }
  }

  async function handleTitleClick() {
    const label = categories?.[currentIndex]?.label ?? '';
    const slug = categorySlug(label);
    if (slug) await goto(`/category/${slug}`);
  }

  // ─── LOGICA TESTO REATTIVO ───
  let currentLabel = $derived(categories[currentIndex]?.label ?? '');
  
  let titleLines = $derived((() => {
    const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (match) return [match[1].trim(), `E ${match[2].trim()}`].filter(Boolean);
    const words = currentLabel.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return [currentLabel];
    const splitAt = Math.max(1, Math.ceil(words.length / 2));
    return [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')].filter(Boolean);
  })());

  const HARD_BREAK: Record<string, string> = { COMUNICAZIONE: 'COMUNICA-\nZIONE' };
  const SHY = '­';
  const SOFT_HYPHENATE: Record<string, string> = { DISCIPLINE: 'DISCI' + SHY + 'PLINE', TERRITORIO: 'TERRI' + SHY + 'TORIO' };

  function processFill(text: string) { return text.replace(/[\p{L}]+/gu, (w) => SOFT_HYPHENATE[w.toUpperCase()] ?? w); }
  function processOutline(text: string) {
    return text.replace(/[\p{L}]+/gu, (w) => {
      const u = w.toUpperCase();
      return HARD_BREAK[u] ?? SOFT_HYPHENATE[u] ?? w;
    });
  }

  let mobileTitleLines = $derived.by(() => {
    const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (!match) return titleLines.map(processFill).filter(Boolean);
    const beforeE = match[1].trim();
    const afterE  = match[2].trim();
    const isSingleLongWord = !afterE.includes(' ') && afterE.length > 12;
    return isSingleLongWord
      ? [processFill(`${beforeE} E`), processOutline(afterE)]
      : [processFill(beforeE), processOutline(`E ${afterE}`)];
  });

  let currentCat = $derived(categories[currentIndex]);
  let mobileFillLh = $derived(currentCat?.mobileFillLh ?? 36);
  let mobileOutlineLh = $derived(currentCat?.mobileOutlineLh ?? 36);

  // ─── ANIMAZIONE TITOLI (come i filtri) ───
  // Ogni riga del titolo emerge da sotto la sua maschera (overflow:hidden),
  // in cascata, con la stessa curva power4.out dei label di FiltraPerCategoria.
  // Si ri-gioca a ogni cambio categoria (e al primo ingresso).
  let desktopTitleEl = $state<HTMLElement | null>(null);
  let mobileTitleEl  = $state<HTMLElement | null>(null);

  $effect(() => {
    const _ = currentIndex;                       // ri-esegui a ogni cambio card
    const el = isMobile ? mobileTitleEl : desktopTitleEl;
    if (!el) return;
    const lines = el.querySelectorAll<HTMLElement>('.title-anim');
    if (!lines.length) return;
    gsap.fromTo(
      lines,
      { yPercent: 120 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: 'power4.out',
        force3D: false,
        overwrite: true,
        stagger: { each: 0.08, from: 'start' }
      }
    );
  });

  // ─── CICLO DI VITA SVELTE ───
  beforeNavigate(() => {
    document.body.style.overflow = '';
    document.body.style.paddingTop = '';
    sessionStorage.setItem('category-pos', String(targetPos));
  });

  onMount(() => {
    preloadImages();

    const saved = sessionStorage.getItem('category-pos');
    if (saved !== null) {
     targetPos = Number(saved);
     sessionStorage.removeItem('category-pos');
    }

    // Riattiva l'animazione CSS solo dopo aver forzato la posizione statica iniziale
    setTimeout(() => {
      isReady = true;
    }, 50);

    const checkMobile = () => { isMobile = window.innerWidth < 600; };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const prev = { pt: document.body.style.paddingTop, ov: document.body.style.overflow };
    document.body.style.paddingTop = '0';
    document.body.style.overflow   = 'hidden';

    if (!isMobile) {
      window.addEventListener('wheel', onWheel, { passive: false });
    }

    return () => {
      document.body.style.paddingTop = prev.pt;
      document.body.style.overflow   = prev.ov;
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(wheelStepTimer);
      clearTimeout(wheelIdleTimer);
    };
  });
</script>

{#if isMobile}
<section class="mobile-carousel" id="main-content"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
  aria-label="Category carousel"
>
  {#key currentIndex}
    <div
      class="mobile-bg"
      style="background-image: {decoded[categories[currentIndex]?.image] ? `url('${categories[currentIndex]?.image}')` : 'none'}"
      in:fade={{ duration: 500, delay: 80 }}
      out:fade={{ duration: 400 }}
    ></div>
  {/key}

  <!-- Figma "BLUR EFFECT" — 6px backdrop blur + dark gradient, top & bottom -->
  <div class="mobile-blur mobile-blur--top" aria-hidden="true"></div>
  <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

  <!-- Title (full width, above the controls) -->
  <div class="mobile-title" bind:this={mobileTitleEl} aria-live="polite" lang="it">
    {#each mobileTitleLines as line, i}
      <span class="title-mask">
        {#if i === 0}
          <span class="title-fill title-anim" style="line-height: {mobileFillLh}px">{line}</span>
        {:else}
          <span class="title-outline title-anim" style="line-height: {mobileOutlineLh}px">{line}</span>
        {/if}
      </span>
    {/each}
  </div>

  <!-- Scopri di più (bottom-left) -->
  <a class="scopri-btn" href="/category/{categorySlug(currentLabel)}">SCOPRI DI PIÙ</a>

  <!-- Vertical arrows (bottom-right) -->
  <div class="mobile-nav-circles">
    <ArrowButton direction="up" onclick={() => navigate(-1)} />
    <ArrowButton direction="down" onclick={() => navigate(1)} />
  </div>
</section>

{:else}
<section class="carousel" id="main-content"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
  aria-label="Category carousel"
>
  <div class="stage">
    <div class="container-3d">
      <div class="ring" class:ready={isReady} style="transform: translateZ(var(--camera-z)) rotateY({ringRotation}deg);">
        {#each categories as cat, i}
          {@const isActive = currentIndex === i}
          <div 
            class="card-3d" 
            class:active={isActive}
            style="transform: rotateY({i * -60}deg) translateZ(var(--card-radius));"
            role="button"
            tabindex={isActive ? 0 : -1}
            aria-current={isActive ? 'true' : undefined}
            onclick={() => { if(isActive) handleTitleClick() }}
            onkeydown={(e) => { if (e.key === 'Enter' && isActive) handleTitleClick(); }}
          >
            <div class="card-image" class:loaded={decoded[cat.image]} style="background-image: url('{cat.image}');"></div>
            <div class="card-overlay"></div>
          </div>
        {/each}
      </div>
    </div>
  </div>

<div class="progressive-blur-overlay" aria-hidden="true"></div>

<div class="arrow-left" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="left" onclick={(e) => onArrowClick(-1, e)} />
  </div>

  <div class="arrow-right" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="right" onclick={(e) => onArrowClick(1, e)} />
  </div>

  <div class="curve-frame" aria-hidden="true">
    <svg class="curve curve-top" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
    </svg>
    <svg class="curve curve-bottom" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
    </svg>
  </div>

  <div class="bottom-bar">
    <div class="title" bind:this={desktopTitleEl} aria-live="polite" role="button" tabindex="0"
      class:category-sport={categorySlug(currentLabel) === 'sport'}
      onclick={handleTitleClick}
      onkeydown={(e) => { if (e.key === 'Enter') handleTitleClick(); }}>
      {#each titleLines as line, index}
        <span class="title-mask">
          {#if index === 0}
            <span class="title-fill title-anim">{line}</span>
          {:else}
            <span class="title-outline title-anim">{line}</span>
          {/if}
        </span>
      {/each}
    </div>
  </div>
</section>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }
  /*NUOVI STILI GEMINI */
  /* ─── CSS 3D CAROUSEL ─── */
  /* ─── CSS 3D CAROUSEL ─── */
  .stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1; 
    /* Variabili rimosse da qui */
  }

  .container-3d {
    perspective: var(--camera-z);
    /* Scena costruita a --ss× e riportata alla dimensione visiva con scale(1/ss):
       la proiezione è identica (similitudine), ma la rasterizzazione avviene a
       --ss× → card nitide. La maschera del blur usa --card-width (visivo) e non
       è dentro questo container, quindi resta invariata. */
    width: calc(var(--card-width) * var(--ss));
    transform: scale(calc(1 / var(--ss)));
    transform-origin: center center;

    aspect-ratio: 1 / 1;
  }
  .ring {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: none; /* Animazione disattivata di base al momento del mount */
  }

  .ring.ready {
    /* La transizione si attiva solo quando la pagina è caricata, per i successivi click */
    /* 0.85s e una curva ease-out-cubic per una decelerazione prolungata */
    transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
    /* NIENTE will-change: transform qui. Promuovere il ring lo blocca in una
       texture compositor rasterizzata a bassa risoluzione, che il browser
       ri-rasterizza nitida solo quando il ring è fermo → l'immagine "si
       ricarica" nitida dopo un istante (più visibile ad alta densità). Senza
       promozione permanente le card si rasterizzano nitide come lo sfondo 2D
       del mobile. */
  }


  .card-3d {
    position: absolute;
    inset: 0;
    border-radius: 4px; /* Il raggio che volevi */
    overflow: hidden;
    /* Nessun filtro CSS qui: le laterali sono scurite dal .card-overlay.
       Un `filter` (anche grayscale(0%), che è un no-op) forzerebbe la card
       in un buffer offscreen rasterizzato a pixel CSS invece che a pixel
       device → immagini sfocate su schermi ad alta densità. */
    transition: transform 0.85s ease, box-shadow 0.85s ease;

    pointer-events: none; /* Disabilita il click sulle card laterali */
    cursor: pointer;
  }

  .card-image {
    width: 100%;
    height: 100%;
    background-size: cover;
    /* Hidden until the (huge) source webp is fully decoded — see preloadImages().
       Prevents the low-quality first paint that then "reloads" sharper: the card
       fades in already at full quality. */
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .card-image.loaded {
    opacity: 1;
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5); /* Scurisce le laterali */
    transition: background 0.85s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* ─── STATO ATTIVO (Card Centrale) ─── */
  .card-3d.active {
    pointer-events: auto; /* Rende cliccabile solo quella al centro */
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    z-index: 10;
  }

  .card-3d.active .card-overlay {
    background: rgba(0, 0, 0, 0); /* Rimuove l'oscuramento */
  }


  /* ─── LENTE DI SFOCATURA PROGRESSIVA ─── */
  .progressive-blur-overlay {
    position: absolute;
    inset: 0;
    z-index: 5; 
    pointer-events: none; 
    
    backdrop-filter: blur(15px) saturate(0.85);
    -webkit-backdrop-filter: blur(15px) saturate(0.85);

    /* Area centrale trasparente allargata (da 0.55 a 0.8) 
       e gradiente riadattato proporzionalmente verso l'esterno */
    mask-image: linear-gradient(
      to right,
      #000 0%,
      #000 calc(50% - var(--card-width) * 1.6),
      rgba(0, 0, 0, 0.8) calc(50% - var(--card-width) * 1.3),
      rgba(0, 0, 0, 0.3) calc(50% - var(--card-width) * 1.05),
      transparent calc(50% - var(--card-width) * 0.8),
      transparent calc(50% + var(--card-width) * 0.8),
      rgba(0, 0, 0, 0.3) calc(50% + var(--card-width) * 1.05),
      rgba(0, 0, 0, 0.8) calc(50% + var(--card-width) * 1.3),
      #000 calc(50% + var(--card-width) * 1.6),
      #000 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      #000 0%,
      #000 calc(50% - var(--card-width) * 1.6),
      rgba(0, 0, 0, 0.8) calc(50% - var(--card-width) * 1.3),
      rgba(0, 0, 0, 0.3) calc(50% - var(--card-width) * 1.05),
      transparent calc(50% - var(--card-width) * 0.8),
      transparent calc(50% + var(--card-width) * 0.8),
      rgba(0, 0, 0, 0.3) calc(50% + var(--card-width) * 1.05),
      rgba(0, 0, 0, 0.8) calc(50% + var(--card-width) * 1.3),
      #000 calc(50% + var(--card-width) * 1.6),
      #000 100%
    );
  }


  /*------------------*/

  .carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary);
    overflow: hidden;
    cursor: grab;
    user-select: none;
    touch-action: none;
    
    /* ── MATEMATICA RESPONSIVA GLOBALE ── */
    /* Card più stretta: 26vw invece di 35vw, tetto massimo a 420px */
    --card-width: clamp(240px, 26vw, 420px);

    /* ── SUPERSAMPLING ANTI-SFOCATURA ──
       La prospettiva 3D ingrandisce la card centrale ~3,3× rispetto alla sua
       dimensione CSS: il browser rasterizza lo sfondo alla dimensione di layout
       e poi la GPU lo INGRANDISCE 3,3× → immagine morbida (più visibile sui
       portatili < 16", dove 26vw dà una card CSS più piccola = meno pixel reali
       da ingrandire). Costruiamo quindi la scena a --ss× e la rimpiccioliamo di
       1/--ss su .container-3d: ogni card viene rasterizzata al doppio della
       risoluzione PRIMA che la prospettiva la ingrandisca → resta nitida. */
    --ss: 2;

    /* Il raggio si adatta automaticamente (in scala di scena) */
    --card-radius: calc(var(--card-width) * var(--ss) * -0.86);

    /* Telecamera leggermente più lontana (* 2.8) per vedere meglio i lati */
    --camera-z: calc(var(--card-width) * var(--ss) * 2.8);
  }
  .carousel:active { cursor: grabbing; }

  .carousel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 5%, rgba(0, 0, 0, 0) 18%, rgba(0, 0, 0, 0.18) 100%);
    pointer-events: none;
    z-index: 1;
  }

   .arrow-left {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: var(--spacing-5);
    z-index: 12;
  }
  .arrow-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: var(--spacing-5);
    z-index: 12;
  }

  

  .curve-frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }

  .curve {
    position: absolute;
    left: 0;
    width: 100%;
    fill: var(--color-background-primary);
  }

  .curve-top {
    top: 0;
    height: clamp(120px, 30vh, 260px);
  }

  .curve-bottom {
    bottom: 0;
    height: clamp(110px, 28vh, 240px);
  }

  /* ── bottom UI ───────────────────────────────────────── */
  .bottom-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    /* py-[spacing/4-2, 20px] from Figma — no horizontal padding, rows handle their own indent */
    padding: var(--spacing-4-2) 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none;
  }

  .title {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px);
    font-weight: 800;
    font-style: normal;
    text-transform: uppercase;
    /* Figma h1 style: letterSpacing: 0 */
    letter-spacing: 0;
    /* Figma: leading-[unit/116] = 1:1 with font size */
    line-height: 1;
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: auto;
    cursor: pointer;
    overflow: visible;
  }

  /* Clip mask per l'entrata dei titoli: ogni riga scorre su da sotto la
     maschera (come i label di FiltraPerCategoria). overflow:hidden nasconde
     la riga finché non emerge; vale sia desktop (.title) che mobile
     (.mobile-title). */
  .title-mask {
    display: block;
    overflow: hidden;
  }

  .title-fill {
    color: var(--color-content-accent);
    display: block;
    white-space: nowrap;
    /* Figma: Filled row px-[spacing/11, 72px] */
    margin-left: var(--spacing-11);
    /* Figma: mb-[-8px] on filled row creates overlap with outline */
    margin-bottom: -8px;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    display: block;
    white-space: nowrap;
    /* Figma: Outline row px-[spacing/17, 340px] — 340px at 1728px viewport */
    margin-left: clamp(var(--spacing-11), calc(var(--spacing-17) / max(var(--page-zoom, 1), 0.65)), 580px);
  }

  /* SPORT: shorter first word, keep distinct stagger */
  .title.category-sport .title-fill {
    margin-left: clamp(var(--spacing-4), 5vw, var(--spacing-11));
  }
  .title.category-sport .title-outline {
    margin-left: clamp(var(--spacing-8), 24.5vw, 340px);
  }

  /* ── Prevent title text overflow on very narrow viewports ───────── */
  @media (max-width: 700px) {
    .title-fill,
    .title-outline {
      white-space: normal;
      word-break: break-word;
    }
    .title-outline {
      margin-left: var(--spacing-11);
    }
    .title.category-sport .title-outline {
      margin-left: var(--spacing-8);
    }
    /* Mobile title lives inside .mobile-title, not .title — reset stagger */
    .mobile-title .title-fill,
    .mobile-title .title-outline {
      margin-left: 0;
    }
  }

  /* ── Arrow safe-area positioning ───────────────────────────────── */
  @media (min-width: 768px) {
    .arrow-left  { left:  var(--spacing-8); }
    .arrow-right { right: var(--spacing-8); }
  }
  @media (min-width: 1024px) {
    .arrow-left  { left:  var(--spacing-11); }
    .arrow-right { right: var(--spacing-11); }
  }


  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .title-fill,
    .title-outline {
      transition: none;
    }
  }

  /* ================================================================
   * MOBILE CAROUSEL  (≤ 599px)
   * ================================================================ */

  .mobile-carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary);
    overflow: hidden;
  }

  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* ── Figma "BLUR EFFECT": 6px backdrop blur + dark gradient ──────
     Top band darkens behind the navbar; bottom band fades the image
     into solid #0e0e0e so the title/controls stay legible. The mask
     feathers the blur so it dissolves toward the sharp middle. */
  .mobile-blur {
    position: absolute;
    left: 0;
    right: 0;
    height: 44%;            /* 388 / 874 from Figma */
    pointer-events: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mobile-blur--top {
    top: 0;
    background: linear-gradient(180deg, rgba(14, 14, 14, 0.35) 0%, rgba(14, 14, 14, 0) 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
            mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
  }

  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(
      0deg,
      rgba(14, 14, 14, 1)    0%,
      rgba(14, 14, 14, 1)    28%,
      rgba(14, 14, 14, 0.7) 50%,
      rgba(14, 14, 14, 0)    100%
    );
    -webkit-mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
            mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
  }

  /* ── Title — Figma "Title Container": bottom 87, py 32, px 24 ──── */
  .mobile-title {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 87px;
    padding: var(--spacing-6) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: none;
    z-index: 3;
  }

  /* Figma: Forma DJR Display ExtraBold · 43px · line-height 36px · w 352 */
  .mobile-title .title-fill {
    font-family: var(--font-display);
    font-size: 43px;
    font-style: normal;
    font-weight: 800;
    line-height: 36px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: normal;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  /* Figma: -webkit-text-stroke 2px #bdff5d */
  .mobile-title .title-outline {
    font-family: var(--font-display);
    font-size: 43px;
    font-style: normal;
    font-weight: 800;
    line-height: 36px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: pre-line;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  /* ── Scopri di più — Figma: bottom 36, left 24, width 238 ─────── */
  .scopri-btn {
    position: absolute;
    left: var(--spacing-5);
    bottom: var(--unit-36);
    width: 238px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4) 0;
    border: 2px solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill, 999px);
    background: var(--color-background-primary);
    color: var(--color-link-default);
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    z-index: 4;
    transition: background 220ms ease, box-shadow 220ms ease;
  }

  .scopri-btn:hover,
  .scopri-btn:focus-visible {
    background: rgba(189, 255, 93, 0.08);
  }

  /* ── Vertical arrows — Figma: bottom 36, right 24, gap 24 ──────── */
  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5);
    bottom: var(--unit-36);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    z-index: 4;
  }


</style>
