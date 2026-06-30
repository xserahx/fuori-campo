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
  import { goto, afterNavigate } from "$app/navigation";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import { blurText } from "../lib/actions/blurText";
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { fetchAllVolunteers, getCachedVolunteers, getOptimizedImageUrl } from '$lib/data/volunteers';
  import { navbarInverted, navbarHidden } from '$lib/stores/navbar';
  import IntroLoader from "../lib/components/IntroLoader.svelte";
  import ZoomPlusButton from "../lib/components/buttons/Zoom+Button.svelte";
  import ZoomMinusButton from "../lib/components/buttons/Zoom-Button.svelte";

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

  function navigateToGallery() {
    if (galleryTransitionPending) return;
    galleryTransitionPending = true;
    // No bespoke transition here — let the layout's standard SVG wave handle
    // the home → gallery navigation, same as the archivio link.
    goto('/gallery');
  }

  afterNavigate(() => {
    galleryTransitionPending = false;

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.setProperty('--gate-p', '0');

    const landing = document.querySelector<HTMLElement>('.landing');
    if (landing) gsap.set(landing, { clearProps: 'filter,transform,opacity' });
  });

  let loaderRaf = 0;
  let exitTimeout: ReturnType<typeof setTimeout> | undefined;

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

    gsap.registerPlugin(ScrollTrigger);

    // ── Helpers ────────────────────────────────────────────────────────────
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const ss    = (t: number) => t * t * (3 - 2 * t);
    // Global CSS `zoom` lives on <html> (see app.html). Element transforms are
    // applied in *layout* px (then scaled ×zoom visually), while scroll distance
    // and innerWidth are *visual* px — so the track transform is divided by zoom.
    const zoom  = () => parseFloat(document.documentElement.style.zoom) || 1;

    const LIME: [number, number, number] = [189, 255, 93];
    const DARK: [number, number, number] = [14,  14,  14];
    const panelBg   = [LIME, DARK, LIME, DARK];
    const panelText = [DARK, LIME, DARK, LIME];

    let pSpans: HTMLElement[][] = [[], [], [], []];
    const cacheSpans = () => {
      pSpans = [q1h2, q2h2, q3h2, q4h2].map(h =>
        h ? (Array.from(h.querySelectorAll('span')) as HTMLElement[]) : []
      );
    };
    cacheSpans();

    // Drive question colours + per-word reveal from horizontal progress (0..1).
    function updateQuestions(p: number, dir: number) {
      const VW = window.innerWidth;
      const hp = p * 3 * VW;                     // visual px travelled (0 → 3·VW)
      const centers = [0, VW, 2 * VW, 3 * VW];
      const goingBack = dir < 0;

      for (let pi = 0; pi < 4; pi++) {
        const dist = Math.abs(hp - centers[pi]) / VW;
        const vis  = ss(clamp(1.1 - dist * 1.5, 0, 1));
        const spans = pSpans[pi];
        for (let si = 0; si < spans.length; si++) {
          const sv3  = ss(clamp(vis - si * 0.07, 0, 1));
          const span = spans[si];
          if (sv3 >= 0.9995 || vis >= 0.9995) {
            span.style.opacity   = '1';
            span.style.transform = 'none';
          } else {
            const inv = 1 - sv3;
            span.style.opacity   = sv3.toFixed(3);
            span.style.transform = `translateX(${((goingBack ? -inv : inv) * 20).toFixed(1)}px)`;
          }
        }
      }

      if (stickyEl1) {
        const t     = clamp(hp / VW, 0, 2.9999);
        const idx   = Math.floor(t);
        const local = t - idx;
        const eb    = ss(clamp((local - 0.28) / 0.44, 0, 1));
        const ni    = Math.min(idx + 1, 3);
        const bg  = panelBg[idx].map((v, i)  => Math.round(v + (panelBg[ni][i]   - v) * eb));
        const txt = panelText[idx].map((v, i) => Math.round(v + (panelText[ni][i] - v) * eb));
        stickyEl1.style.setProperty('--q-bg', `rgb(${bg.join(',')})`);
        stickyEl1.style.setProperty('--q-fg', `rgb(${txt.join(',')})`);
        // Only invert the navbar while scrolled inside the question panels.
        // Otherwise the mount-time / onRefresh call (progress 0 → lime panel)
        // inverts the bar over the dark hero, turning the lime F logo black
        // (invisible) and the white links dark grey.
        navbarInverted.set(inQ && bg[1] > 128);
      }
    }

    let inQ    = false;
    let inHero = true;

    const mm = gsap.matchMedia();

    // ── Desktop: pinned horizontal questions + scroll-driven sub-animations ──
    mm.add('(min-width: 600px)', () => {
      // Hero parallax (writes --hero-scroll-p 0→1 over the first ~70% of hero).
      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 0.7,
        onUpdate: (self) =>
          document.documentElement.style.setProperty('--hero-scroll-p', self.progress.toFixed(3)),
      });

      // Navbar visibility while the hero fills the viewport.
      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom 45%',
        onToggle: (self) => { inHero = self.isActive; if (self.isActive) navbarHidden.set(false); },
      });

      // Horizontal scroll: pin the section, scrub the track across its panels.
      // `x` lands at exactly -(travel) so the last question is fully settled at
      // the end of the pin — no fast-scroll cut-off is possible with scrub.
      const panels = track1 ? track1.children.length : 4;
      const travel = () => (panels - 1) * window.innerWidth;     // visual px
      gsap.to(track1, {
        x: () => -(travel() / zoom()),                           // layout px
        ease: 'none',
        scrollTrigger: {
          trigger: shell1,
          start: 'top top',
          end: () => '+=' + travel(),
          pin: shell1,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter:     () => { inQ = true;  navbarHidden.set(true); },
          onEnterBack: () => { inQ = true;  navbarHidden.set(true); },
          onLeave:     () => { inQ = false; },
          onLeaveBack: () => { inQ = false; navbarInverted.set(false); navbarHidden.set(false); },
          onUpdate: (self) => {
            updateQuestions(self.progress, self.direction);
            if (veil1) {
              const v = Math.min(Math.abs(self.getVelocity()) / 3000, 1);
              veil1.style.backdropFilter = v > 0.02 ? `blur(${(v * 16).toFixed(1)}px)` : '';
            }
          },
          onRefresh: () => updateQuestions(0, 1),
        },
      });
      updateQuestions(0, 1);

      // Gallery-gate anticipation preview (writes --gate-p 0→1).
      ScrollTrigger.create({
        trigger: galleryGate,
        start: 'top bottom',
        end: 'top top',
        onUpdate: (self) => {
          const gp = ss(clamp((self.progress - 0.12) / 0.88, 0, 1));
          document.documentElement.style.setProperty('--gate-p', gp.toFixed(3));
        },
      });

      // Hide navbar on scroll-down outside hero/questions; show on scroll-up.
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          if (inQ || inHero) return;
          if (self.scroll() <= 20) { navbarHidden.set(false); return; }
          navbarHidden.set(self.direction === 1);
        },
      });

      return () => {
        document.documentElement.style.setProperty('--hero-scroll-p', '0');
        document.documentElement.style.setProperty('--gate-p', '0');
        if (track1) gsap.set(track1, { clearProps: 'transform' });
      };
    });

    // ── Mobile: questions stack vertically (CSS); only sync navbar inversion ──
    mm.add('(max-width: 599px)', () => {
      ScrollTrigger.create({
        trigger: shell1,
        start: 'top top',
        end: 'bottom bottom',
        onToggle: (self) => navbarInverted.set(self.isActive),
      });
    });

    // Re-cache word spans + re-measure triggers on resize.
    const onResize = () => { cacheSpans(); ScrollTrigger.refresh(); };
    window.addEventListener('resize', onResize, { passive: true });

    // ── Gallery entry at the very bottom (passive — no scroll hijacking) ──
    let galleryReady = false;
    const maxScroll  = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let galleryGuard = window.scrollY >= maxScroll() - 120;
    const atBottom   = () => window.scrollY >= maxScroll() - 4;

    const tryEnterGallery = (down: boolean) => {
      if (galleryTransitionPending) return;
      if (down && atBottom()) {
        if (galleryGuard) return;
        if (galleryReady) navigateToGallery();
        else              galleryReady = true;
      } else if (!down) {
        galleryReady = false;
        galleryGuard = false;
      }
    };
    const onWheel = (e: WheelEvent) => tryEnterGallery(e.deltaY > 0);
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      const dy = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      if (Math.abs(dy) > 1) tryEnterGallery(dy > 0);
    };
    window.addEventListener('wheel',      onWheel,      { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });

    fetchAllVolunteers().then(vols => { previewPhotos = buildPreviewPhotos(vols); });

    return () => {
      navbarInverted.set(false);
      mm.revert();
      window.removeEventListener('resize',     onResize);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
    };
  });
</script>

<!-- <IntroLoader
  {showIntro}
  {introExiting}
  {loaderProgress}
/> -->

<div class="site">
  <main class="landing" id="main-content">
  <section>
    <ZoomPlusButton />
    <ZoomMinusButton />
  </section>
    <section class="hero-outer" bind:this={heroSection}>
      <div class="hero-inner">
        <BlurTitle quick={introSeen} />
      </div>
    </section>

    <section class="story story--left story--intro safe-area">
      <p class="lead-paragraph" use:blurText={{ delay: 60, duration: 800 }}>
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari
      </p>
    </section>

    <section class="story story--right story--numbers safe-area">
      <p use:blurText={{ delay: 65, duration: 800 }}>
        <span class="accent">18.000</span> alle Olimpiadi <br>e <span class="accent">4.600</span> alle Paralimpiadi
      </p>
    </section>

    <section class="story story--quote story--quote-left safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti <span class="accent">invisibili</span>.
      </p>
    </section>

    <section class="story story--quote story--quote-right safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Nella narrazione ufficiale erano spesso <span class="accent">dati per scontati</span>
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
              <span class="ghost">LO RIFAREBBERO?</span>
            </h2>
          </section>

        </div>
        <div class="question-blur-veil" bind:this={veil1}></div>
      </div>
    </div>

    <section class="story story--left story--summary safe-area">
      <p use:blurText={{ delay: 65, duration: 750, threshold: 0.2 }}>
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

  .archivio-link:hover {
    text-decoration: none;
  }

  :global(.question h2 span) {
    display: inline-block;
    will-change: transform, opacity, filter;
  }

  /* ── FIX DEFINITIVO PER LE DOMANDE ORIZZONTALI ── */
  .question-shell {
    position: relative;
    width: 100%;
  }

  .question-sticky {
    /* Pinned by GSAP ScrollTrigger on desktop (was position: sticky). */
    position: relative;
    top: 0;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background-color: var(--q-bg, #bdff5d);
    color: var(--q-fg, #0e0e0e);
    display: flex;
    
    /* LA MAGIA: Proietta un'ombra solida di 300px verso il basso 
       che usa il colore dinamico dello sfondo. Coprirà il bordo nero! */
    box-shadow: 0 var(--unit-300) 0 0 var(--q-bg);
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