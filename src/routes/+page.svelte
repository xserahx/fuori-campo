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
  // Two independent horizontal scroll shells
  // H1 = Q1 (lime) + Q2 (dark),  H2 = Q3 (lime) + Q4 (dark)
  let shell1: HTMLElement | null = null;
  let track1: HTMLElement | null = null;
  let shell2: HTMLElement | null = null;
  let track2: HTMLElement | null = null;

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
   * MOUNT — GSAP dydpJzY-equivalent horizontal scroll
   *
   * Mirrors the GreenSock ScrollTrigger "Horizontal Scroll" pen exactly:
   *
   *   gsap.to(track, {
   *     xPercent: -100 * (panels - 1),
   *     ease: "none",
   *     scrollTrigger: { trigger, pin: true, scrub: 1, end: "+=" + width }
   *   });
   *
   * Pure-JS translation:
   *   • Shell height  = 100vh + (N-1)×100vw  (the "end" distance)
   *   • position:sticky pins the track (ScrollTrigger's "pin: true")
   *   • translateX    = -(scrollY - shellTop), clamped [0, slide]
   *   • RAF lerp      = "scrub: 1" (smooth lag between scroll & visuals)
   *   • No wheel/touch interception — page scrolls freely, track follows
   *
   * Two independent shells:
   *   [hero + stories]       vertical
   *   [H-Shell 1 : Q1 → Q2] horizontal scrub
   *   [gap ~346 px]          vertical  ← "third question = vertical"
   *   [H-Shell 2 : Q3 → Q4] horizontal scrub
   *   [summary + gallery]    vertical
   * ═══════════════════════════════════════════════════════════════ */
  onMount(() => {
    let lastScrollY = window.scrollY;

    /* ── Per-shell state ──────────────────────────────────────────── */
    type S = { top: number; slide: number; x: number };
    const s1: S = { top: 0, slide: 0, x: 0 };
    const s2: S = { top: 0, slide: 0, x: 0 };

    /* scrub: 1 equivalent — ~10 frames at 60 fps */
    const LERP = 0.10;
    let rafId = 0;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    /* ── Setup: shell heights + document-top positions ────────────────
       (N-1)×vw  =  total horizontal travel  =  GSAP's "end" distance.
       scrollWidth is unreliable on overflow:visible flex — use child
       count instead (always correct).                                */
    const setup = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (shell1 && track1) {
        s1.slide = (track1.children.length - 1) * vw;   // 1×vw for 2 panels
        shell1.style.height = `${vh + s1.slide}px`;
        s1.top = shell1.getBoundingClientRect().top + window.scrollY;
      }
      if (shell2 && track2) {
        s2.slide = (track2.children.length - 1) * vw;
        shell2.style.height = `${vh + s2.slide}px`;
        s2.top = shell2.getBoundingClientRect().top + window.scrollY;
      }
    };

    /* ── RAF tick — scrub both tracks (GSAP scrub:1 equivalent) ──────
       target = -(scrollY - shellTop)  clamped to [0, slide]
       x      = lerp(x, target, LERP) for cinematic smoothing        */
    const tick = () => {
      const sy = window.scrollY;

      for (const [s, track] of [[s1, track1], [s2, track2]] as const) {
        if (s.slide <= 0 || !track) continue;
        const target = -Math.max(0, Math.min(s.slide, sy - s.top));
        s.x = lerp(s.x, target, LERP);
        (track as HTMLElement).style.transform = `translateX(${s.x.toFixed(2)}px)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    /* ── Scroll — navbar visibility ───────────────────────────────── */
    const handleScroll = () => {
      const sy    = window.scrollY;
      const delta = sy - lastScrollY;
      const vh    = window.innerHeight;
      const inQ   = (s1.slide > 0 && sy >= s1.top && sy < s1.top + s1.slide + vh) ||
                    (s2.slide > 0 && sy >= s2.top && sy < s2.top + s2.slide + vh);

      if (heroSection) {
        const rect   = heroSection.getBoundingClientRect();
        const inHero = rect.top < vh * 0.15 && rect.bottom > vh * 0.45;

        if      (inHero)      { navbarVisible = true; navbarFixed = true; }
        else if (inQ)         { navbarVisible = false; }
        else if (sy <= 20)    { navbarVisible = false; navbarFixed = true; }
        else if (delta >  8)  { navbarVisible = false; }
        else if (delta < -8)  { navbarVisible = true; }
      }

      lastScrollY = sy;
    };

    /* ── Pointer move — reveal navbar near top (mouse only) ──────── */
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !heroSection) return;
      const rect = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 &&
                     rect.bottom > window.innerHeight * 0.45;
      if (!inHero && e.movementY < 0 && e.clientY <= 180) navbarVisible = true;
    };

    /* ── Upward wheel re-shows navbar outside hero ───────────────── */
    const handleNavWheel = (e: WheelEvent) => {
      if (!heroSection || e.deltaY >= 0 || window.scrollY <= 20) return;
      const rect = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 &&
                     rect.bottom > window.innerHeight * 0.45;
      if (!inHero) navbarVisible = true;
    };

    /* ── Resize ──────────────────────────────────────────────────── */
    const handleResize = () => { setup(); };

    /* ── Init ────────────────────────────────────────────────────── */
    requestAnimationFrame(() => {
      setup();
      rafId = requestAnimationFrame(tick);
    });

    window.addEventListener('scroll',      handleScroll,      { passive: true });
    window.addEventListener('wheel',       handleNavWheel,    { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize',      handleResize,      { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll',      handleScroll);
      window.removeEventListener('wheel',       handleNavWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize',      handleResize);
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

    <!--
      ══ H-SHELL 1 — Q1 (lime, left) + Q2 (dark, right) ══════════
      Scrub: scrollY − shellTop drives translateX via RAF lerp.
      Shell height = 100vh + 100vw (one panel of slide).
      Sticky pins immediately at top:0 — no entry margin.
    -->
    <div class="question-shell" bind:this={shell1}>
      <div class="question-sticky">
        <div class="question-track" bind:this={track1}>

          <section class="question question--left question--lime">
            <h2>
              <span class="accent">MA </span>
              <span class="ghost">CHI SONO </span>
              <span class="accent">DAVVERO</span><br />
              <span class="accent">I VOLONTARI?</span>
            </h2>
          </section>

          <section class="question question--right question--dark">
            <h2>
              <span class="ghost">PERCHÉ </span>
              <span class="accent">HANNO DECISO</span><br />
              <span class="accent">DI CANDIDARSI?</span>
            </h2>
          </section>

        </div>
      </div>
    </div>

    <!--
      ── Vertical interlude between zones ─────────────────────────
      The margin-top on .question-shell below creates the vertical
      scroll segment between Q2 and Q3 ("third question = vertical").
    -->

    <!--
      ══ H-SHELL 2 — Q3 (lime, left) + Q4 (dark, right) ══════════
      Same scrub pattern, independent geometry.
    -->
    <div class="question-shell" bind:this={shell2}>
      <div class="question-sticky">
        <div class="question-track" bind:this={track2}>

          <section class="question question--left question--lime">
            <h2>
              <span class="ghost">COSA FACEVANO </span><br />
              <span class="accent">CONCRETAMENTE?</span>
            </h2>
          </section>

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
