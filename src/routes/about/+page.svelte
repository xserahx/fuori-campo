<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import ScopriDiPiuButton from "$lib/components/buttons/ScopriDiPiuButton.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { gsap } from "gsap";

  import "$lib/styles/reset.css";
  import "$lib/styles/tokens.css";
  import "$lib/styles/base.css";
  import "$lib/styles/utilities.css";

  //Dati per le slide introduttive (3 domande per spiegare il progetto)
  const introSlides = [
    {
      titleTop: "COS’È",
      titleBottom: "FUORI CAMPO?",
      body: "Fuori Campo è un archivio delle esperienze dei volontari di Milano Cortina 2026: un invito a scoprire il loro lavoro, spesso nascosto o dato per scontato, le fotografie e i ricordi che hanno scelto di condividere.",
    },
    {
      titleTop: "QUAL È",
      titleBottom: "L’OBIETTIVO?",
      body: "Raccontare le Olimpiadi e le Paralimpiadi attraverso gli occhi dei volontari e sensibilizzare il pubblico sul tema, ispirando chiunque desideri, in futuro, vivere l’esperienza del volontariato sportivo.",
    },
    {
      titleTop: "COM’È NATO",
      titleBottom: "FUORI CAMPO?",
      body: "Fuori Campo è un progetto nato dal Laboratorio di Web e Digital Design del secondo anno triennale del corso di Design della Comunicazione al Politecnico di Milano.",
    },
  ];

  let activeIndex = $state(0);
  let introSlideEl = $state<HTMLElement | null>(null);

  function nextAbout() {
    activeIndex = (activeIndex + 1) % introSlides.length;
  }

  function prevAbout() {
    activeIndex = (activeIndex - 1 + introSlides.length) % introSlides.length;
  }

  //Dati per il carosello dei membri del team (6 card con foto e nome e slug
  // per link alla pagina del profilo di Viola Naldi e Claudia Irene Solidoro)
  type Volunteer = {
    id: number;
    name: string;
    surname: string;
    image: string;
    slug?: string;
  };

  //Foto dei membri del team
  const VOLUNTEER_1 = "/volunteer_images/foto_team/claudia.png";
  const VOLUNTEER_2 = "/volunteer_images/foto_team/serena.png";
  const VOLUNTEER_3 = "/volunteer_images/foto_team/greta.png";
  const VOLUNTEER_4 = "/volunteer_images/foto_team/matilde.png";
  const VOLUNTEER_5 = "/volunteer_images/foto_team/viola.png";
  const VOLUNTEER_6 = "/volunteer_images/foto_team/laura.png";

  const defaultVolunteers: Volunteer[] = [
    {
      id: 1,
      surname: "SOLIDORO",
      name: "CLAUDIA IRENE",
      image: VOLUNTEER_1,
      slug: "solidoro-claudia-irene",
    },
    { id: 2, surname: "SERAFINI", name: "SERENA", image: VOLUNTEER_2 },
    { id: 3, surname: "FRANCO", name: "GRETA", image: VOLUNTEER_3 },
    { id: 4, surname: "CURINO", name: "MATILDE", image: VOLUNTEER_4 },
    {
      id: 5,
      surname: "NALDI",
      name: "VIOLA",
      image: VOLUNTEER_5,
      slug: "naldi-viola",
    },
    { id: 6, surname: "MAGONI", name: "LAURA", image: VOLUNTEER_6 },
  ];

  let shuffledVolunteers = $state([...defaultVolunteers]);

  //Stati e funzioni per il carosello dei membri del team (desktop e mobile)
  let isMobile = $state(false);
  let targetPos = $state(0);
  let isReady = $state(false);
  let decoded = $state<Record<string, boolean>>({});

  function preloadImages() {
    for (const vol of shuffledVolunteers) {
      if (decoded[vol.image]) continue;
      const img = new Image();
      img.src = vol.image;
      const done = () => {
        decoded[vol.image] = true;
      };
      (img.decode ? img.decode() : Promise.reject()).then(done).catch(done);
    }
  }

  const N = () => shuffledVolunteers.length;
  function mod(n: number, m: number) {
    return ((n % m) + m) % m;
  }

  let currentCarouselIndex = $derived(mod(targetPos, N()));
  let ringRotation = $derived(targetPos * 60);

  function navigateCarousel(dir: number) {
    targetPos += dir;
  }

  function onArrowClickCarousel(dir: number, e: MouseEvent) {
    e.stopPropagation();
    navigateCarousel(dir);
  }

  let isDragging = false;
  let dragStartX = 0;
  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {}
  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 50) navigateCarousel(diff > 0 ? 1 : -1);
  }

  let touchStartY = 0;
  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) navigateCarousel(dy > 0 ? 1 : -1);
  }

  let wheelAccum = 0;
  let wheelLocked = false;
  let wheelStepTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  const WHEEL_STEP = 30;
  const WHEEL_LOCK_MS = 1000;
  let carouselDesktopEl: HTMLElement | null = $state(null);

  function onWheel(e: WheelEvent) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    e.preventDefault();
    if (wheelLocked) return;
    wheelAccum += e.deltaX;
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelAccum = 0;
    }, 140);
    if (Math.abs(wheelAccum) >= WHEEL_STEP) {
      navigateCarousel(wheelAccum > 0 ? 1 : -1);
      wheelAccum = 0;
      wheelLocked = true;
      clearTimeout(wheelStepTimer);
      wheelStepTimer = setTimeout(() => {
        wheelLocked = false;
        wheelAccum = 0;
      }, WHEEL_LOCK_MS);
    }
  }

  let currentVol = $derived(shuffledVolunteers[currentCarouselIndex]);
  let carouselTitleLines = $derived([
    currentVol?.surname ?? "",
    currentVol?.name ?? "",
  ]);

  let desktopTitleEl = $state<HTMLElement | null>(null);
  let mobileTitleEl = $state<HTMLElement | null>(null);
  let teamTitleEl = $state<HTMLElement | null>(null);

  //Animazioni gspa per titoli e testi (intro, team, carosello)
  const DISPLAY_FONT = '800 1em "forma-djr-display"';

  function displayFontReady() {
    if (typeof document === "undefined" || !document.fonts)
      return Promise.resolve();
    if (document.fonts.check(DISPLAY_FONT)) return Promise.resolve();
    return document.fonts.load(DISPLAY_FONT).catch(() => {});
  }

  function playTitleReveal(lines: NodeListOf<HTMLElement>) {
    gsap.fromTo(
      lines,
      { yPercent: 120 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: "power4.out",
        force3D: false,
        overwrite: true,
        stagger: { each: 0.08, from: "start" },
      },
    );
  }

  function blurRevealIn(els: NodeListOf<HTMLElement>, delay = 0.22) {
    gsap.fromTo(
      els,
      { y: 16, opacity: 0, filter: "blur(10px)" },
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.9,
        ease: "power2.out",
        overwrite: true,
        delay,
      },
    );
  }

  // Effetti / Animazioni testi slide introduttive allo scorrimento
  $effect(() => {
    const _trigger = activeIndex;
    if (!introSlideEl) return;
    const activeSlide = introSlideEl.querySelector(".slide-content.active");
    if (!activeSlide) return;

    const titleLines =
      activeSlide.querySelectorAll<HTMLElement>(".about-title-anim");
    const copyLines = activeSlide.querySelectorAll<HTMLElement>(".blur-reveal");

    if (titleLines.length) gsap.set(titleLines, { yPercent: 120 });
    if (copyLines.length)
      gsap.set(copyLines, { y: 16, opacity: 0, filter: "blur(10px)" });

    let cancelled = false;
    displayFontReady().then(() => {
      if (cancelled) return;

      if (titleLines.length) playTitleReveal(titleLines);
      if (copyLines.length) blurRevealIn(copyLines);
    });
    return () => {
      cancelled = true;
    };
  });

  // effetto nomi e cognomi dei membri del team (CHI C’È DIETRO FUORI CAMPO?) allo scorrimento
  $effect(() => {
    if (!teamTitleEl) return;
    const lines = teamTitleEl.querySelectorAll<HTMLElement>(".team-title-anim");
    if (!lines.length) return;

    gsap.set(lines, { yPercent: 120 });
    let cancelled = false;

    displayFontReady().then(() => {
      if (cancelled) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            playTitleReveal(lines);

            observer.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      if (teamTitleEl) observer.observe(teamTitleEl);
    });
    return () => {
      cancelled = true;
    };
  });

  // Animazione carosello desktop e mobile: reveal dei nomi e cognomi dei membri del team
  $effect(() => {
    const _ = currentCarouselIndex;
    const el = isMobile ? mobileTitleEl : desktopTitleEl;
    if (!el) return;
    const lines = el.querySelectorAll<HTMLElement>(".carousel-title-anim");
    if (!lines.length) return;

    if (
      typeof document === "undefined" ||
      !document.fonts ||
      document.fonts.check(DISPLAY_FONT)
    ) {
      playTitleReveal(lines);
      return;
    }

    gsap.set(lines, { yPercent: 120 });
    let cancelled = false;
    document.fonts
      .load(DISPLAY_FONT)
      .catch(() => {})
      .then(() => {
        if (!cancelled) playTitleReveal(lines);
      });
    return () => {
      cancelled = true;
    };
  });

  // Adatta il titolo del carosello dei membri del team alla larghezza della finestra e al font-display
  function fitCarouselTitle() {
    const el = desktopTitleEl;
    if (!el || typeof window === "undefined") return;
    if (window.innerWidth <= 700) {
      el.style.setProperty("--title-fit", "1");
      return;
    }
    el.style.setProperty("--title-fit", "1");
    const lines = Array.from(
      el.querySelectorAll<HTMLElement>(".title-fill, .title-outline"),
    );
    let scale = 1;
    for (const line of lines) {
      const avail = Math.max(0, line.clientWidth - 24);
      const natural = line.scrollWidth;
      if (avail > 0 && natural > avail)
        scale = Math.min(scale, avail / natural);
    }
    el.style.setProperty("--title-fit", scale < 1 ? String(scale * 0.99) : "1");
  }

  $effect(() => {
    const _ = currentCarouselIndex;
    if (typeof window === "undefined") return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitCarouselTitle);
    };
    let cancelled = false;
    schedule();
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts
        .load(DISPLAY_FONT)
        .catch(() => {})
        .then(() => {
          if (!cancelled) schedule();
        });
    }
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
    };
  });

  // ONMOUNT

  /* ── Reset di stato layout su mount ──────────────────────────────────
     L'ABOUT deve calcolare il proprio offset da uno stato PULITO, a
     prescindere dalla pagina di provenienza.
     La pagina di dettaglio
     Categorie (e la scheda volontario) girano come contenitori FIXED e
     non scrollabili, e impostano `--page-top-padding: 0px` sul body: se
     quel valore resta "appiccicato" quando si arriva qui, l'ABOUT perde
     l'offset della navbar e il contenuto sale troppo (sembra calcolato dal
     margine superiore invece che dalla navbar).
     Qui azzeriamo ogni lock
     ereditato e forziamo il padding-top al valore corretto.
  */
  function resetLayoutState() {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // Rimuove ogni stato di fixed-layout / scroll-lock ereditato dalla route
    // precedente (overflow/position/height/top/transform/margin/padding-top).
    for (const el of [root, body]) {
      el.style.removeProperty("overflow");
      el.style.removeProperty("overflow-y");
      el.style.removeProperty("height");
      el.style.removeProperty("position");
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("right");
      el.style.removeProperty("transform");
      el.style.removeProperty("margin");
      el.style.removeProperty("padding-top");
      el.classList.remove("lenis-stopped");
    }

    // L'offset della navbar è di proprietà dell'ABOUT (padding-top di .intro) e
    // il padding del body è azzerato in CSS mentre l'ABOUT è montato, quindi qui
    // basta ripartire dall'alto con un contesto di scroll fresco.
    window.scrollTo(0, 0);
  }

  onMount(() => {
    // ── Rimescolamento dell'array al caricamento della pagina sul client ──
    let temp = [...defaultVolunteers];
    for (let i = temp.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [temp[i], temp[j]] = [temp[j], temp[i]];
    }
    shuffledVolunteers = temp;

    resetLayoutState();
    const resetRaf = requestAnimationFrame(resetLayoutState);
    const resetTimer = window.setTimeout(resetLayoutState, 160);

    preloadImages();
    setTimeout(() => {
      isReady = true;
    }, 50);

    const checkMobile = () => {
      isMobile = window.innerWidth < 600;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    if (carouselDesktopEl && !isMobile) {
      carouselDesktopEl.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      cancelAnimationFrame(resetRaf);
      window.clearTimeout(resetTimer);
      window.removeEventListener("resize", checkMobile);
      if (carouselDesktopEl && !isMobile) {
        carouselDesktopEl.removeEventListener("wheel", onWheel);
      }
      clearTimeout(wheelStepTimer);
      clearTimeout(wheelIdleTimer);
    };
  });
</script>

<main class="about-page">
  <section class="intro safe-area">
    <div class="ghost-grid" bind:this={introSlideEl}>
      {#each introSlides as slide, i}
        <div
          class="slide-content"
          class:active={i === activeIndex}
          aria-hidden={i !== activeIndex}
        >
          <h1 class="title-mask">
            <span class="rise-mask"
              ><span class="title-fill about-title-anim">{slide.titleTop}</span
              ></span
            >
            <span class="rise-mask"
              ><span class="title-outline about-title-anim"
                >{slide.titleBottom}</span
              ></span
            >
          </h1>
          <div class="hero-mask">
            <p class="hero-copy blur-reveal">{slide.body}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="dot-frecce">
      <div class="dot-nav" aria-label="Slide introduttive">
        {#each introSlides as _, i}
          <button
            type="button"
            class="dot"
            class:dot--active={i === activeIndex}
            aria-label={`Vai alla slide ${i + 1}`}
            aria-pressed={i === activeIndex}
            onclick={() => (activeIndex = i)}
          ></button>
        {/each}
      </div>
      <div class="frecce" aria-label="Navigazione slide">
        <ArrowButton
          direction="left"
          ariaLabel="Slide precedente"
          onclick={prevAbout}
        />
        <ArrowButton
          direction="right"
          ariaLabel="Slide successiva"
          onclick={nextAbout}
        />
      </div>
    </div>
  </section>

  <section class="team-intro safe-area" bind:this={teamTitleEl}>
    <h2 class="title-mask">
      <span class="rise-mask"
        ><span class="title-fill team-title-anim">CHI C’È DIETRO</span></span
      >
      <span class="rise-mask"
        ><span class="title-outline team-title-anim">FUORI CAMPO?</span></span
      >
    </h2>
  </section>

  {#if isMobile}
    <section
      class="mobile-carousel"
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
      aria-label="Carousel team"
    >
      {#key currentCarouselIndex}
        <div
          class="mobile-bg"
          style="background-image: {decoded[
            shuffledVolunteers[currentCarouselIndex]?.image
          ]
            ? `url('${shuffledVolunteers[currentCarouselIndex]?.image}')`
            : 'none'}"
          in:fade={{ duration: 500, delay: 80 }}
          out:fade={{ duration: 400 }}
        ></div>
      {/key}

      <div class="mobile-blur mobile-blur--top" aria-hidden="true"></div>
      <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

      <div
        class="mobile-title"
        bind:this={mobileTitleEl}
        aria-live="polite"
        lang="it"
      >
        {#each carouselTitleLines as line, i}
          <span class="carousel-title-mask">
            {#if i === 0}
              <span
                class="carousel-title-fill
                carousel-title-anim">{line}</span
              >
            {:else}
              <span class="carousel-title-outline carousel-title-anim"
                >{line}</span
              >
            {/if}
          </span>
        {/each}
      </div>

      {#if currentVol?.slug}
        <a
          class="scopri-btn"
          href={`/volunteer/${currentVol.slug}/profile?from=about`}
          onclick={() => window.scrollTo(0, 0)}>SCOPRI DI PIÙ</a
        >
      {/if}

      <div class="mobile-nav-circles">
        <ArrowButton direction="up" onclick={() => navigateCarousel(-1)} />
        <ArrowButton direction="down" onclick={() => navigateCarousel(1)} />
      </div>
    </section>
  {:else}
    <section
      class="carousel"
      bind:this={carouselDesktopEl}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointerleave={onPointerUp}
      aria-label="Carousel team"
    >
      <div class="stage">
        <div class="container-3d">
          <div
            class="ring"
            class:ready={isReady}
            style="transform: translateZ(var(--camera-z)) rotateY({ringRotation}deg);"
          >
            {#each shuffledVolunteers as vol, i}
              {@const isActive = currentCarouselIndex === i}
              <div
                class="card-3d"
                class:active={isActive}
                style="transform: rotateY({i *
                  -60}deg) translateZ(var(--card-radius));"
              >
                <div
                  class="card-image"
                  class:loaded={decoded[vol.image]}
                  style="background-image: url('{vol.image}');"
                ></div>

                <div class="card-overlay"></div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="progressive-blur-overlay" aria-hidden="true"></div>

      <div
        class="arrow-left"
        role="presentation"
        onpointerdown={(e) => e.stopPropagation()}
      >
        <ArrowButton
          direction="left"
          onclick={(e) => onArrowClickCarousel(-1, e)}
        />
      </div>

      <div
        class="arrow-right"
        role="presentation"
        onpointerdown={(e) => e.stopPropagation()}
      >
        <ArrowButton
          direction="right"
          onclick={(e) => onArrowClickCarousel(1, e)}
        />
      </div>

      <div class="curve-frame" aria-hidden="true">
        <svg
          class="curve curve-top"
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
        >
          <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
        </svg>
        <svg
          class="curve curve-bottom"
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
        >
          <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
        </svg>
      </div>

      <div class="bottom-bar">
        <div
          class="carousel-title-container"
          bind:this={desktopTitleEl}
          aria-live="polite"
        >
          {#each carouselTitleLines as line, index}
            <span class="carousel-title-mask">
              {#if index === 0}
                <span class="carousel-title-fill carousel-title-anim"
                  >{line}</span
                >
              {:else}
                <span class="carousel-title-outline carousel-title-anim"
                  >{line}</span
                >
              {/if}
            </span>
          {/each}
        </div>
      </div>

      {#if currentVol?.slug}
        <div
          class="desktop-scopri"
          role="presentation"
          onpointerdown={(e) => e.stopPropagation()}
          onclick={() => window.scrollTo(0, 0)}
        >
          <ScopriDiPiuButton
            dark
            href="/volunteer/{currentVol.slug}/profile?from=about"
          />
        </div>
      {/if}
    </section>
  {/if}
</main>

<SiteFooter />

<style>
  /* The ABOUT page owns its top offset in `.intro` (navbar height + spacing), so
     the layout's body padding-top must contribute nothing here — otherwise the
     offset doubles.
     Scoped to while ABOUT is mounted; other routes keep the
     layout's `--page-top-padding` behaviour.
  */
  :global(body) {
    padding-top: 0 !important;
  }

  .about-page {
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* ── INTRO SLIDE ─────────────────────────────────────────────────────────────── */
  .intro {
    display: flex;
    flex-direction: column;
    /* Self-contained top offset: navbar height + breathing room, computed here
       from the token (125px desktop / 96px mobile).
       The ABOUT page no longer
       relies on the layout's body `--page-top-padding` for the navbar offset —
       that variable is 0px on the Categories-detail / volunteer fixed routes and
       could leak in, dropping the offset and pulling the content up under the
       navbar.
       Owning it here means the offset is always correct regardless of
       which page you arrived from.
       (Body padding is zeroed below to avoid
       double-counting.) */
    padding-top: calc(var(--navbar-height, 125px) + var(--spacing-10, 64px));
    padding-bottom: clamp(24px, 4vh, 48px);
    overflow-x: hidden;
  }

  .team-intro {
    display: flex;
    flex-direction: column;
    padding-top: clamp(60px, 10vh, 120px);
    padding-bottom: var(--spacing-8, 48px);
    position: relative;
    z-index: 10;
  }

  .ghost-grid {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    width: 100%;
  }

  .slide-content {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    visibility: hidden;
    pointer-events: none;
  }

  .slide-content.active {
    visibility: visible;
    pointer-events: auto;
  }

  .title-mask {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .title-fill,
  .title-outline {
    font-family: var(--font-display);
    font-size: calc(
      clamp(
          var(--unit-56),
          calc(var(--unit-116) / max(var(--page-zoom, 1), 0.65)),
          var(--unit-200)
        ) * var(--title-fit, 1)
    );
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
    display: block;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    margin-left: var(--spacing-14);
    margin-top: 0;
    max-width: calc(100% - var(--spacing-17) - var(--spacing-11));
    min-width: 0;
  }

  .title-fill {
    color: var(--color-content-accent, #bdff5d);
    margin-top: -0.05em;
  }

  .rise-mask {
    display: block;
    overflow: hidden;
    padding-top: 0.25em;
    margin-top: -0.25em;
    padding-bottom: 0.15em;
    margin-bottom: -0.15em;
  }

  .hero-mask {
    width: 100%;
    position: relative;
    z-index: 5;
    margin: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }

  .hero-copy {
    margin-top: clamp(10px, 4vh, var(--unit-36));
    margin-left: auto;
    padding: 0;
    width: 100%;
    max-width: min(70dvw, 1100px);
    text-align: right;
    text-wrap: balance;
    font-family: var(--font-display);
    font-weight: 500;
    line-height: 1.05;
    color: var(--color-content-body);
    font-size: clamp(25px, 6vh, 45px);
  }

  .dot-frecce {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: min(40dvw, 600px);
    margin-top: clamp(32px, 30dvh, 80px);
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
    content: "";
    display: block;
    width: var(--unit-16);
    height: var(--unit-16);
    border-radius: 50%;
    background: rgba(189, 255, 93, 0.3);
    transition:
      background 220ms ease,
      box-shadow 220ms ease;
  }
  .dot:hover::before {
    background: rgba(189, 255, 93, 0.6);
  }
  .dot.dot--active::before {
    background: var(--color-content-accent, #bdff5d);
  }
  .frecce {
    display: flex;
    align-items: center;
    gap: var(--unit-20);
  }

  /* ── CAROUSEL ───────────────────────────────────────────────────── */
  .carousel,
  .mobile-carousel {
    position: relative;
    width: 100%;
    height: 100svh;
    background: var(--color-background-primary);
    overflow: hidden;
  }

  .carousel {
    cursor: grab;
    user-select: none;
    touch-action: none;

    --card-width: clamp(140px, 26vw, 200px);
    --card-height: calc(var(--card-width) * 1);

    --ss: 2;
    --card-radius: calc(var(--card-width) * var(--ss) * -0.86);
    --camera-z: calc(var(--card-width) * var(--ss) * 2.5);

    --seam-half-height: calc(var(--card-height) * 0.7);
    --seam-gap: calc(50% - var(--seam-half-height) * 0.8);
  }

  .carousel:active {
    cursor: grabbing;
  }

  .carousel::before {
    content: "";
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
    margin: var(--spacing-5, 24px) 0;
    z-index: 1;
  }

  .container-3d {
    perspective: var(--camera-z);
    width: calc(var(--card-width) * var(--ss));
    height: calc(var(--card-height) * var(--ss));
    transform: scale(calc(1 / var(--ss)));
    transform-origin: center center;
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
    transition:
      transform 0.85s ease,
      box-shadow 0.85s ease;
    pointer-events: none;
  }

  .card-image {
    width: 100%;
    height: 100%;
    background-size: cover;
    top: 0;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .card-image.loaded {
    opacity: 1;
  }
  .card-overlay {
    position: absolute;
    inset: 0;
  }

  .card-3d.active .card-overlay {
    background: rgba(0, 0, 0, 0);
  }

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
    height: calc(var(--seam-gap) * 1.1);
  }

  .curve-bottom {
    bottom: 0;
    height: calc(var(--seam-gap) * 1.1);
  }

  .bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-4-2) 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none;
  }

  /* "Scopri di più" desktop — ancorato all'angolo in alto a destra della card
     frontale.
     La card è centrata nel carosello e, per la prospettiva 3D, si
     proietta a ~2.9× --card-width: la sua SEMI-dimensione visibile (card
     quadrata) è ~1.45× --card-width.
     Dal centro (50%/50%) risaliamo al bordo
     alto/destro e insettiamo di 22px / 20px.
     Knob: 1.45 = fattore di semi-dimensione proiettata; 22px/20px = inset. */
  .desktop-scopri {
    position: absolute;
    top: calc(50% - var(--card-width) * 1.3 + 22px);
    right: calc(50% - var(--card-width) * 1.42 + 20px);
    z-index: 11;
    pointer-events: auto;
  }

  .carousel-title-container {
    font-family: "Forma DJR Display", sans-serif;
    font-size: calc(
      clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px) *
        var(--title-fit, 1)
    );
    font-weight: 800;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1;
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .carousel-title-mask {
    display: block;
    overflow: hidden;
  }

  .carousel-title-fill {
    color: var(--color-content-accent);
    display: block;
    white-space: nowrap;
    margin-left: var(--spacing-11);
    margin-bottom: -8px;
    max-width: calc(100% - var(--spacing-11) - var(--spacing-11));
    overflow: hidden;
    min-width: 0;
  }

  .carousel-title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    display: block;
    white-space: nowrap;
    margin-left: clamp(
      var(--spacing-11),
      calc(var(--spacing-17) / max(var(--page-zoom, 1), 0.65)),
      580px
    );
  }

  /* ── CAROSELLO MOBILE ── */
  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    margin-bottom: 10px;
  }

  .mobile-blur {
    position: absolute;
    left: 0;
    right: 0;
    height: 44%;
    pointer-events: none;
    backdrop-filter: blur(1px);
    -webkit-backdrop-filter: blur(1px);
  }
  .mobile-blur--top {
    top: 0;
    background: linear-gradient(
      180deg,
      rgba(14, 14, 14, 0.35) 0%,
      rgba(14, 14, 14, 0) 100%
    );
    mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
  }
  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(
      0deg,
      rgba(14, 14, 14, 1) 0%,
      rgba(14, 14, 14, 1) 28%,
      rgba(14, 14, 14, 0.7) 50%,
      rgba(14, 14, 14, 0) 100%
    );
    mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(
      0deg,
      #000 0%,
      #000 32%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  .mobile-title {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(var(--unit-36) + var(--spacing-9));
    padding: var(--spacing-6) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: none;
    z-index: 3;
  }
  .mobile-title .carousel-title-fill {
    font-family: var(--font-display);
    font-size: 43px;
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
  .mobile-title .carousel-title-outline {
    font-family: var(--font-display);
    font-size: 43px;
    font-weight: 800;
    line-height: 36px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-mobile) var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: pre-line;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5);
    bottom: var(--unit-36);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    z-index: 4;
  }

  /* ── Scopri di più bottone */
  .scopri-btn {
    position: absolute;
    left: var(--spacing-5);
    bottom: var(--unit-36);
    width: 238px;
    max-width: calc(100% - var(--spacing-5) * 2);
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
    transition:
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .scopri-btn:hover,
  .scopri-btn:focus-visible {
    background: rgba(189, 255, 93, 0.08);
  }

  .scopri-btn:active {
    background: var(--color-content-accent);
    color: var(--color-content-body-black, #0e0e0e);
  }

  /* Mobile ----------------------------- */
  @media (max-width: 700px) {
    .hero-mask {
      padding: 0;
      flex-grow: 0;
    }
    .hero-copy {
      margin: var(--spacing-8, 48px) 0 0 0;
      width: 100%;
      max-width: 100%;
      text-align: right;
      font-size: clamp(22px, 7vw, 30px);
      line-height: 0.95;
      font-weight: 500;
      text-wrap: balance;
    }
    .title-mask {
      display: block;
      overflow: hidden;
      padding-top: 15px;
      margin-top: -15px;
      padding-bottom: 12px;
      margin-bottom: -12px;
    }
    .title-fill,
    .title-outline {
      display: block;
      white-space: normal;
      font-size: var(--mobile-title-size, 43px);
      line-height: 36px;
      width: 100%;
      max-width: 100%;
      margin: 0;
      overflow: visible;
    }
    .title-outline {
      padding-left: 2px;
      -webkit-text-stroke: var(--stroke-mobile) var(--color-content-accent);
    }
    .dot-frecce {
      width: 100%;
      margin-top: clamp(72px, 30dvh, 350px);
    }
    .dot-nav {
      max-width: calc(100% - 110px);
      gap: 6px;
      flex-wrap: wrap;
    }
    .dot,
    .dot::before {
      width: 12px;
      height: 12px;
    }

    .carousel-title-fill,
    .carousel-title-outline {
      white-space: normal;
      word-break: break-word;
    }
    .carousel-title-outline {
      margin-left: var(--spacing-11);
      -webkit-text-stroke: var(--stroke-mobile);
    }

    .carousel-title-mask {
      padding-top: 15px;
      margin-top: -15px;
      padding-bottom: 15px;
      margin-bottom: -15px;
    }

    .mobile-title .carousel-title-fill,
    .mobile-title .carousel-title-outline {
      margin-left: 0;
      overflow: visible;
    }
  }

  @media (min-width: 768px) {
    .arrow-left {
      left: var(--spacing-8);
    }
    .arrow-right {
      right: var(--spacing-8);
    }
  }
  @media (min-width: 1024px) {
    .arrow-left {
      left: var(--spacing-11);
    }
    .arrow-right {
      right: var(--spacing-11);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .title-fill,
    .title-outline,
    .carousel-title-fill,
    .carousel-title-outline {
      transition: none;
    }
  }
</style>
