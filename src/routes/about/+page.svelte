<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { gsap } from 'gsap';
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';
  import ScopriDiPiuButton from '$lib/components/buttons/ScopriDiPiuButton.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';

  import '$lib/styles/reset.css';
  import '$lib/styles/tokens.css';
  import '$lib/styles/base.css';
  import '$lib/styles/utilities.css';

  type Volunteer = {
    id: number;
    name: string;
    role: string;
    subtitle: string;
    image: string;
    slug?: string;
  };

  const VOLUNTEER_1 = '/volunteer_images/foto_team/claudia.png';
  const VOLUNTEER_2 = '/volunteer_images/foto_team/serena.png';
  const VOLUNTEER_3 = '/volunteer_images/foto_team/greta.png';
  const VOLUNTEER_4 = '/volunteer_images/foto_team/matilde.png';
  const VOLUNTEER_5 = '/volunteer_images/foto_team/viola.png';
  const VOLUNTEER_6 = '/volunteer_images/foto_team/laura.png';

  const defaultVolunteers: Volunteer[] = [
    {
      id: 1,
      name: 'SOLIDORO CLAUDIA IRENE',
      role: 'UX – UI DESIGNER E CODE REVIEWER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_1,
      slug: 'solidoro-claudia-irene'
    },
    {
      id: 2,
      name: 'SERENA SERAFINI',
      role: 'FRONTEND DEVELOPER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_2
    },
    {
      id: 3,
      name: 'GRETA FRANCO',
      role: 'UX – UI DESIGNER E CONCEPT DESIGNER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_3
    },
    {
      id: 4,
      name: 'MATILDE CURINO',
      role: 'UX – UI DESIGNER E CODE REVIEWER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_4
    },
    {
      id: 5,
      name: 'VIOLA NALDI',
      role: 'UX – UI DESIGNER E FIELD RESEARCHER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_5,
      slug: 'naldi-viola'
    },
    {
      id: 6,
      name: 'LAURA MAGONI',
      role: 'UX – UI DESIGNER E CONCEPT DESIGNER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_6
    },
  ];

  let { volunteers = defaultVolunteers }: { volunteers?: Volunteer[] } = $props();

  // ── Intro: carosello testuale (COS'È FUORI CAMPO? …) ──────────────
  const introSlides = [
    {
      titleTop: 'COS’È',
      titleBottom: 'FUORI CAMPO?',
      body: 'Fuori Campo è un archivio delle esperienze dei volontari di Milano Cortina 2026: un invito a scoprire il loro lavoro, spesso nascosto o dato per scontato, i ricordi e le fotografie che hanno scelto di condividere.'
    },
    {
      titleTop: 'QUAL È',
      titleBottom: 'L’OBBIETTIVO?',
      body: 'Raccontare le Olimpiadi e le Paralimpiadi attraverso gli occhi dei volontari e sensibilizzare il pubblico sul tema, ispirando chiunque desideri, in futuro, vivere l’esperienza del volontariato sportivo.'
    },
    {
      titleTop: 'COME È NATO',
      titleBottom: 'FUORICAMPO?',
      body: 'Fuori Campo è un progetto nato dal Laboratorio di Web e Digital Design del secondo anno triennale del corso di Design della Comunicazione al Politecnico di Milano.'
    }
  ];

  let introIndex = $state(0);
  let currentSlide = $derived(introSlides[introIndex]);

  function introNext() {
    introIndex = (introIndex + 1) % introSlides.length;
  }

  function introPrev() {
    introIndex = (introIndex - 1 + introSlides.length) % introSlides.length;
  }

  // ── Element refs for the "rise from bottom" reveals ───────────────
  let introSlideEl:   HTMLElement | null = $state(null);
  let chiTitleEl:     HTMLElement | null = $state(null);
  let volInfoBlockEl: HTMLElement | null = $state(null);
  let mobileInfoEl:   HTMLElement | null = $state(null);

  // ── Carosello volontari (stesso motore CSS-3D della pagina categoria) ──
  let isMobile  = $state(false);
  let targetPos = $state(0);
  let isReady   = $state(false);
  let carouselEl: HTMLElement | null = $state(null);

  const N = () => volunteers.length;
  function mod(n: number, m: number) { return ((n % m) + m) % m; }

  const CARD_ANGLE = () => 360 / N();

  let currentIndex = $derived(mod(targetPos, N()));
  let ringRotation = $derived(targetPos * CARD_ANGLE());
  let currentVolunteer = $derived(volunteers[currentIndex]);
  // Nome su massimo due righe: cognome sopra, nomi sotto (es. SOLIDORO / CLAUDIA IRENE).
  let nameLines = $derived.by(() => {
    const words = currentVolunteer?.name?.split(' ').filter(Boolean) ?? [];
    if (words.length <= 1) return words;
    return [words[0], words.slice(1).join(' ')];
  });
  // Ruolo su due righe: spezza sulla congiunzione " E " (es. UX – UI DESIGNER / E CODE REVIEWER).
  let roleLines = $derived.by(() => {
    const role = currentVolunteer?.role ?? '';
    const idx = role.indexOf(' E ');
    if (idx === -1) return role ? [role] : [];
    return [role.slice(0, idx), role.slice(idx + 1)];
  });

  // ── Preload immagini a piena qualità (come categoria) ─────────────
  let decoded = $state<Record<string, boolean>>({});

  function preloadImages() {
    for (const vol of volunteers) {
      if (decoded[vol.image]) continue;
      const img = new Image();
      img.src = vol.image;
      const done = () => { decoded[vol.image] = true; };
      (img.decode ? img.decode() : Promise.reject()).then(done).catch(done);
    }
  }

  // ── Navigazione ───────────────────────────────────────────────────
  function navigate(dir: number) {
    targetPos += dir;
  }

  function onArrowClick(dir: number, e: MouseEvent) {
    e.stopPropagation();
    navigate(dir);
  }

  // ── Drag "magnetico" (CSS 3D) ─────────────────────────────────────
  let isDragging = false;
  let dragStartX = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(_e: PointerEvent) {
    // Volutamente vuoto: lo scatto avviene al rilascio (effetto magnetico).
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;

    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 50) {
      navigate(diff > 0 ? 1 : -1);
    } else if (Math.abs(diff) < 10) {
      handleTitleClick();
    }
  }

  // ── Touch (mobile) ────────────────────────────────────────────────
  let touchStartY = 0;

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) navigate(dy > 0 ? 1 : -1);
  }

  async function handleTitleClick() {
    const volunteer = volunteers[currentIndex];
    if (volunteer?.slug) {
      await goto(`/volunteer/${volunteer.slug}/profile`);
    }
  }

  // ── Scroll lock: solo su mobile (il carosello è fixed fullscreen) ──
  // Guard SSR: onDestroy gira anche sul server (dopo il render) e lì `document`
  // non esiste → senza guardia la pagina /about va in errore 500 al load diretto.
  function unlockAboutPageScroll() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('padding-top');
  }

  function lockAboutMobileScroll() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingTop = '0';
  }

  beforeNavigate(() => {
    unlockAboutPageScroll();
  });

  onMount(() => {
    preloadImages();

    const checkMobile = () => { isMobile = window.innerWidth < 600; };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    unlockAboutPageScroll();
    document.body.style.paddingTop = '0';

    // Mobile: carosello fixed fullscreen → blocca lo scroll.
    // Desktop: la pagina scorre (intro + titolo), il carosello è sticky.
    if (isMobile) {
      lockAboutMobileScroll();
    }

    // Attiva la transizione del ring solo dopo il primo paint statico.
    setTimeout(() => { isReady = true; }, 50);

    return () => {
      unlockAboutPageScroll();
      window.removeEventListener('resize', checkMobile);
    };
  });

  onDestroy(() => {
    unlockAboutPageScroll();
  });

  // ── Helper: entrata "dal basso" da dietro la maschera (overflow:hidden).
  //    yPercent 120 → 0 con power4.out: risale netto e si ferma senza coda.
  function riseIn(els: ArrayLike<Element>, delay = 0) {
    const list = Array.from(els);
    if (!list.length) return;
    // Rise + una leggera sfocatura in entrata: il titolo e il corpo risalgono
    // da dietro la maschera mentre passano da blur(8px) a nitido. Si termina a
    // blur(0px) SENZA clearProps — rimuovere il filtro ri-rasterizza e fa
    // "saltare" il testo di ~1px (stesso accorgimento del reveal dell'hero).
    gsap.fromTo(
      list,
      { yPercent: 120, filter: 'blur(8px)' },
      {
        yPercent: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power4.out',
        force3D: false,
        overwrite: true,
        delay,
        stagger: { each: 0.08, from: 'start' }
      }
    );
  }

  // Reveal "dal basso" del titolo CHI C'È DIETRO (una volta, prima del paint).
  $effect(() => {
    if (!chiTitleEl) return;
    riseIn(chiTitleEl.querySelectorAll('.rise'), 0.12);
  });

  // Blur-reveal puro (senza risalita): il testo compare passando da
  // blur(10px)/opacity 0 a nitido. Usato per il corpo dell'intro.
  function blurRevealIn(els: ArrayLike<Element>, delay = 0.12) {
    const list = Array.from(els);
    if (!list.length) return;
    gsap.fromTo(
      list,
      { opacity: 0, filter: 'blur(10px)' },
      {
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power2.out',
        overwrite: true,
        delay
      }
    );
  }

  // Reveal dell'intro ad ogni cambio slide: titolo "dal basso", corpo in blur.
  $effect(() => {
    const _trigger = introIndex;
    if (!introSlideEl) return;
    riseIn(introSlideEl.querySelectorAll('.rise'));
    blurRevealIn(introSlideEl.querySelectorAll('.blur-reveal'));
  });

  // Reveal delle info volontario ad ogni cambio card.
  $effect(() => {
    const _trigger = currentIndex;
    const root = volInfoBlockEl ?? mobileInfoEl;
    if (!root) return;
    riseIn(root.querySelectorAll('.rise'));
  });

  // ── Aggancio del riquadro info alla card centrale 3D ──────────────
  // La prospettiva ingrandisce la card centrale di un fattore che dipende da
  // camera/raggio (~3,26×). Invece di fidarci del solo valore analitico
  // (--card-projection), misuriamo la card attiva già proiettata a schermo
  // (getBoundingClientRect tiene conto delle trasformazioni 3D) e portiamo
  // esattamente quelle dimensioni in --center-w/--center-h, così il testo resta
  // agganciato all'angolo in basso a sinistra dell'immagine a ogni larghezza.
  function measureCenterCard() {
    if (typeof document === 'undefined' || !carouselEl) return;
    const active = carouselEl.querySelector<HTMLElement>('.card-3d.active');
    if (!active) return;
    const rect = active.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      carouselEl.style.setProperty('--center-w', `${rect.width}px`);
      carouselEl.style.setProperty('--center-h', `${rect.height}px`);
    }
  }

  $effect(() => {
    // Ri-misura quando il carosello è montato (desktop) e a ogni resize.
    // currentIndex non cambia la geometria (la card finisce sempre centrata),
    // ma lo teniamo come dipendenza per ri-misurare dopo eventuali re-render.
    const _trigger = currentIndex;
    if (isMobile || !carouselEl) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measureCenterCard);
    };
    schedule();
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
    };
  });
</script>

<svelte:head>
  <link rel="preload" as="image" href={VOLUNTEER_1} />
  <link rel="preload" as="image" href={VOLUNTEER_2} />
  <link rel="preload" as="image" href={VOLUNTEER_6} />
</svelte:head>

<main class="about-page">

  <!-- ══════════════════════════════════════════════════════════════
       INTRO — carosello testuale (COS'È FUORI CAMPO? …)
  ══════════════════════════════════════════════════════════════ -->
  <section class="intro safe-area">
    {#key introIndex}
      <div class="intro-slide" bind:this={introSlideEl}>
        <h1 class="section-title">
          <span class="rise-mask"><span class="title-outline rise">{currentSlide.titleTop}</span></span>
          <span class="rise-mask"><span class="title-fill rise">{currentSlide.titleBottom}</span></span>
        </h1>

        <div class="intro-body-mask">
          <p class="intro-body blur-reveal">{currentSlide.body}</p>
        </div>
      </div>
    {/key}

    <div class="dot-frecce">
      <div class="dot-nav" aria-label="Slide introduttive">
        {#each introSlides as _slide, i}
          <button
            type="button"
            class="dot"
            class:dot--active={i === introIndex}
            aria-label={`Vai alla slide ${i + 1}`}
            aria-pressed={i === introIndex}
            onclick={() => (introIndex = i)}
          ></button>
        {/each}
      </div>

      <div class="frecce" aria-label="Navigazione slide">
        <ArrowButton direction="left" ariaLabel="Slide precedente" onclick={introPrev} />
        <ArrowButton direction="right" ariaLabel="Slide successiva" onclick={introNext} />
      </div>
    </div>
  </section>

  <!-- ══════════════════════════════════════════════════════════════
       CHI C'È DIETRO FUORICAMPO?
  ══════════════════════════════════════════════════════════════ -->
  <section class="chi-section safe-area">
    <h2 class="section-title" bind:this={chiTitleEl}>
      <span class="rise-mask"><span class="title-outline rise">CHI C’È DIETRO</span></span>
      <span class="rise-mask"><span class="title-fill rise">FUORICAMPO?</span></span>
    </h2>
  </section>

  <!-- ══════════════════════════════════════════════════════════════
       MOBILE — carosello a schermo intero
  ══════════════════════════════════════════════════════════════ -->
  {#if isMobile}
    <section
      class="mobile-carousel"
      id="main-content"
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
      aria-label="Volunteer carousel"
    >
      {#key currentIndex}
        <div
          class="mobile-bg"
          style="background-image: url('{volunteers[currentIndex]?.image}')"
          in:fade={{ duration: 500, delay: 80 }}
          out:fade={{ duration: 400 }}
        ></div>
      {/key}

      <div class="mobile-blur mobile-blur--top" aria-hidden="true"></div>
      <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

      <div class="mobile-info" bind:this={mobileInfoEl}>
        <span class="rise-mask"><span class="vol-subtitle rise">{currentVolunteer?.subtitle}</span></span>

        <div class="vol-role-lines">
          {#each roleLines as rline}
            <span class="rise-mask"><span class="vol-role rise">{rline}</span></span>
          {/each}
        </div>

        <div class="vol-name-lines">
          {#each nameLines as line}
            <span class="rise-mask"><span class="vol-name-word rise">{line}</span></span>
          {/each}
        </div>
      </div>

      <div class="scopri-mobile-wrap">
        <ScopriDiPiuButton dark onclick={handleTitleClick} />
      </div>

      <div class="mobile-nav-circles">
        <ArrowButton direction="up" onclick={() => navigate(-1)} />
        <ArrowButton direction="down" onclick={() => navigate(1)} />
      </div>
    </section>

  <!-- ══════════════════════════════════════════════════════════════
       DESKTOP — carosello ad anello CSS-3D (come categoria)
  ══════════════════════════════════════════════════════════════ -->
  {:else}
    <section
      class="carousel"
      id="main-content"
      bind:this={carouselEl}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointerleave={onPointerUp}
      aria-label="Volunteer carousel"
    >
      <div class="stage">
        <div class="container-3d">
          <div class="ring" class:ready={isReady} style="transform: translateZ(var(--camera-z)) rotateY({ringRotation}deg);">
            {#each volunteers as vol, i}
              {@const isActive = currentIndex === i}
              <div
                class="card-3d"
                class:active={isActive}
                style="transform: rotateY({i * -CARD_ANGLE()}deg) translateZ(var(--card-radius));"
                role="button"
                tabindex={isActive ? 0 : -1}
                aria-current={isActive ? 'true' : undefined}
                onclick={() => { if (isActive) handleTitleClick(); }}
                onkeydown={(e) => { if (e.key === 'Enter' && isActive) handleTitleClick(); }}
              >
                <div class="card-image" class:loaded={decoded[vol.image]} style="background-image: url('{vol.image}');"></div>
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

      <!-- Info volontario sovrapposte alla card centrale (layout Figma) -->
      <div class="vol-overlay" aria-live="polite">
        <div class="vol-card">
          {#if currentVolunteer?.slug}
            <div class="vol-scopri" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
              <ScopriDiPiuButton dark href="/volunteer/{currentVolunteer.slug}/profile" />
            </div>
          {/if}

          <div class="vol-card-fade" aria-hidden="true"></div>

          <div
            class="vol-info-block"
            bind:this={volInfoBlockEl}
            role="button"
            tabindex="0"
            onpointerdown={(e) => e.stopPropagation()}
            onclick={handleTitleClick}
            onkeydown={(e) => { if (e.key === 'Enter') handleTitleClick(); }}
          >
            <span class="rise-mask"><span class="vol-subtitle rise">{currentVolunteer?.subtitle}</span></span>

            <div class="vol-role-lines">
              {#each roleLines as rline}
                <span class="rise-mask"><span class="vol-role rise">{rline}</span></span>
              {/each}
            </div>

            <div class="vol-name-lines">
              {#each nameLines as line}
                <span class="rise-mask"><span class="vol-name-word rise">{line}</span></span>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

</main>

<SiteFooter />

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary, #0e0e0e);
  }

  /* ── Page shell ─────────────────────────────────────────────── */
  .about-page {
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* ── Section titles (COS'È… / CHI C'È DIETRO…) ─────────────────── */
  .section-title {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .title-outline,
  .title-fill {
    font-family: var(--font-display);
    font-size: var(--ts-scrollitelling-size);
    font-weight: var(--ts-scrollitelling-weight);
    line-height: var(--ts-scrollitelling-line-height);
    letter-spacing: var(--ts-scrollitelling-letter-spacing);
    text-transform: uppercase;
    display: block;
    white-space: nowrap;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
  }

  .title-fill {
    color: var(--color-content-accent, #bdff5d);
    margin-top: -0.05em;
  }

  /* Maschera per l'entrata "dal basso": la riga risale da dietro il clip. */
  .rise-mask {
    display: block;
    overflow: hidden;
    padding-top: 0.06em; /* spazio per gli ascendenti mentre risalgono */
  }

  /* ── Intro: sezione carosello testuale ─────────────────────────── */
  .intro {
    display: flex;
    flex-direction: column;
    padding-top: 170px;
    padding-bottom: clamp(24px, 4vh, 48px);
    overflow-x: hidden;
  }

  .intro-slide {
    display: flex;
    flex-direction: column;
  }

  .intro-body-mask {
    margin-top: clamp(24px, 3.5vh, 47px);
    margin-left: auto;
    width: min(78%, 1290px);
  }

  .intro-body {
    margin: 0;
    padding-top: 47px;
    font-family: var(--font-display);
    font-size: clamp(28px, 3.9vw, 56px);
    font-weight: 500;
    line-height: 1;
    text-align: right;
    color: var(--color-content-body, #fafafa);
  }

  /* ── Controlli carosello testuale: dot a sinistra, frecce a destra.
     Stessa struttura/stile della pagina categoria per coerenza. ─── */
  .dot-frecce {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    width: min(100%, 782px);
    margin-top: clamp(24px, 3.5vh, 40px);
  }

  .dot-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .dot {
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    width: var(--unit-16);
    height: var(--unit-16);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dot::before {
    content: '';
    display: block;
    width: var(--unit-16);
    height: var(--unit-16);
    border-radius: 50%;
    background: rgba(189, 255, 93, 0.3);
    transition: background 220ms ease, box-shadow 220ms ease;
  }

  .dot:hover::before {
    background: rgba(189, 255, 93, 0.6);
  }

  .dot.dot--active::before {
    background: var(--color-content-accent);
  }

  .frecce {
    display: flex;
    align-items: center;
    gap: var(--unit-20);
  }

  /* ── Sezione "CHI C'È DIETRO FUORICAMPO?" ──────────────────────── */
  .chi-section {
    padding-top: clamp(48px, 9vh, 78px);
    padding-bottom: clamp(24px, 4vh, 50px);
    overflow-x: hidden;
  }

  /* ══════════════════════════════════════════════════════════════════
     CAROSELLO TEAM — anello CSS-3D (stesso motore di /category)
  ══════════════════════════════════════════════════════════════════ */
  .carousel {
    /* Desktop: la pagina scorre, il carosello si "aggancia" a schermo intero */
    position: sticky;
    top: 0;
    width: 100%;
    height: 100vh;
    flex-shrink: 0;
    background: var(--color-background-primary);
    overflow: hidden;
    cursor: grab;
    user-select: none;
    touch-action: none;

    /* ── Anello CSS-3D (stesso motore di /category), card ~foto team ──
       La card centrale ha le proporzioni delle foto (558×583) ed è molto più
       piccola di quella categoria: nel Figura /about occupa ~30% della
       larghezza, non a piena grandezza. --card-width è l'UNICA leva della
       dimensione: la prospettiva ingrandisce la card ~3,26×, quindi la card
       visibile ≈ --card-width × 3,26. Telecamera, raggio, blur laterale e
       riquadro info scalano tutti da qui — nudge solo questa riga per la size.
       (Categoria usa clamp(240px, 26vw, 420px) ≈ card grande a piena altezza.) */
    --card-width: clamp(115px, 9.9vw, 195px);
    --ss: 2;
    --card-radius: calc(var(--card-width) * var(--ss) * -0.86);
    --camera-z: calc(var(--card-width) * var(--ss) * 2.8);

    /* Dimensione proiettata a schermo della card centrale: la prospettiva la
       ingrandisce ~3,26× rispetto alla sua dimensione CSS. Serve a dimensionare
       il riquadro delle info (.vol-card) così che il testo resti agganciato
       all'angolo in basso a sinistra dell'immagine. */
    --card-projection: 3.256;
    --center-w: calc(var(--card-width) * var(--card-projection));
    --center-h: calc(var(--center-w) * 583 / 558);
  }
  .carousel:active { cursor: grabbing; }

  .carousel::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 5%,
      rgba(0, 0, 0, 0) 18%,
      rgba(0, 0, 0, 0.18) 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  .stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  /* ── Anello CSS-3D (stesso motore di /category) ── */
  .container-3d {
    perspective: var(--camera-z);
    /* Scena costruita a --ss× e riportata alla dimensione visiva con scale(1/ss):
       la card viene rasterizzata al doppio della risoluzione prima che la
       prospettiva la ingrandisca → resta nitida. */
    width: calc(var(--card-width) * var(--ss));
    transform: scale(calc(1 / var(--ss)));
    transform-origin: center center;
    /* Rapporto identico alle foto team (558×583): la card ha le stesse
       proporzioni dell'immagine, così `cover` la riempie senza ritagliarla. */
    aspect-ratio: 558 / 583;
  }

  .ring {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: none;
  }

  .ring.ready {
    transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .card-3d {
    position: absolute;
    inset: 0;
    border-radius: 4px;
    overflow: hidden;
    transition: transform 0.85s ease, box-shadow 0.85s ease;
    pointer-events: none;
    cursor: pointer;
  }

  .card-image {
    width: 100%;
    height: 100%;
    /* `contain` (non `cover`): la foto è mostrata intera, mai ritagliata. La
       card ha già le proporzioni dell'immagine (558/583), quindi non compaiono
       bande — ma `contain` garantisce l'assenza di crop anche con arrotondamenti. */
    background-size: contain;
    background-position: center;
    background-color: var(--color-background-primary, #0e0e0e);
    /* Nascosta finché la sorgente non è decodificata (vedi preloadImages):
       la card compare già a piena qualità. */
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

  .card-3d.active {
    pointer-events: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  .card-3d.active .card-overlay {
    background: rgba(0, 0, 0, 0);
  }

  /* ── Lente di sfocatura progressiva ai lati ── */
  .progressive-blur-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;

    backdrop-filter: blur(15px) saturate(0.85);
    -webkit-backdrop-filter: blur(15px) saturate(0.85);

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

  /* ── Frecce laterali ── */
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

  @media (min-width: 768px) {
    .arrow-left  { left:  var(--spacing-8); }
    .arrow-right { right: var(--spacing-8); }
  }
  @media (min-width: 1024px) {
    .arrow-left  { left:  var(--spacing-11); }
    .arrow-right { right: var(--spacing-11); }
  }

  /* ── Maschere curve alto/basso ── */
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

  /* ── Info volontario sovrapposte alla card centrale ── */
  .vol-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .vol-card {
    position: relative;
    width: var(--center-w);
    height: var(--center-h);
  }

  /* ── Overlay fedele al Figura (frame card 558×561) ─────────────────
     Ogni misura è una frazione della card proiettata (--center-w /
     --center-h), così testo, gradiente e bottone scalano con la card. */

  /* Bottone "SCOPRI DI PIÙ" — Figma 6447:7869: top 0, ~20px dal bordo dx (20/558) */
  .vol-scopri {
    position: absolute;
    top: 0;
    right: calc(var(--center-w) * 0.0358);
    font-size: calc(var(--center-w) * 0.043); /* 24/558 */
    pointer-events: auto;
    z-index: 2;
  }

  /* Gradiente — Figma 6447:7867: ancorato in basso, altezza 326/561, to-top 0.91→0 */
  .vol-card-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--center-h) * 0.5811); /* 326 / 561 */
    background: linear-gradient(
      0deg,
      rgba(14, 14, 14, 0.91) 0%,
      rgba(14, 14, 14, 0) 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  /* Testo — Figma 6447:7868: left 20/558, ancorato in basso, width 346/558 */
  .vol-info-block {
    position: absolute;
    left: calc(var(--center-w) * 0.0358); /* 20 / 558 */
    bottom: 0;
    width: calc(var(--center-w) * 0.62);  /* 346 / 558 */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    pointer-events: auto;
    z-index: 2;
  }

  /* Le altezze di riga (line-height) del Figura creano la spaziatura verticale
     tra sottotitolo, ruolo e nome — niente margini extra. */
  .vol-subtitle {
    display: block;
    font-family: var(--font-display, sans-serif);
    font-size: calc(var(--center-w) * 0.0197);  /* 11.015 / 558 */
    line-height: calc(var(--center-w) * 0.0812); /* 45.311 / 558 */
    font-weight: 500;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-body, #fafafa);
    white-space: nowrap;
  }

  .vol-role-lines {
    display: flex;
    flex-direction: column;
  }

  .vol-role {
    display: block;
    font-family: var(--font-display, sans-serif);
    font-size: calc(var(--center-w) * 0.0474);  /* 26.436 / 558 */
    line-height: calc(var(--center-w) * 0.0513); /* 28.639 / 558 */
    font-weight: 500;
    text-transform: uppercase;
    color: var(--color-content-body, #fafafa);
    white-space: nowrap;
  }

  .vol-name-lines {
    display: flex;
    flex-direction: column;
  }

  .vol-name-word {
    display: block;
    font-family: var(--font-display, sans-serif);
    font-size: calc(var(--center-w) * 0.079);   /* 44.06 / 558 */
    line-height: calc(var(--center-w) * 0.0812); /* 45.311 / 558 */
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-content-accent, #bdff5d);
    white-space: nowrap;
  }

  /* ══════════════════════════════════════════════════════════════════
     MOBILE
  ══════════════════════════════════════════════════════════════════ */

  /* Sul mobile il carosello è fixed fullscreen: nascondi le sezioni intro */
  @media (max-width: 599px) {
    .intro,
    .chi-section {
      display: none;
    }
  }

  .mobile-carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary, #0e0e0e);
    overflow: hidden;
  }

  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .mobile-blur {
    position: absolute;
    left: 0;
    right: 0;
    height: 44%;
    pointer-events: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mobile-blur--top {
    top: 0;
    background: linear-gradient(180deg, rgba(14, 14, 14, 0.35) 0%, rgba(14, 14, 14, 0) 100%);
    mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
  }

  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(0deg,
      rgba(14, 14, 14, 1)   0%,
      rgba(14, 14, 14, 1)   28%,
      rgba(14, 14, 14, 0.7) 50%,
      rgba(14, 14, 14, 0)   100%
    );
    mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
  }

  .mobile-info {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100px;
    padding: var(--spacing-6, 24px) var(--spacing-5, 20px);
    display: flex;
    flex-direction: column;
    pointer-events: none;
    z-index: 3;
  }

  /* Mobile: valori fissi (--center-w non è definito qui) — line-height
     esplicite per non ereditare quelle desktop, ormai in calc(). */
  .mobile-info .vol-subtitle {
    font-size: 9px;
    line-height: normal;
    margin-bottom: 4px;
  }

  .mobile-info .vol-role-lines {
    margin-bottom: 6px;
  }

  .mobile-info .vol-role {
    font-size: 14px;
    line-height: 1.15;
  }

  .mobile-info .vol-name-lines {
    line-height: 0.88;
  }

  .mobile-info .vol-name-word {
    font-size: 43px;
  }

  .scopri-mobile-wrap {
    position: absolute;
    left: var(--spacing-5, 24px);
    bottom: 36px;
    width: 238px;
    z-index: 4;
  }

  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5, 20px);
    bottom: 36px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5, 20px);
    z-index: 4;
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .ring.ready,
    .card-3d,
    .card-overlay { transition: none; }
  }
</style>
