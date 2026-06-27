<script module lang="ts">
  /* Module-scoped so it survives in-app (soft) navigations: returning to the
     homepage via the logo skips the loading-page intro and shows only the
     title's appearance animation. A full browser refresh resets this flag, so
     a refresh replays the full loader + entrance. */
  let introPlayed = false;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto, afterNavigate, beforeNavigate } from "$app/navigation";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import { blurReveal } from "../lib/actions/blurReveal";
  import type { BlurRevealOptions } from "../lib/actions/blurReveal";
  import gsap from 'gsap';
  import { fetchAllVolunteers, getCachedVolunteers, getOptimizedImageUrl } from '$lib/data/volunteers';
  import { navbarInverted, navbarHidden } from '$lib/stores/navbar';
  import IntroLoader from "../lib/components/IntroLoader.svelte";

  /* ── Intro loader ─────────────────────────────────────────────────
     First visit shows the loading-page intro; returning via the logo skips it
     and plays only the title's appearance animation (BlurTitle `quick`). */
  const introSeen = browser && introPlayed;
  let showIntro = $state(!introSeen);
  let introExiting = $state(false);
  let loaderProgress = $state(0);


  /* ── DOM refs ────────────────────────────────────────────────── */
  let heroSection: HTMLElement | null = null;
  let shell1:           HTMLElement | null = null;
  let stickyEl1:        HTMLElement | null = null;
  let track1:           HTMLElement | null = null;
  let veil1:            HTMLElement | null = null;
  let transitionOverlay: HTMLElement | null = null;
  let galleryGate: HTMLElement | null = null; 

  let q1h2: HTMLElement | null = null;
  let q2h2: HTMLElement | null = null;
  let q3h2: HTMLElement | null = null;
  let q4h2: HTMLElement | null = null;

  /* ── Gallery anticipation preview ───────────────────────────────── */
  const PREVIEW_WIDTH = 420;

  const previewLayout = [
    { left: '7%',  top: '16%', w: 250, dx: -64, dy: 28, b: 22, ar: '4 / 3',  rot: -1.4 },
    { left: '68%', top: '11%', w: 300, dx:  72, dy: 22, b: 26, ar: '16 / 9', rot:  0.9 },
    { left: '52%', top: '57%', w: 220, dx:  44, dy: 52, b: 20, ar: '3 / 4',  rot:  1.2 },
    { left: '16%', top: '60%', w: 280, dx: -52, dy: 46, b: 24, ar: '3 / 2',  rot: -0.8 },
    { left: '37%', top: '33%', w: 320, dx:   0, dy: 60, b: 18, ar: '16 / 9', rot:  0.4 },
    { left: '81%', top: '62%', w: 210, dx:  84, dy: 38, b: 28, ar: '4 / 3',  rot:  1.6 },
  ];

  function buildPreviewPhotos(vols: ReturnType<typeof getCachedVolunteers>): string[] {
    return vols
      .filter(v => v.ha_immagini)
      .flatMap(v =>
        v.image_paths && v.image_paths.length > 0
          ? v.image_paths.slice(0, 1)
          : v.image_path ? [v.image_path] : []
      )
      .slice(0, previewLayout.length)
      .map(p => getOptimizedImageUrl(p, { width: PREVIEW_WIDTH, resize: 'contain' }))
      .filter((u): u is string => !!u);
  }

  let previewPhotos = $state<string[]>(buildPreviewPhotos(getCachedVolunteers()));

  $effect(() => {
    if (typeof window === 'undefined') return;
    for (const src of previewPhotos) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    }
  });

  let galleryTransitionPending = false;
  let galleryTimeline: gsap.core.Timeline | null = null;

  function navigateToGallery() {
    if (galleryTransitionPending) return;
    galleryTransitionPending = true;
    document.documentElement.dataset.galleryEntry = '1';

    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion) {
      galleryTimeline = null;
      goto('/gallery');
      return;
    }

    const landing = document.querySelector<HTMLElement>('.landing');
    galleryTimeline = gsap.timeline();
    
    if (landing) galleryTimeline.to(landing, { scale: 1.04, opacity: 0, duration: 0.44, ease: 'power2.in' }, 0);
    if (transitionOverlay) galleryTimeline.to(transitionOverlay, { opacity: 1, duration: 0.5, ease: 'power2.in' }, 0.04);
    galleryTimeline.call(() => { galleryTimeline = null; goto('/gallery'); });
  }

  beforeNavigate(({ to }) => {
    if (to?.url.pathname !== '/gallery' && galleryTimeline) {
      galleryTimeline.kill();
      galleryTimeline = null;
    }
  });

  afterNavigate(() => {
    galleryTimeline?.kill();
    galleryTimeline = null;
    galleryTransitionPending = false;

    delete document.documentElement.dataset.galleryEntry;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.setProperty('--gate-p', '0');

    const landing = document.querySelector<HTMLElement>('.landing');
    if (landing) gsap.set(landing, { clearProps: 'filter,transform,opacity' });
    if (transitionOverlay) gsap.set(transitionOverlay, { opacity: 0 });
  });

  let loaderRaf = 0;
  let exitTimeout: ReturnType<typeof setTimeout> | undefined;

  const fadeReveal: BlurRevealOptions = { variant: "fade", blur: 24, duration: 1000, threshold: 0.15 };
  const fadeRevealDelayed: BlurRevealOptions = { variant: "fade", blur: 24, duration: 1000, threshold: 0.15, delay: 120 };

  onMount(() => {
    if (introSeen) return;

    const DURATION = 4800;
    const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    let startT: number | null = null;

    const step = (now: number) => {
      if (startT === null) startT = now;
      const t = Math.min(1, (now - startT) / DURATION);
      loaderProgress = ease(t) * 100;

      if (t < 1) {
        loaderRaf = requestAnimationFrame(step);
        return;
      }
      loaderProgress = 100;
      introPlayed = true;

      exitTimeout = setTimeout(() => {
        introExiting = true;
        exitTimeout = setTimeout(() => { showIntro = false; }, 2100);
      }, 560);
    };
    loaderRaf = requestAnimationFrame(step);

    return () => {
      if (loaderRaf) cancelAnimationFrame(loaderRaf);
      if (exitTimeout) clearTimeout(exitTimeout);
    };
  });

  onMount(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingTop = '';

    let vTarget = window.scrollY;
    let vSmooth = window.scrollY;
    let vPrev   = window.scrollY;
    let rafId   = 0;

    const LERP       = 0.070;
    const LERP_H     = 0.078;
    const BLUR_DECAY = 0.93;

    let fb1 = 0;
    let h1p = 0;
    let pageZoom = parseFloat(document.documentElement.style.zoom) || 1;

    const LIME = [189, 255, 93]  as const;
    const DARK = [14,  14,  14]  as const;
    type Rgb = readonly [number, number, number];
    const panelBg:   Rgb[] = [LIME, DARK, LIME, DARK];
    const panelText: Rgb[] = [DARK, LIME, DARK, LIME];

    let pSpans: HTMLElement[][] = [[], [], [], []];

    function cacheSpans() {
      pSpans = [q1h2, q2h2, q3h2, q4h2].map(h =>
        h ? (Array.from(h.querySelectorAll('span')) as HTMLElement[]) : []
      );
    }

    let dissolving = false;
    let hPrevH = 0;
    let prevLocked: typeof locked = null;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
    function ss(t: number) { return t * t * (3 - 2 * t); } 
    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    type S = { top: number; slide: number; hTarget: number; hSmooth: number };
    const s1: S = { top: 0, slide: 0, hTarget: 0, hSmooth: 0 };

    let locked: S | null = null;
    let heroDocTop = 0, heroDocBot = 0;
    let gateTop = 0, gateHeight = 0;
    let galleryReady = false;
    let galleryGuard = false;

    const setup = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sy = window.scrollY;
      pageZoom = parseFloat(document.documentElement.style.zoom) || 1;

      const isMobile = vw < 600;
      if (!isMobile && shell1 && track1) {
        s1.slide = (track1.children.length - 1) * vw;
        shell1.style.height = `${(vh + s1.slide) / pageZoom}px`;
        s1.top   = shell1.getBoundingClientRect().top + sy;
      } else if (isMobile && shell1) {
        s1.slide   = 0;
        s1.hTarget = 0;
        s1.hSmooth = 0;
        shell1.style.height = '';
      }
      if (heroSection) {
        const r    = heroSection.getBoundingClientRect();
        heroDocTop = r.top    + sy;
        heroDocBot = r.bottom + sy;
      }
      if (galleryGate) {
        const r    = galleryGate.getBoundingClientRect();
        gateTop    = r.top + sy;
        gateHeight = r.height;
      }
    };

    function blurSpike() { fb1 = 22; }

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

    const tick = () => {
      if (dissolving || galleryTransitionPending) { rafId = requestAnimationFrame(tick); return; }

      vSmooth      = lerp(vSmooth, vTarget, LERP);
      const vDelta = vSmooth - vPrev;
      vPrev        = vSmooth;

      tryLock(vSmooth);

      const rounded = Math.round(vSmooth);
      if (Math.abs(rounded - window.scrollY) > 0) {
        window.scrollTo({ top: rounded, behavior: 'instant' });
      }

      const sy = vSmooth;
      const vh = window.innerHeight;
      const VW = window.innerWidth;

      fb1 = Math.max(0, fb1 * BLUR_DECAY);

      if (s1.slide > 0 && track1) {
        s1.hSmooth = lerp(s1.hSmooth, s1.hTarget, LERP_H);
        track1.style.transform = `translateX(${(-s1.hSmooth / pageZoom).toFixed(2)}px)`;
        const velBlur = Math.abs(s1.hSmooth - h1p) * 0.045;
        const b1      = Math.min(fb1 + velBlur, 22);
        if (veil1) veil1.style.backdropFilter = b1 > 0.08 ? `blur(${b1.toFixed(1)}px)` : '';
        h1p = s1.hSmooth;
      }

      const hVel      = s1.hSmooth - hPrevH;
      hPrevH          = s1.hSmooth;
      const goingBack = hVel < -0.6;

      if (s1.slide > 0) {
        const hp      = s1.hSmooth;
        const centers = [0, VW, 2 * VW, 3 * VW];

        for (let pi = 0; pi < 4; pi++) {
          const dist = Math.abs(hp - centers[pi]) / VW; 
          const raw  = clamp(1.1 - dist * 1.5, 0, 1);
          const vis  = ss(raw); 

          const spans = pSpans[pi];
          for (let si = 0; si < spans.length; si++) {
            const sv  = clamp(vis - si * 0.07, 0, 1);
            const sv3 = ss(sv);
            const span = spans[si];
            if (sv3 >= 0.9995 || vis >= 0.9995) {
              span.style.opacity   = '1';
              span.style.transform = 'none';
            } else {
              const inv = 1 - sv3;
              span.style.opacity = sv3.toFixed(3);
              if (goingBack) {
                /* Solo scivolamento orizzontale all'indietro (nessun salto in altezza o zoom) */
                span.style.transform = `translateX(${(-inv * 20).toFixed(1)}px)`;
              } else {
                /* Solo scivolamento orizzontale in avanti (nessun salto in altezza o zoom) */
                span.style.transform = `translateX(${(inv * 20).toFixed(1)}px)`;
              }
            }
          }
        }

        if (stickyEl1) {
          const t     = clamp(s1.hSmooth / VW, 0, 2.9999);
          const idx   = Math.floor(t);
          const local = t - idx;
          const blend = clamp((local - 0.28) / 0.44, 0, 1);
          const eb    = ss(blend);
          const ni    = Math.min(idx + 1, 3);

          const bg  = panelBg[idx].map( (v, i) => Math.round(v + (panelBg[ni][i]  - v) * eb));
          const txt = panelText[idx].map((v, i) => Math.round(v + (panelText[ni][i] - v) * eb));
          stickyEl1.style.setProperty('--q-bg',  `rgb(${bg.join(',')})`);
          stickyEl1.style.setProperty('--q-fg',  `rgb(${txt.join(',')})`);
        }
      }

      if (locked !== prevLocked) {
        const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (locked === s1 && track1) {
          const enteringFromTop = s1.hSmooth < s1.slide * 0.08;
          if (enteringFromTop && !noMotion) {
            gsap.fromTo(track1,
              { scale: 1.026 },
              { scale: 1, duration: 0.80, ease: 'power3.out', overwrite: true }
            );
          }
        }
        if (prevLocked === s1 && locked === null && track1) {
          const shellNearViewport = Math.abs(vSmooth - s1.top) < vh * 1.5;
          if (shellNearViewport && !noMotion) {
            gsap.fromTo(track1,
              { scale: 0.982 },
              { scale: 1, duration: 0.65, ease: 'power2.out', overwrite: true }
            );
          }
        }
        prevLocked = locked;
      }

      if (heroDocBot > heroDocTop) {
        const heroLen = (heroDocBot - heroDocTop) * 0.70;
        const heroP   = clamp((sy - heroDocTop) / heroLen, 0, 1);
        document.documentElement.style.setProperty('--hero-scroll-p', heroP.toFixed(3));
      }

      if (gateHeight > 0) {
        const raw   = clamp((sy - gateTop + vh) / gateHeight, 0, 1);
        const gateP = ss(clamp((raw - 0.12) / 0.88, 0, 1));
        document.documentElement.style.setProperty('--gate-p', gateP.toFixed(3));
      }

      const inQ       = locked !== null;
      const heroTopVP = heroDocTop - sy;
      const heroBotVP = heroDocBot - sy;
      const inHero    = heroTopVP < vh * 0.15 && heroBotVP > vh * 0.45;

      if      (inHero)       { navbarHidden.set(false); }
      else if (inQ)          { navbarHidden.set(true);  }
      else if (sy <= 20)     { navbarHidden.set(false); }
      else if (vDelta >  5)  { navbarHidden.set(true);  }
      else if (vDelta < -5)  { navbarHidden.set(false); }

      if (inQ && s1.slide > 0) {
        const t2     = clamp(s1.hSmooth / VW, 0, 2.9999);
        const i2     = Math.floor(t2);
        const l2     = t2 - i2;
        const blend2 = clamp((l2 - 0.28) / 0.44, 0, 1);
        const eb2    = ss(blend2);
        const ni2    = Math.min(i2 + 1, 3);
        const green  = Math.round(panelBg[i2][1] + (panelBg[ni2][1] - panelBg[i2][1]) * eb2);
        navbarInverted.set(green > 128);
      } else if (window.innerWidth < 600 && shell1) {
        const r = shell1.getBoundingClientRect();
        navbarInverted.set(r.top <= 0 && r.bottom > 0);
      } else {
        navbarInverted.set(false);
      }

      rafId = requestAnimationFrame(tick);
    };

    function applyDelta(delta: number) {
      if (galleryTransitionPending) return;
      if (locked !== null) {
        if (s1.hTarget <= 0 && delta < 0) {
          locked  = null;
          blurSpike();
          vTarget = clamp(s1.top + delta, 0, maxScroll());
          return;
        }
        if (s1.hTarget >= s1.slide && delta > 0) {
          locked     = null;
          dissolving = true;
          blurSpike();

          const exitPos    = s1.top + s1.slide + 1;
          const exitTarget = clamp(exitPos + delta, 0, maxScroll());

          if (transitionOverlay) {
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

      if (galleryGuard && vTarget < maxScroll() - 120) galleryGuard = false;

      if (delta > 0) {
        if (!galleryGuard && vTarget >= maxScroll()) {
          if (galleryReady) { navigateToGallery(); }
          else              { galleryReady = true;  }
        }
      } else if (delta < 0) {
        galleryReady = false;
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (dissolving) return;
      applyDelta(e.deltaY);
    };

    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const handleTouchMove  = (e: TouchEvent) => {
      e.preventDefault();
      if (dissolving) return;
      const dy = touchY - e.touches[0].clientY;
      touchY   = e.touches[0].clientY;
      applyDelta(dy);
    };

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

    const handleScroll = () => {
      if (locked !== null) return;
      if (Math.abs(window.scrollY - Math.round(vSmooth)) > 2) {
        vTarget = window.scrollY;
        vSmooth = window.scrollY;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const inHero = (heroDocTop - vSmooth) < window.innerHeight * 0.15 &&
                     (heroDocBot - vSmooth) > window.innerHeight * 0.45;
      if (!inHero && e.movementY < 0 && e.clientY <= 180) navbarHidden.set(false);
    };

    const handleResize = () => { locked = null; cacheSpans(); requestAnimationFrame(setup); };

    requestAnimationFrame(() => {
      cacheSpans();
      setup();
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

    fetchAllVolunteers().then(vols => { previewPhotos = buildPreviewPhotos(vols); });

    return () => {
      dissolving = false;
      navbarInverted.set(false);
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
  {loaderProgress}
/>

<div class="site">
  <div class="transition-overlay" bind:this={transitionOverlay}></div>

  <main class="landing" id="main-content">
    <section class="hero-outer" bind:this={heroSection}>
      <div class="hero-inner">
        <BlurTitle quick={introSeen} />
      </div>
    </section>

    <section class="story story--left story--intro safe-area"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 24 }}>
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <section class="story story--right story--numbers safe-area"
      use:blurReveal={{ direction: "right", variant: "skew", blur: 28 }}>
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <section class="story story--quote story--quote-left safe-area"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 20, threshold: 0.15 }}>
      <p class="quote">
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
      </p>
    </section>

    <section class="story story--quote story--quote-right safe-area"
      use:blurReveal={{ direction: "right", variant: "slide", blur: 20, threshold: 0.15, delay: 150 }}>
      <p class="quote">
        Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <div class="question-shell" bind:this={shell1}>
      <div class="question-sticky" bind:this={stickyEl1}>
        <div class="question-track" bind:this={track1}>

          <section class="question question--left question--lime safe-area">
            <h2 bind:this={q1h2}>
              <span class="accent">MA </span>
              <span class="ghost">CHI SONO </span>
              <span class="accent">DAVVERO</span><br />
              <span class="accent">I VOLONTARI?</span>
            </h2>
          </section>

          <section class="question question--right question--dark safe-area">
            <h2 bind:this={q2h2}>
              <span class="ghost">PERCHÉ </span>
              <span class="accent">HANNO DECISO</span><br />
              <span class="accent">DI CANDIDARSI?</span>
            </h2>
          </section>

          <section class="question question--left question--lime safe-area">
            <h2 bind:this={q3h2}>
              <span class="ghost">COSA FACEVANO</span><br />
              <span class="accent">CONCRETAMENTE?</span>
            </h2>
          </section>

          <section class="question question--right question--dark safe-area">
            <h2 bind:this={q4h2}>
              <span class="accent">NE È VALSA LA PENA?</span><br />
              <span class="ghost">LO RIFAREBBERO</span><span class="accent">?</span>
            </h2>
          </section>

        </div>
        <div class="question-blur-veil" bind:this={veil1}></div>
      </div>
    </div>

    <section class="story story--left story--summary safe-area"
      use:blurReveal={{ direction: "left", threshold: 0.25, blur: 36, duration: 1100, variant: "cinema" }}>
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <a href="/gallery" class="accent archivio-link">archivio</a>.
      </p>
    </section>

    <div class="gallery-gate" bind:this={galleryGate} aria-hidden="true">
      <div class="gallery-anticipation">
        {#each previewPhotos as src, i}
          <img
            class="anticip-img"
            src={src}
            alt=""
            loading="eager"
            decoding="async"
            draggable="false"
            style={`left:${previewLayout[i].left}; top:${previewLayout[i].top}; width:${previewLayout[i].w}px; aspect-ratio:${previewLayout[i].ar}; --dx:${previewLayout[i].dx}px; --dy:${previewLayout[i].dy}px; --b:${previewLayout[i].b}px; --rot:${previewLayout[i].rot}deg;`}
          />
        {/each}
      </div>
    </div>

  </main>
</div>

<style>
  /* ── Aggiunte classi per l'allineamento dei testi ── */
  .story--left {
    text-align: left;
    display: flex;
    justify-content: flex-start;
  }
  
  .story--right {
    text-align: right;
    display: flex;
    justify-content: flex-end;
  }

  /* ── Aggiunto cuscinetto di spazio prima della galleria ── */
  .story--summary {
    padding-bottom: 35vh; 
  }

  .gallery-gate {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }

  .gallery-anticipation {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .anticip-img {
    position: absolute;
    display: block;
    border-radius: 6px;
    height: auto;
    object-fit: cover;
    box-shadow: 0 10px 44px rgba(0, 0, 0, 0.55);
    opacity: calc(var(--gate-p, 0) * 0.42);
    filter: blur(calc(var(--b, 18px) + (1 - var(--gate-p, 0)) * 16px));
    transform:
      translate3d(
        calc(var(--dx, 0px) * (1 - var(--gate-p, 0))),
        calc(var(--dy, 0px) * (1 - var(--gate-p, 0))),
        0
      )
      scale(calc(0.90 + var(--gate-p, 0) * 0.10))
      rotate(calc(var(--rot, 0deg) * (1 - var(--gate-p, 0))));
    will-change: transform, opacity, filter;
    backface-visibility: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .anticip-img { transition: none; transform: none; }
  }

  .archivio-link {
    text-decoration: none;
    transition: text-shadow 280ms ease, text-decoration-color 280ms ease;
  }
  .archivio-link:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
    text-shadow: 0 0 24px rgba(189, 255, 93, 0.65);
  }

  :global(.question h2 span) {
    display: inline-block;
    will-change: transform, opacity, filter;
  }

  .transition-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    background: var(--color-background-primary, #0e0e0e);
    opacity: 0;
    will-change: opacity;
  }

  /* ── FIX DEFINITIVO PER LE DOMANDE ORIZZONTALI ── */
  .question-shell {
    position: relative;
    width: 100%;
  }

  .question-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background-color: var(--q-bg, #bdff5d);
    color: var(--q-fg, #0e0e0e);
    display: flex;
    
    /* LA MAGIA: Proietta un'ombra solida di 300px verso il basso 
       che usa il colore dinamico dello sfondo. Coprirà il bordo nero! */
    box-shadow: 0 300px 0 0 var(--q-bg);
  }

  .question-track {
    display: flex;
    height: 100%;
    width: 400vw; 
  }

  .question {
    width: 100vw;
    height: 100%;
    display: flex;
    align-items: center; /* Centratura verticale matematica all'interno dello spazio rimanente */
    flex-shrink: 0;
    box-sizing: border-box; /* Previene che il padding faccia esplodere le misure */
  }

  /* Nuova struttura per gli H2 per garantire l'impaginazione */
  .question h2 {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  .question--left h2 {
    text-align: left;
  }

  .question--right h2 {
    text-align: right;
  }
</style>