<script lang="ts">
  import { onMount } from "svelte";
  import { goto, afterNavigate, beforeNavigate } from "$app/navigation";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import ScrollArrow from "../lib/components/ScrollArrow.svelte";
  import { blurReveal } from "../lib/actions/blurReveal";
  import type { BlurRevealOptions } from "../lib/actions/blurReveal";
  import gsap from 'gsap';
  import { imgNavbar, imgStatusDefault, galleryImages } from "../lib/design/assets";
  import IntroLoader from "../lib/components/IntroLoader.svelte";

  /* ── Intro loader ─────────────────────────────────────────────── */
  let showIntro = $state(true);
  let introExiting = $state(false);
  let loaderProgress = $state(0);

  /* Volunteer portrait photos (Figma CDN) — cycle every 20 % of progress */
  const volunteers = [
    'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1',  // Rudy Bre
    'https://www.figma.com/api/mcp/asset/aa1bcc44-33a0-48b1-a75c-913f2d3630eb',  // Michele Tomolillo
    'https://www.figma.com/api/mcp/asset/331fa98b-1d4f-4c52-84df-2f4e0da7c169',  // Valentina Guerrini
  ];
  let loaderPhotoSrc = $state(volunteers[0]);
  let activeLoaderSet = $state(0);

  const loaderBlockLayouts: never[][] = [];

  
  /* ── Navbar state ─────────────────────────────────────────────── */
  let navbarVisible = $state(true);
  let navbarFixed = $state(true);

  /* ── DOM refs ────────────────────────────────────────────────── */
  let heroSection: HTMLElement | null = null;
  // Single continuous horizontal shell — all 4 questions in one track
  let shell1:           HTMLElement | null = null;
  let stickyEl1:        HTMLElement | null = null;  // sticky lens — receives --q-bg/--q-fg
  let track1:           HTMLElement | null = null;
  let veil1:            HTMLElement | null = null;
  let transitionOverlay: HTMLElement | null = null;  // fixed dissolve overlay for H→V exit

  // Question panel h2 refs — per-frame content animation targets
  let q1h2: HTMLElement | null = null;
  let q2h2: HTMLElement | null = null;
  let q3h2: HTMLElement | null = null;
  let q4h2: HTMLElement | null = null;

  /* ── Gallery / scroll cue ─────────────────────────────────────── */
  const galleryCount = 12;
  const offsetCount = 6;

  /* Gallery transition state — shared between click handler and scroll engine */
  let galleryTransitionPending = false;
  let galleryTimeline: gsap.core.Timeline | null = null;

  function navigateToGallery() {
    if (galleryTransitionPending) return;
    galleryTransitionPending = true;
    document.documentElement.dataset.galleryEntry = '1';

    const landing = document.querySelector<HTMLElement>('.landing');
    galleryTimeline = gsap.timeline();
    /* Blur + scale the page content out while the overlay fades in */
    if (landing) galleryTimeline.to(landing, { filter: 'blur(28px)', scale: 1.04, opacity: 0, duration: 0.48, ease: 'power2.in' }, 0);
    if (transitionOverlay) galleryTimeline.to(transitionOverlay, { opacity: 1, duration: 0.52, ease: 'power2.in' }, 0.06);
    galleryTimeline.call(() => { galleryTimeline = null; goto('/gallery'); });
  }

  /* Kill any in-flight gallery animation before a non-gallery navigation
     (e.g. logo click while the blur-out is still playing). */
  beforeNavigate(({ to }) => {
    if (to?.url.pathname !== '/gallery' && galleryTimeline) {
      galleryTimeline.kill();
      galleryTimeline = null;
    }
  });

  /* Arriving (back) on the homepage — reset every gallery animation flag and
     restore the landing element so scrolling works normally. */
  afterNavigate(() => {
    galleryTimeline?.kill();
    galleryTimeline = null;
    galleryTransitionPending = false;
    delete document.documentElement.dataset.galleryEntry;
    const landing = document.querySelector<HTMLElement>('.landing');
    if (landing) gsap.set(landing, { clearProps: 'filter,transform,opacity' });
    if (transitionOverlay) gsap.set(transitionOverlay, { opacity: 0 });
  });

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
   * MOUNT — sinuous scroll engine
   *
   * Architecture:
   *   • Single horizontal shell with all 4 questions in one track
   *   • Vertical LERP 0.070 / Horizontal LERP 0.078 — silkier than before
   *   • Per-frame panel content: opacity/blur/transform driven by
   *     distance from each panel's center — fully scrub-reversible
   *   • Color dissolve: --q-bg/--q-fg on stickyEl1 interpolate
   *     between #bdff5d and #0e0e0e at every panel boundary
   *   • Blur-veil: BLUR_DECAY 0.93 → ~1.4 s cinematic tail
   *   • GSAP scale pulse on V→H entry and H→V exit
   * ═══════════════════════════════════════════════════════════════ */
  onMount(() => {

    /* ── Global smooth scroll state ─────────────────────────────── */
    let vTarget = window.scrollY;
    let vSmooth = window.scrollY;
    let vPrev   = window.scrollY;
    let rafId   = 0;

    const LERP       = 0.070;  // sinuous vertical — settles in ~700 ms
    const LERP_H     = 0.078;  // horizontal — slightly faster, still silky
    const BLUR_DECAY = 0.93;   // blur tail ~1.4 s at 60 fps

    /* Blur-veil state */
    let fb1 = 0;
    let h1p = 0;

    /* ── Color dissolve palette ─────────────────────────────────────
       4 panels: lime, dark, lime, dark — bg and text are inverses.
       Dissolve spans 28%–72% of each panel width (centred at boundary). */
    const LIME = [189, 255, 93]  as const;
    const DARK = [14,  14,  14]  as const;
    type Rgb = readonly [number, number, number];
    const panelBg:   Rgb[] = [LIME, DARK, LIME, DARK];
    const panelText: Rgb[] = [DARK, LIME, DARK, LIME];

    /* ── Cached span arrays for hot RAF path ────────────────────── */
    let pSpans: HTMLElement[][] = [[], [], [], []];

    function cacheSpans() {
      pSpans = [q1h2, q2h2, q3h2, q4h2].map(h =>
        h ? (Array.from(h.querySelectorAll('span')) as HTMLElement[]) : []
      );
    }

    /* ── Dissolve gate — freezes tick during H→V transition ─────── */
    let dissolving = false;

    /* ── Horizontal velocity — direction-aware blur ──────────────── */
    let hPrevH = 0;

    /* ── Lock-change detection for GSAP entry/exit pulse ─────────── */
    let prevLocked: typeof locked = null;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
    function ss(t: number) { return t * t * (3 - 2 * t); }  // smoothstep
    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    /* ── Single shell state ──────────────────────────────────────── */
    type S = { top: number; slide: number; hTarget: number; hSmooth: number };
    const s1: S = { top: 0, slide: 0, hTarget: 0, hSmooth: 0 };

    let locked: S | null = null;
    let heroDocTop = 0, heroDocBot = 0;
    let galleryReady = false;
    /* Prevents accidental re-trigger when the browser restores scroll to the
       bottom (e.g. back-navigation).  Lifted once the user scrolls ≥ 120 px
       away from the bottom, proving they are intentionally navigating down. */
    let galleryGuard = false;

    /* ── Setup ───────────────────────────────────────────────────── */
    const setup = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sy = window.scrollY;

      if (shell1 && track1) {
        s1.slide = (track1.children.length - 1) * vw;  // 4 panels → 3 × vw
        shell1.style.height = `${vh + s1.slide}px`;
        s1.top   = shell1.getBoundingClientRect().top + sy;
      }
      if (heroSection) {
        const r    = heroSection.getBoundingClientRect();
        heroDocTop = r.top    + sy;
        heroDocBot = r.bottom + sy;
      }
    };

    /* ── Blur spike ─────────────────────────────────────────────── */
    function blurSpike() { fb1 = 22; }

    /* ── Lock detection ─────────────────────────────────────────── */
    function tryLock(sy: number) {
      if (locked !== null) return;
      if (s1.slide > 0 && sy >= s1.top && sy < s1.top + s1.slide) {
        const overshoot = Math.max(0, sy - s1.top);
        s1.hTarget      = clamp(overshoot, 0, s1.slide);
        s1.hSmooth      = s1.hTarget;
        locked          = s1;
        vTarget         = s1.top;
        vSmooth         = s1.top;
        window.scrollTo({ top: s1.top, behavior: 'instant' });
        blurSpike();
      }
    }

    /* ── RAF tick ────────────────────────────────────────────────── */
    const tick = () => {
      /* 0 ─ Dissolve gate OR gallery exit — overlay covers the viewport; pause scroll */
      if (dissolving || galleryTransitionPending) { rafId = requestAnimationFrame(tick); return; }

      /* 1 ─ Vertical LERP */
      vSmooth      = lerp(vSmooth, vTarget, LERP);
      const vDelta = vSmooth - vPrev;
      vPrev        = vSmooth;

      /* 2 ─ Entry detection */
      tryLock(vSmooth);

      /* 3 ─ Sync browser scroll (sticky reads window.scrollY) */
      const rounded = Math.round(vSmooth);
      if (Math.abs(rounded - window.scrollY) > 0) {
        window.scrollTo({ top: rounded, behavior: 'instant' });
      }

      const sy = vSmooth;
      const vh = window.innerHeight;
      const VW = window.innerWidth;

      /* 4 ─ Horizontal track + blur-veil */
      fb1 = Math.max(0, fb1 * BLUR_DECAY);

      if (s1.slide > 0 && track1) {
        s1.hSmooth = lerp(s1.hSmooth, s1.hTarget, LERP_H);
        track1.style.transform = `translateX(${(-s1.hSmooth).toFixed(2)}px)`;
        const velBlur = Math.abs(s1.hSmooth - h1p) * 0.045;
        const b1      = Math.min(fb1 + velBlur, 22);
        if (veil1) veil1.style.backdropFilter = b1 > 0.08 ? `blur(${b1.toFixed(1)}px)` : '';
        h1p = s1.hSmooth;
      }

      /* Horizontal velocity — positive = moving right (forward), negative = backward */
      const hVel      = s1.hSmooth - hPrevH;
      hPrevH          = s1.hSmooth;
      const goingBack = hVel < -0.6;  // meaningful backward motion threshold

      /* 5 ─ Per-frame panel content (scrub-reversible, no fire-once)
             Each span's opacity/blur/transform follows its panel's
             distance from the viewport centre — closer = more visible. */
      if (s1.slide > 0) {
        const hp      = s1.hSmooth;
        const centers = [0, VW, 2 * VW, 3 * VW];

        for (let pi = 0; pi < 4; pi++) {
          const dist = Math.abs(hp - centers[pi]) / VW;   // 0=centred, 1=adjacent
          const raw  = clamp(1 - dist * 1.65, 0, 1);
          const vis  = ss(raw);                            // smoothstep visibility

          const spans = pSpans[pi];
          for (let si = 0; si < spans.length; si++) {
            /* Stagger: later spans lag by 0.05 per index */
            const sv  = clamp(vis - si * 0.05, 0, 1);
            const sv3 = ss(sv);
            const span = spans[si];
            if (sv3 >= 0.9995) {
              span.style.opacity   = '1';
              span.style.filter    = '';
              span.style.transform = 'none';
            } else {
              const inv = 1 - sv3;
              span.style.opacity = sv3.toFixed(3);
              if (goingBack) {
                /* Backward scroll: gentle fade only — no heavy blur/drift.
                   Panels surface softly rather than re-performing their entry. */
                span.style.filter    = inv > 0.02 ? `blur(${(inv * 4).toFixed(1)}px)` : '';
                span.style.transform = `translateY(${(inv * 10).toFixed(1)}px) scale(${(1 - inv * 0.015).toFixed(4)})`;
              } else {
                /* Forward scroll: full cinematic entrance */
                span.style.filter    = `blur(${(inv * 26).toFixed(1)}px)`;
                span.style.transform = `translateY(${(inv * 36).toFixed(1)}px) scale(${(1 - inv * 0.06).toFixed(4)})`;
              }
            }
          }
        }

        /* 6 ─ Color dissolve: bg + text on stickyEl1 */
        if (stickyEl1) {
          const t     = clamp(s1.hSmooth / VW, 0, 2.9999);
          const idx   = Math.floor(t);
          const local = t - idx;
          /* Dissolve window: 28 %–72 % of each panel (tight cinematic blend) */
          const blend = clamp((local - 0.28) / 0.44, 0, 1);
          const eb    = ss(blend);
          const ni    = Math.min(idx + 1, 3);

          const bg  = panelBg[idx].map( (v, i) => Math.round(v + (panelBg[ni][i]  - v) * eb));
          const txt = panelText[idx].map((v, i) => Math.round(v + (panelText[ni][i] - v) * eb));
          stickyEl1.style.setProperty('--q-bg',  `rgb(${bg.join(',')})`);
          stickyEl1.style.setProperty('--q-fg',  `rgb(${txt.join(',')})`);
        }
      }

      /* 7 ─ GSAP scale pulse on lock-change
             Entry pulse: only when entering from the top (hSmooth near 0)
             so re-entering from below at Q4 doesn't re-pulse Q4.
             Exit pulse: only when the shell is still near the viewport
             (backward exit), not after the dissolve overlay exit.     */
      if (locked !== prevLocked) {
        if (locked === s1 && track1) {
          const enteringFromTop = s1.hSmooth < s1.slide * 0.08;
          if (enteringFromTop) {
            gsap.fromTo(track1,
              { scale: 1.014 },
              { scale: 1, duration: 0.70, ease: 'power3.out', overwrite: true }
            );
          }
        }
        if (prevLocked === s1 && locked === null && track1) {
          const shellNearViewport = Math.abs(vSmooth - s1.top) < vh * 1.5;
          if (shellNearViewport) {
            gsap.fromTo(track1,
              { scale: 0.988 },
              { scale: 1, duration: 0.55, ease: 'power2.out', overwrite: true }
            );
          }
        }
        prevLocked = locked;
      }

      /* 8 ─ Hero parallax */
      if (heroDocBot > heroDocTop) {
        const heroLen = (heroDocBot - heroDocTop) * 0.70;
        const heroP   = clamp((sy - heroDocTop) / heroLen, 0, 1);
        document.documentElement.style.setProperty('--hero-scroll-p', heroP.toFixed(3));
      }

      /* 9 ─ Navbar */
      const inQ       = locked !== null;
      const heroTopVP = heroDocTop - sy;
      const heroBotVP = heroDocBot - sy;
      const inHero    = heroTopVP < vh * 0.15 && heroBotVP > vh * 0.45;

      if      (inHero)       { navbarVisible = true;  navbarFixed = true; }
      else if (inQ)          { navbarVisible = false; }
      else if (sy <= 20)     { navbarVisible = false; navbarFixed = true; }
      else if (vDelta >  5)  { navbarVisible = false; }
      else if (vDelta < -5)  { navbarVisible = true;  }

      rafId = requestAnimationFrame(tick);
    };

    /* ── Input helpers ───────────────────────────────────────────── */
    function applyDelta(delta: number) {
      if (galleryTransitionPending) return;
      if (locked !== null) {
        /* Backward exit at left edge */
        if (s1.hTarget <= 0 && delta < 0) {
          locked  = null;
          blurSpike();
          vTarget = clamp(s1.top + delta, 0, maxScroll());
          return;
        }
        /* Forward exit past last panel — cinematic dissolve overlay */
        if (s1.hTarget >= s1.slide && delta > 0) {
          locked     = null;
          dissolving = true;
          blurSpike();

          const exitPos    = s1.top + s1.slide + 1;
          const exitTarget = clamp(exitPos + delta, 0, maxScroll());

          if (transitionOverlay) {
            /* Fade overlay in → snap scroll position (hidden) → fade out */
            gsap.timeline()
              .to(transitionOverlay,    { opacity: 1, duration: 0.28, ease: 'power2.in' })
              .call(() => {
                vSmooth = exitPos;
                vPrev   = exitPos;
                vTarget = exitTarget;
                window.scrollTo({ top: exitPos, behavior: 'instant' });
              })
              .to(transitionOverlay,    { opacity: 0, duration: 0.72, ease: 'power2.out', delay: 0.06 })
              .call(() => { dissolving = false; });
          } else {
            vSmooth    = exitPos;
            vPrev      = exitPos;
            vTarget    = exitTarget;
            window.scrollTo({ top: exitPos, behavior: 'instant' });
            dissolving = false;
          }
          return;
        }
        s1.hTarget = clamp(s1.hTarget + delta, 0, s1.slide);
        return;
      }

      /* Vertical — intercept if delta would land inside the shell */
      const projected = vSmooth + delta;
      if (s1.slide > 0 && vSmooth < s1.top && projected >= s1.top && delta > 0) {
        const excess = projected - s1.top;
        s1.hTarget   = clamp(excess, 0, s1.slide);
        s1.hSmooth   = 0;
        locked       = s1;
        vTarget      = s1.top;
        vSmooth      = s1.top;
        window.scrollTo({ top: s1.top, behavior: 'instant' });
        blurSpike();
        return;
      }

      vTarget = clamp(vTarget + delta, 0, maxScroll());

      /* Lift guard once the user has scrolled ≥ 120 px away from the bottom. */
      if (galleryGuard && vTarget < maxScroll() - 120) galleryGuard = false;

      /* Gallery scroll trigger — requires two scroll events at the bottom:
         first lands at maxScroll (sets galleryReady), second fires the exit.
         galleryGuard blocks this entirely when the page opened already-at-bottom. */
      if (delta > 0) {
        if (!galleryGuard && vTarget >= maxScroll()) {
          if (galleryReady) { navigateToGallery(); }
          else              { galleryReady = true;  }
        }
      } else if (delta < 0) {
        galleryReady = false;
      }
    }

    /* ── Wheel ───────────────────────────────────────────────────── */
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (dissolving) return;
      applyDelta(e.deltaY);
    };

    /* ── Touch ───────────────────────────────────────────────────── */
    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const handleTouchMove  = (e: TouchEvent) => {
      e.preventDefault();
      if (dissolving) return;
      const dy = touchY - e.touches[0].clientY;
      touchY   = e.touches[0].clientY;
      applyDelta(dy);
    };

    /* ── Keyboard ────────────────────────────────────────────────── */
    const handleKeydown = (e: KeyboardEvent) => {
      if (dissolving) return;
      const map: Record<string, number> = {
        ArrowDown:  80, ArrowUp:  -80,
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

    /* ── External scroll sync ────────────────────────────────────── */
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
    const handleResize = () => { locked = null; cacheSpans(); setup(); };

    /* ── Init ────────────────────────────────────────────────────── */
    requestAnimationFrame(() => {
      cacheSpans();
      setup();
      /* If the page was restored to (or near) the bottom — e.g. browser back —
         arm the guard so the gallery cannot fire until the user first scrolls
         meaningfully upward. */
      galleryGuard = window.scrollY >= maxScroll() - 120;
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
      dissolving = false;
      if (transitionOverlay) gsap.killTweensOf(transitionOverlay);
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
  <!-- Fixed overlay for cinematic H→V dissolve transition -->
  <div class="transition-overlay" bind:this={transitionOverlay}></div>

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
      ══ SINGLE HORIZONTAL SHELL — Q1 → Q2 → Q3 → Q4 ═════════════
      All 4 questions in one continuous track.
      Shell height = 100vh + 3 × 100vw (4 panels, 3 widths of slide).
      Color dissolve and per-frame content animation driven from JS.
    -->
    <div class="question-shell" bind:this={shell1}>
      <div class="question-sticky" bind:this={stickyEl1}>
        <div class="question-track" bind:this={track1}>

          <section class="question question--left question--lime">
            <h2 bind:this={q1h2}>
              <span class="accent">MA </span>
              <span class="ghost">CHI SONO </span>
              <span class="accent">DAVVERO</span><br />
              <span class="accent">I VOLONTARI?</span>
            </h2>
          </section>

          <section class="question question--right question--dark">
            <h2 bind:this={q2h2}>
              <span class="ghost">PERCHÉ </span>
              <span class="accent">HANNO DECISO</span><br />
              <span class="accent">DI CANDIDARSI?</span>
            </h2>
          </section>

          <section class="question question--left question--lime">
            <h2 bind:this={q3h2}>
              <span class="ghost">COSA FACEVANO</span><br />
              <span class="accent">CONCRETAMENTE?</span>
            </h2>
          </section>

          <section class="question question--right question--dark">
            <h2 bind:this={q4h2}>
              <span class="accent">NE È VALSA LA PENA?</span><br />
              <span class="ghost">LO RIFAREBBERO</span><span class="accent">?</span>
            </h2>
          </section>

        </div>
        <div class="question-blur-veil" bind:this={veil1}></div>
      </div>
    </div>

    <!-- ── Post-question (vertical resumes) ─────────────────────── -->
    <section class="story story--left story--summary"
      use:blurReveal={{ direction: "left", threshold: 0.25, blur: 36, duration: 1100, variant: "cinema" }}>
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

  /* GSAP transforms require block/inline-block — spans are inline by default */
  :global(.question h2 span) {
    display: inline-block;
    will-change: transform, opacity, filter;
  }

  /* Cinematic H→V exit overlay — fades in/out via GSAP to cover the scroll snap */
  .transition-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    background: var(--color-background-primary, #0e0e0e);
    opacity: 0;
    will-change: opacity;
  }
</style>
