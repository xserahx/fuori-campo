<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import ScrollArrow from "../lib/components/ScrollArrow.svelte";
  import { blurReveal } from "../lib/actions/blurReveal";
  import type { BlurRevealOptions } from "../lib/actions/blurReveal";
  import { imgNavbar, imgStatusDefault, galleryImages } from "../lib/design/assets";
  import IntroLoader from "../lib/components/IntroLoader.svelte";

  /* ── Intro loader ─────────────────────────────────────────────── */
  let showIntro = $state(true);
  let introExiting = $state(false);
  let loaderProgress = $state(0);

  const volunteers = ["/volontari/1.jpg", "/volontari/2.jpg", "/volontari/3.jpg"];
  let loaderPhotoSrc = $state(volunteers[0]);
  let activeLoaderSet = $state(0);

  const loaderBlockLayouts = [
    [
      { left: 0, top: 0, width: 50, height: 50 },
      { left: 50, top: 0, width: 50, height: 50 },
      { left: 0, top: 50, width: 50, height: 50 },
      { left: 50, top: 50, width: 50, height: 50 }
    ],
    [
      { left: 0, top: 0, width: 100, height: 50 },
      { left: 0, top: 50, width: 100, height: 50 }
    ]
  ];

  /* ── Navbar state ─────────────────────────────────────────────── */
  let navbarVisible = $state(true);
  let navbarFixed = $state(true);

  /* ── DOM refs ────────────────────────────────────────────────── */
  let heroSection: HTMLElement | null = null;
  let questionShell: HTMLElement | null = null;
  let questionTrack: HTMLElement | null = null;

  /* ── Gallery / scroll cue ─────────────────────────────────────── */
  const galleryCount = 12;
  const offsetCount = 6;

  function navigateToGallery() {
    goto("/gallery");
  }

  /* ── Timers ──────────────────────────────────────────────────── */
  let interval: ReturnType<typeof setInterval> | undefined;
  let exitTimeout: ReturnType<typeof setTimeout> | undefined;

  /* ── blurReveal configs ──────────────────────────────────────── */
  const fadeReveal: BlurRevealOptions = {
    variant: "fade",
    blur: 24,
    duration: 1000,
    threshold: 0.15
  };

  const fadeRevealDelayed: BlurRevealOptions = {
    variant: "fade",
    blur: 24,
    duration: 1000,
    threshold: 0.15,
    delay: 120
  };

  /* ═══════════════════════════════════════════════════════════════
   * MOUNT — intro loader
   * ═══════════════════════════════════════════════════════════════ */
  onMount(() => {
    interval = setInterval(() => {
      loaderProgress += 2;

      if (loaderProgress % 20 === 0) {
        activeLoaderSet = (activeLoaderSet + 1) % loaderBlockLayouts.length;
        loaderPhotoSrc = volunteers[Math.floor(Math.random() * volunteers.length)];
      }

      if (loaderProgress >= 100) {
        introExiting = true;
        exitTimeout = setTimeout(() => { showIntro = false; }, 600);
        if (interval) clearInterval(interval);
      }
    }, 60);

    return () => {
      if (interval) clearInterval(interval);
      if (exitTimeout) clearTimeout(exitTimeout);
    };
  });

  /* ═══════════════════════════════════════════════════════════════
   * MOUNT — scroll behaviour (navbar + scroll-locked horizontal pan)
   *
   * Geometry model
   * ─────────────
   *  .question-shell   position:relative, height set by JS
   *  .question-sticky  position:sticky, top:0, margin-top:STICKY_MARGIN,
   *                    height:100vh
   *  .question-track   horizontal flex, JS translateX
   *
   *  STICKY_MARGIN (192 px) = .question-sticky { margin-top }
   *  panStart = qShellTop + STICKY_MARGIN   ← sticky has fully pinned
   *  panEnd   = panStart + totalSlide       ← all panels consumed
   *  qShellH  = STICKY_MARGIN + vh + totalSlide
   *
   *  While panStart ≤ scrollY < panEnd:
   *    wheel / touch → blocked vertically, drives hOffset horizontally
   *  At panEnd: page jumps past shell, sticky unpins, vertical resumes.
   * ═══════════════════════════════════════════════════════════════ */
  onMount(() => {
    let lastScrollY = window.scrollY;

    /* ── Geometry ────────────────────────────────────────────────── */
    const STICKY_MARGIN = 192; // mirrors .question-sticky { margin-top }

    let qShellTop  = 0;
    let qShellH    = 0;
    let totalSlide = 0;

    /* ── Virtual horizontal position ────────────────────────────── */
    let hOffset = 0;

    /* ── Panel snap ──────────────────────────────────────────────── */
    let snapTimer: ReturnType<typeof setTimeout> | undefined;

    const applyTransform = () => {
      if (questionTrack) {
        questionTrack.style.transform = `translateX(${-Math.round(hOffset)}px)`;
      }
    };

    /* Snap to nearest panel with a spring transition */
    const scheduleSnap = () => {
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const pw     = window.innerWidth;
        const target = Math.round(hOffset / pw) * pw;
        if (Math.abs(hOffset - target) > 1 && questionTrack) {
          questionTrack.style.transition = 'transform 380ms cubic-bezier(0.22,1,0.36,1)';
          hOffset = target;
          applyTransform();
          setTimeout(() => {
            if (questionTrack) questionTrack.style.transition = 'transform 80ms linear';
          }, 400);
        }
      }, 200);
    };

    /* ── Build / rebuild shell geometry ─────────────────────────── */
    const setupHorizontalScroll = () => {
      if (!questionShell || !questionTrack) return;
      totalSlide = Math.max(0, questionTrack.scrollWidth - window.innerWidth);
      // Shell must cover entry gap + sticky height + all horizontal travel
      qShellH    = STICKY_MARGIN + window.innerHeight + totalSlide;
      questionShell.style.height = `${qShellH}px`;
      qShellTop  = questionShell.getBoundingClientRect().top + window.scrollY;
    };

    /* ── Wheel — non-passive; converts vertical → horizontal pan ───
       Vertical scroll is blocked (preventDefault) only while the
       sticky is pinned AND we have more panels to reveal.          */
    const handleWheel = (e: WheelEvent) => {
      if (!questionShell || !questionTrack || totalSlide <= 0) return;

      const sy       = window.scrollY;
      const panStart = qShellTop + STICKY_MARGIN; // sticky is fully pinned here
      const panEnd   = panStart + totalSlide;      // last panel consumed

      const inZone = sy >= panStart && sy < panEnd;

      if (!inZone) {
        // Re-entering from above → reset to panel 1
        if (sy < panStart) hOffset = 0;
        return; // let normal vertical scroll proceed
      }

      // At left edge + scrolling up → release; vertical scroll resumes upward
      if (hOffset <= 0 && e.deltaY < 0) return;
      // At right edge + scrolling down → jump past shell, vertical resumes
      if (hOffset >= totalSlide && e.deltaY > 0) {
        window.scrollTo({ top: panEnd, behavior: 'instant' });
        return;
      }

      // Inside zone → block vertical, drive horizontal
      e.preventDefault();
      hOffset = Math.max(0, Math.min(totalSlide, hOffset + e.deltaY * 1.5));
      applyTransform();
      scheduleSnap();
    };

    /* ── Touch — swipe-up gesture drives the same hOffset ───────── */
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!questionShell || !questionTrack || totalSlide <= 0) return;

      const sy       = window.scrollY;
      const panStart = qShellTop + STICKY_MARGIN;
      const panEnd   = panStart + totalSlide;
      const inZone   = sy >= panStart && sy < panEnd;
      if (!inZone) return;

      // positive dy = finger swiped up = scroll right
      const dy = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;

      if (hOffset <= 0 && dy < 0) return;
      if (hOffset >= totalSlide && dy > 0) {
        window.scrollTo({ top: panEnd, behavior: 'instant' });
        return;
      }

      e.preventDefault();
      hOffset = Math.max(0, Math.min(totalSlide, hOffset + dy * 2));
      applyTransform();
      scheduleSnap();
    };

    /* ── Scroll — passive; navbar visibility only ────────────────── */
    const handleScroll = () => {
      const sy       = window.scrollY;
      const delta    = sy - lastScrollY;
      const vh       = window.innerHeight;
      const panStart = qShellTop + STICKY_MARGIN;
      const inQuestion = sy >= panStart && sy < panStart + totalSlide;

      if (heroSection) {
        const rect   = heroSection.getBoundingClientRect();
        const inHero = rect.top < vh * 0.15 && rect.bottom > vh * 0.45;

        if (inHero) {
          navbarVisible = true;
          navbarFixed   = true;
        } else if (inQuestion) {
          navbarVisible = false;      // hide over question panels
        } else if (sy <= 20) {
          navbarVisible = false;
          navbarFixed   = true;
        } else if (delta > 8) {
          navbarVisible = false;
        } else if (delta < -8) {
          navbarVisible = true;
        }
      }

      lastScrollY = sy;
    };

    /* ── Pointer move — show navbar when cursor nears top ─────────── */
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (!heroSection) return;
      const rect   = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 &&
                     rect.bottom > window.innerHeight * 0.45;
      if (!inHero && event.movementY < 0 && event.clientY <= 180) {
        navbarVisible = true;
      }
    };

    /* ── Upward wheel outside hero — re-show navbar (passive) ─────── */
    const handleNavWheel = (event: WheelEvent) => {
      if (!heroSection || event.deltaY >= 0 || window.scrollY <= 20) return;
      const rect   = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 &&
                     rect.bottom > window.innerHeight * 0.45;
      if (!inHero) navbarVisible = true;
    };

    /* ── Resize ──────────────────────────────────────────────────── */
    const handleResize = () => {
      setupHorizontalScroll();
      applyTransform();
    };

    /* ── Init ────────────────────────────────────────────────────── */
    requestAnimationFrame(() => {
      setupHorizontalScroll();
      applyTransform();
    });

    window.addEventListener("scroll",      handleScroll,      { passive: true  });
    window.addEventListener("wheel",       handleWheel,       { passive: false }); // intercepts
    window.addEventListener("wheel",       handleNavWheel,    { passive: true  }); // navbar only
    window.addEventListener("touchstart",  handleTouchStart,  { passive: true  });
    window.addEventListener("touchmove",   handleTouchMove,   { passive: false }); // intercepts
    window.addEventListener("pointermove", handlePointerMove, { passive: true  });
    window.addEventListener("resize",      handleResize,      { passive: true  });

    return () => {
      window.removeEventListener("scroll",      handleScroll);
      window.removeEventListener("wheel",       handleWheel);
      window.removeEventListener("wheel",       handleNavWheel);
      window.removeEventListener("touchstart",  handleTouchStart);
      window.removeEventListener("touchmove",   handleTouchMove);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize",      handleResize);
      if (snapTimer) clearTimeout(snapTimer);
    };
  });
</script>

<IntroLoader
  {showIntro}
  {introExiting}
  {loaderPhotoSrc}
  {loaderBlockLayouts}
  {activeLoaderSet}
  {loaderProgress}
/>

<div class="site">
  <main class="landing">

    <!-- ── Hero ────────────────────────────────────────────────── -->
    <section class="hero-outer" bind:this={heroSection}>
      <div class="hero-inner">
        <BlurTitle />
      </div>
    </section>

    <!-- ── Scrolling story sections (vertical) ─────────────────── -->
    <section class="story story--left story--intro"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 24 }}>
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <section class="story story--right story--numbers"
      use:blurReveal={{ direction: "right", variant: "skew", blur: 28 }}>
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <!-- Quotes -->
    <section class="story story--quote story--quote-left"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 20, threshold: 0.15 }}>
      <p class="quote">
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
      </p>
    </section>

    <section class="story story--quote story--quote-right"
      use:blurReveal={{ direction: "right", variant: "slide", blur: 20, threshold: 0.15, delay: 150 }}>
      <p class="quote">
        Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <!-- ── Question section (sticky → horizontal scroll) ────────── -->
    <!--
      Figma scroll-locked horizontal section.
      .question-shell  — tall proxy; JS sets height = 100vh + totalSlide.
      .question-sticky — position:sticky; height:100vh — pins to viewport.
      .question-track  — horizontal flex; JS sets translateX() to pan.
      Each panel: 100vw × 100vh. Q1/Q3 = lime bg, Q2/Q4 = dark bg.
    -->
    <div class="question-shell" bind:this={questionShell}>
      <div class="question-sticky">
        <div class="question-track" bind:this={questionTrack}>

          <!-- Q1 — lime bg, dark text, left-aligned -->
          <section class="question question--left question--lime">
            <h2>
              <span class="accent">MA </span>
              <span class="ghost">CHI SONO </span>
              <span class="accent">DAVVERO</span><br />
              <span class="accent">I VOLONTARI?</span>
            </h2>
          </section>

          <!-- Q2 — dark bg, accent text, right-aligned -->
          <section class="question question--right question--dark">
            <h2>
              <span class="ghost">PERCHÉ </span>
              <span class="accent">HANNO DECISO</span><br />
              <span class="accent">DI CANDIDARSI?</span>
            </h2>
          </section>

          <!-- Q3 — lime bg, dark text, left-aligned -->
          <section class="question question--left question--lime">
            <h2>
              <span class="ghost">COSA FACEVANO </span><br />
              <span class="accent">CONCRETAMENTE?</span>
            </h2>
          </section>

          <!-- Q4 — dark bg, accent text, right-aligned -->
          <section class="question question--right question--dark">
            <h2>
              <span class="accent">NE È VALSA LA PENA?</span><br />
              <span class="ghost">LO RIFAREBBERO</span><span class="accent">?</span>
            </h2>
          </section>

        </div>
      </div>
    </div>

    <!-- ── Post-question (vertical resumes) ─────────────────────── -->
    <section class="story story--left story--summary"
      use:blurReveal={{ direction: "left", threshold: 0.3 }}>
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <a href="/gallery" class="accent archivio-link">archivio</a>.
      </p>
    </section>

    <!-- Scroll cue — Figma: H3 36px accent, ls 0.72px + arrow -->
    <div class="scroll-cue"
      use:blurReveal={{ direction: "left", threshold: 0.5, blur: 10, translateX: 20, duration: 600 }}>
      <p class="scroll-cue-label">Continua a scorrere per accedere alla galleria</p>
      <ScrollArrow onclick={navigateToGallery} />
    </div>

    <!-- Gallery preview teaser -->
    <section class="gallery" aria-label="Gallery preview">
      {#each galleryImages as src, index}
        <figure
          class="gallery-item"
          style={`width:var(--gallery-width-${(index % galleryCount) + 1}); margin-top:var(--gallery-offset-${(index % offsetCount) + 1});`}
          use:blurReveal={{ direction: index % 2 === 0 ? "left" : "right", threshold: 0.1, blur: 12, translateX: 30, duration: 700 }}>
          <img src={src} alt="gallery sample" />
        </figure>
      {/each}
    </section>

  </main>
</div>

<style>
  .archivio-link {
    text-decoration: none;
  }
  .archivio-link:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
</style>
