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
   * MOUNT — ScrollSmoother + locked horizontal zones
   *
   * Exact GSAP homepage model:
   *
   *   ScrollSmoother({ smooth: 1.2 })
   *     → vTarget accumulates wheel/touch; vSmooth lerps toward it
   *     → window.scrollTo(vSmooth) every frame (sticky still works)
   *
   *   ScrollTrigger({ pin:true, scrub, end: "+=" + width })
   *   + horizontal zone LOCK:
   *     → on entry: vTarget freezes at shellTop (vertical stops)
   *     → all delta is redirected to hTarget for this shell
   *     → hSmooth lerps toward hTarget → track translateX = -hSmooth
   *     → on exit-right: vTarget jumps past shell, vertical resumes
   *     → on exit-left:  vTarget decreases, scroll goes up
   *
   * This gives:
   *   • Buttery smooth scroll everywhere (ScrollSmoother)
   *   • True vertical lock inside horizontal zones (no downward drift)
   *   • Only rightward progress while locked
   *   • Seamless V→H and H→V transitions
   * ═══════════════════════════════════════════════════════════════ */
  onMount(() => {

    /* ── Global smooth scroll state ─────────────────────────────── */
    let vTarget = window.scrollY;   // raw intent (accumulated deltas)
    let vSmooth = window.scrollY;   // lerped — the display scroll
    let vPrev   = window.scrollY;
    let rafId   = 0;

    /* GSAP ScrollSmoother smooth:1.2 ≈ 0.085 per frame at 60 fps */
    const LERP = 0.085;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    /* ── Per-shell state ─────────────────────────────────────────── */
    type S = { top: number; slide: number; hTarget: number; hSmooth: number };
    const s1: S = { top: 0, slide: 0, hTarget: 0, hSmooth: 0 };
    const s2: S = { top: 0, slide: 0, hTarget: 0, hSmooth: 0 };

    /* Currently locked shell (null = vertical mode) */
    let locked: S | null = null;

    /* Hero document-space bounds */
    let heroDocTop = 0, heroDocBot = 0;

    /* ── Setup ───────────────────────────────────────────────────── */
    const setup = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sy = window.scrollY;

      if (shell1 && track1) {
        s1.slide = (track1.children.length - 1) * vw;
        shell1.style.height = `${vh + s1.slide}px`;
        s1.top   = shell1.getBoundingClientRect().top + sy;
      }
      if (shell2 && track2) {
        s2.slide = (track2.children.length - 1) * vw;
        shell2.style.height = `${vh + s2.slide}px`;
        s2.top   = shell2.getBoundingClientRect().top + sy;
      }
      if (heroSection) {
        const r    = heroSection.getBoundingClientRect();
        heroDocTop = r.top    + sy;
        heroDocBot = r.bottom + sy;
      }
    };

    /* ── Lock detection — call from both wheel handler and tick ──── */
    function tryLock(sy: number) {
      if (locked !== null) return;
      for (const s of [s1, s2] as S[]) {
        if (s.slide > 0 && sy >= s.top && sy < s.top + s.slide) {
          /* Convert any vertical overshoot into initial h progress  */
          const overshoot   = Math.max(0, sy - s.top);
          s.hTarget         = clamp(overshoot, 0, s.slide);
          s.hSmooth         = s.hTarget;             // snap — no visual jump
          locked            = s;
          vTarget           = s.top;                 // freeze vertical
          vSmooth           = s.top;                 // snap smooth too
          window.scrollTo({ top: s.top, behavior: 'instant' });
          break;
        }
      }
    }

    /* ── RAF tick ────────────────────────────────────────────────── */
    const tick = () => {
      /* 1 ─ ScrollSmoother: lerp vSmooth toward vTarget */
      vSmooth       = lerp(vSmooth, vTarget, LERP);
      const vDelta  = vSmooth - vPrev;
      vPrev         = vSmooth;

      /* 2 ─ Entry detection (catches cases when lerp drifts into shell) */
      tryLock(vSmooth);

      /* 3 ─ Apply to browser (position:sticky reads window.scrollY) */
      const rounded = Math.round(vSmooth);
      if (Math.abs(rounded - window.scrollY) > 0) {
        window.scrollTo({ top: rounded, behavior: 'instant' });
      }

      const sy = vSmooth;
      const vh = window.innerHeight;

      /* 4 ─ Horizontal tracks */
      for (const [s, track] of [[s1, track1], [s2, track2]] as const) {
        if (s.slide <= 0 || !track) continue;
        (s as S).hSmooth = lerp((s as S).hSmooth, (s as S).hTarget, LERP);
        (track as HTMLElement).style.transform =
          `translateX(${(-(s as S).hSmooth).toFixed(2)}px)`;
      }

      /* 5 ─ Navbar */
      const inQ        = locked !== null;
      const heroTopVP  = heroDocTop - sy;
      const heroBotVP  = heroDocBot - sy;
      const inHero     = heroTopVP < vh * 0.15 && heroBotVP > vh * 0.45;

      if      (inHero)       { navbarVisible = true;  navbarFixed = true; }
      else if (inQ)          { navbarVisible = false; }
      else if (sy <= 20)     { navbarVisible = false; navbarFixed = true; }
      else if (vDelta >  5)  { navbarVisible = false; }
      else if (vDelta < -5)  { navbarVisible = true;  }

      rafId = requestAnimationFrame(tick);
    };

    /* ── Input helpers ───────────────────────────────────────────── */
    function applyDelta(delta: number) {
      /* If locked: redirect delta to horizontal, keep vertical frozen */
      if (locked !== null) {
        const s = locked;

        /* Scrolling left / up at the Q1 edge → exit backward */
        if (s.hTarget <= 0 && delta < 0) {
          locked  = null;
          vTarget = clamp(s.top + delta, 0, maxScroll());
          return;
        }
        /* Scrolling right / down past the last panel → exit forward.
           Snap vSmooth past the shell range so tryLock can't re-lock
           and reset hTarget to 0 (which would send user back to Q1). */
        if (s.hTarget >= s.slide && delta > 0) {
          locked        = null;
          const exitPos = s.top + s.slide + 1;
          vSmooth       = exitPos;
          vPrev         = exitPos;
          window.scrollTo({ top: exitPos, behavior: 'instant' });
          vTarget       = clamp(exitPos + delta, 0, maxScroll());
          return;
        }
        /* Still inside → advance/retreat horizontal */
        s.hTarget = clamp(s.hTarget + delta, 0, s.slide);
        return;
      }

      /* Vertical: check if delta would land inside a shell.
         Guard with vSmooth < s.top so we never re-lock a shell
         we already exited forward. */
      const projected = vSmooth + delta;
      for (const s of [s1, s2] as S[]) {
        if (s.slide > 0 && vSmooth < s.top && projected >= s.top && delta > 0) {
          /* About to enter — lock immediately */
          const excess  = projected - s.top;
          s.hTarget     = clamp(excess, 0, s.slide);
          s.hSmooth     = 0;
          locked        = s;
          vTarget       = s.top;
          vSmooth       = s.top;
          window.scrollTo({ top: s.top, behavior: 'instant' });
          return;
        }
      }

      vTarget = clamp(vTarget + delta, 0, maxScroll());
    }

    /* ── Wheel ───────────────────────────────────────────────────── */
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyDelta(e.deltaY);
    };

    /* ── Touch ───────────────────────────────────────────────────── */
    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const handleTouchMove  = (e: TouchEvent) => {
      e.preventDefault();
      const dy = touchY - e.touches[0].clientY;
      touchY   = e.touches[0].clientY;
      applyDelta(dy);
    };

    /* ── Keyboard ────────────────────────────────────────────────── */
    const handleKeydown = (e: KeyboardEvent) => {
      const map: Record<string, number> = {
        ArrowDown:  80,  ArrowUp:  -80,
        PageDown:   window.innerHeight * 0.85,
        PageUp:    -window.innerHeight * 0.85,
        ' ':        window.innerHeight * 0.85,
      };
      if (e.key === 'Home') { e.preventDefault(); locked = null; vTarget = 0;           return; }
      if (e.key === 'End')  { e.preventDefault(); locked = null; vTarget = maxScroll(); return; }
      const d = map[e.key];
      if (d === undefined) return;
      e.preventDefault();
      applyDelta(d);
    };

    /* ── External scroll sync (a11y / tab focus) ─────────────────── */
    const handleScroll = () => {
      if (locked !== null) return;
      if (Math.abs(window.scrollY - Math.round(vSmooth)) > 2) {
        vTarget = window.scrollY;
        vSmooth = window.scrollY;
      }
    };

    /* ── Pointer move — reveal navbar near top ───────────────────── */
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const inHero = (heroDocTop - vSmooth) < window.innerHeight * 0.15 &&
                     (heroDocBot - vSmooth) > window.innerHeight * 0.45;
      if (!inHero && e.movementY < 0 && e.clientY <= 180) navbarVisible = true;
    };

    /* ── Resize ──────────────────────────────────────────────────── */
    const handleResize = () => { locked = null; setup(); };

    /* ── Init ────────────────────────────────────────────────────── */
    requestAnimationFrame(() => {
      setup();
      rafId = requestAnimationFrame(tick);
    });

    window.addEventListener('wheel',       handleWheel,       { passive: false });
    window.addEventListener('touchstart',  handleTouchStart,  { passive: true  });
    window.addEventListener('touchmove',   handleTouchMove,   { passive: false });
    window.addEventListener('keydown',     handleKeydown);
    window.addEventListener('scroll',      handleScroll,      { passive: true  });
    window.addEventListener('pointermove', handlePointerMove, { passive: true  });
    window.addEventListener('resize',      handleResize,      { passive: true  });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel',       handleWheel);
      window.removeEventListener('touchstart',  handleTouchStart);
      window.removeEventListener('touchmove',   handleTouchMove);
      window.removeEventListener('keydown',     handleKeydown);
      window.removeEventListener('scroll',      handleScroll);
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
      ══ H-SHELL 2 — Q3 (lime, left) + Q4 (dark, right) ══════════
      margin-top on .question-shell provides the vertical scroll gap
      between shell1 and shell2. Same scrub pattern, independent geometry.
    -->
    <div class="question-shell" bind:this={shell2}>
      <div class="question-sticky">
        <div class="question-track" bind:this={track2}>

          <section class="question question--left question--lime">
            <h2>
              <span class="ghost">COSA FACEVANO</span><br />
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
