<script lang="ts">
  let introPlayed = false;

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

  /* ── Intro loader ───────────────────────────────────────────────── */
  const introSeen = browser && introPlayed;
  let showIntro = $state(!introSeen);
  let introExiting = $state(false);
  let loaderProgress = $state(0);

  /* ── DOM refs essenziali ────────────────────────────────────────── */
  let heroSection: HTMLElement | null = null;
  let galleryGate: HTMLElement | null = null;

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

    // ── PARALLAX HERO (scrive --hero-scroll-p per il titolo) ──
    ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: () => '+=' + window.innerHeight * 0.7,
      onUpdate: (self) => document.documentElement.style.setProperty('--hero-scroll-p', self.progress.toFixed(3)),
    });

    // ── NAVBAR: nascosta durante lo scrollytelling ──
    // Visibile nella hero in cima; si nasconde appena inizia il racconto (prima
    // .story) e riappare solo all'ultimo testo (.story--summary). Chi vuole
    // navigare la richiama portando il mouse in cima allo schermo ("peek").
    let scrollHidden = false; // lo scrollytelling vuole la navbar nascosta
    let peek = false;         // mouse in cima allo schermo → mostrala comunque
    const applyNavbar = () => navbarHidden.set(scrollHidden && !peek);

    // Ricalcolo self-correcting a ogni frame dalle posizioni live (niente edge
    // di toggle da mancare): la navbar è nascosta quando il racconto è iniziato
    // (la prima .story ha superato il centro) e finché l'ultimo testo
    // (.story--summary) non raggiunge il centro dello schermo → poi riappare.
    const introEl   = document.querySelector<HTMLElement>('.story--intro');
    const summaryEl = document.querySelector<HTMLElement>('.story--summary');
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: () => {
        if (!introEl || !summaryEl) return;
        const mid = window.innerHeight * 0.5;
        const introTop   = introEl.getBoundingClientRect().top;
        const summaryTop = summaryEl.getBoundingClientRect().top;
        scrollHidden = introTop <= mid && summaryTop > mid;
        applyNavbar();
      },
    });

    const onNavPeek = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const next = e.clientY <= 64;
      if (next !== peek) { peek = next; applyNavbar(); }
    };
    window.addEventListener('pointermove', onNavPeek, { passive: true });

  // ── LAYERED STACKING (CSS sticky) ──
    // Lo stacking dei pannelli è nativo del browser via `position: sticky`
    // (vedi .layered-panel nel CSS): ogni domanda resta incollata in cima e la
    // successiva le scorre sopra. Essendo calcolato dal browser nello stesso
    // spazio di coordinate dello `zoom` globale su <html>, NON soffre del bug di
    // misura del pin di ScrollTrigger sotto `zoom` — che, agganciandosi, faceva
    // partire il pannello successivo un filo in anticipo. Qui GSAP serve solo a
    // sincronizzare il colore della navbar.
    const panels = gsap.utils.toArray('.layered-panel');

    panels.forEach((panel: any) => {
      ScrollTrigger.create({
        trigger: panel,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) {
            navbarInverted.set(panel.classList.contains('panel--lime'));
          }
        }
      });
    });

    // Ripristina la navbar quando si esce dalle domande
    ScrollTrigger.create({
      trigger: '.questions-container',
      start: 'top top',
      end: 'bottom top',
      onLeave: () => navbarInverted.set(false),
      onLeaveBack: () => navbarInverted.set(false)
    });

    // ── GALLERY GATE PREVIEW (Anticipazione) ──
    ScrollTrigger.create({
      trigger: galleryGate,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        const ss = (t: number) => t * t * (3 - 2 * t);
        const gp = ss(clamp((self.progress - 0.12) / 0.88, 0, 1));
        document.documentElement.style.setProperty('--gate-p', gp.toFixed(3));
      },
    });

    // ── INGRESSO GALLERIA (A fondo pagina) ──
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
      navbarHidden.set(false);
      window.removeEventListener('pointermove', onNavPeek);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      // Rimuove tutti gli ScrollTrigger quando si cambia pagina
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  });
</script>

<IntroLoader
  {showIntro}
  {introExiting}
  {loaderProgress}
/>

<div class="site">
  <main class="landing" id="main-content">
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

    <section class="story story--right story--numbers safe-area ">
      <p use:blurText={{ delay: 65, duration: 800 }}>
        <span class="accent">18.000</span> alle Olimpiadi <br>e <span class="accent">4.600</span> alle Paralimpiadi
      </p>
    </section>

    <section class="story story--quote story--quote-left safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari <br>sono rimasti <span class="accent">invisibili</span>
      </p>
    </section>

    <section class="story story--quote story--quote-right safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Nella narrazione ufficiale erano spesso <span class="accent">ignorati</span>
      </p>
    </section>

    <!-- ── NUOVA SEZIONE DOMANDE (Layered Pinning) ── -->
    <div class="questions-container">
      
      <section class="layered-panel panel--lime question">
        <h2>
          <span class="accent">MA </span>
          <span class="ghost-black">CHI SONO </span><br />
          <span class="accent">DAVVERO</span>
          <span class="accent">I VOLONTARI?</span>
        </h2>
      </section>

      <section class="layered-panel panel--dark question">
        <h2>
          <span class="ghost-lime">PERCHÉ </span>
          <span class="accent">HANNO DECISO</span><br />
          <span class="accent">DI CANDIDARSI?</span>
        </h2>
      </section>

      <section class="layered-panel panel--lime question">
        <h2>
          <span class="ghost-black">COSA FACEVANO</span><br />
          <span class="accent">CONCRETAMENTE?</span>
        </h2>
      </section>

      <section class="layered-panel panel--dark question">
        <h2>
          <span class="accent">NE È VALSA LA PENA?</span><br />
          <span class="ghost-lime">LO RIFAREBBERO?</span>
        </h2>
      </section>

    </div>

    <section class="story story--left story--summary safe-area">
      <p use:blurText={{ delay: 65, duration: 750, threshold: 0.2 }}>
        Abbiamo chiesto ai volontari <br>di raccontarsi. <br>Le loro testimonianze sono raccolte in questo
        <a href="/gallery" class="accent archivio-link">archivio</a>
      </p>
    </section>

    <!-- <div class="gallery-gate" bind:this={galleryGate} aria-hidden="true">
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
    </div> -->

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
  .story--quote-right {
    padding-bottom: 50dvh !important; 
  }
  /* ── Aggiunto cuscinetto di spazio prima della galleria ── */
  .story--summary {
    padding-bottom: 40vh;
    
  }

  /* Disabled together with the gallery-gate preview markup above.
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
  } */

  .archivio-link:hover {
    text-decoration: none;
  }

  :global(.question h2 span) {
    display: inline-block;
    will-change: transform, opacity, filter;
  }


  .question {
    width: 100vw;
    height: 100%;
    display: flex;
    align-items: center; /* Centratura verticale matematica all'interno dello spazio rimanente */
    flex-shrink: 0;
    box-sizing: border-box; /* Previene che il padding faccia esplodere le misure */
    font-size:   36px;
  }

  /* Nuova struttura per gli H2 per garantire l'impaginazione */
  .question h2 {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

 /* ── LAYERED PINNING: CONTENITORE E PANNELLI ── */
  .questions-container {
    position: relative;
    width: 100%;
  }

  .layered-panel {
    /* Stacking nativo: ogni pannello resta incollato in cima (sticky) mentre il
       successivo (z-index più alto) gli scorre sopra. L'altezza è divisa per lo
       zoom globale di <html> così riempie ESATTAMENTE il viewport visivo:
       (100dvh / zoom) * zoom = 100dvh. Niente pin GSAP → niente scatto/anticipo. */
    /* --hold: quanto scroll la domanda resta FERMA a schermo pieno (sfondo
       corretto, nessun pannello che sale) prima che la successiva inizi a
       salire. È realizzato come margine sotto al pannello: lo sticky resta
       incollato per tutta la sua durata, quindi durante il margine la domanda
       è bloccata piena, poi la successiva sale. */
    --hold: 30dvh;
    position: sticky;
    top: 0;
    height: calc(100dvh / var(--page-zoom, 1));

    width: 100% !important;
    max-width: 100% !important;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    box-sizing: border-box;
    padding: var(--spacing-5, 24px);
    margin: 0 0 calc(var(--hold) / var(--page-zoom, 1)) !important;
    overflow: hidden;
  }

  /* L'ultima domanda non ha un "successivo" da attendere: nessun hold, così
     scorre via verso la sezione riepilogo senza spazio morto. */
  .layered-panel:last-child {
    margin-bottom: 0 !important;
  }

  .layered-panel:nth-child(1) { z-index: 1; }
  .layered-panel:nth-child(2) { z-index: 2; }
  .layered-panel:nth-child(3) { z-index: 3; }
  .layered-panel:nth-child(4) { z-index: 4; }

  /* Ripristiniamo il testo gigante */
  .layered-panel h2 {
    font-family: var(--font-display);
    font-size: 116px;
    font-weight: 800;
    line-height: 100px;
    letter-spacing: var(--ts-h2-letter-spacing, 0em);
    margin: 0;
    width: 100%;
  }
  .ghost-lime { 
    -webkit-text-stroke-color: var(--q-fg, var(--color-content-accent));
    -webkit-text-stroke-width: 2px;
    color: transparent;
  }

  .ghost-black  { 
    -webkit-text-stroke-color: var(--q-fg, var(--color-content-body-black));
    -webkit-text-stroke-width: 2.5px;
    color: transparent;
  }

  /* Per sicurezza su schermi piccoli */
  @media (max-width: 600px) {
    .layered-panel h2 {
      font-size: 42px; 
    }
  }

  /* ── COLORI (Sfondo e Testo) ── */
  .panel--lime {
    background-color: var(--color-content-accent, #bdff5d);
    color: #0e0e0e;
    text-align: left;
    padding: 0;
    padding-left: var(--spacing-11, 72px);
  }
  
  .panel--lime .accent {
    color: #0e0e0e;
  }

  .panel--dark {
    background-color: var(--color-content-background, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    text-align: right;
    padding: 0;
    padding-right: var(--spacing-11, 72px);
  }
  
  .panel--dark .accent {
    color: var(--color-content-accent, #bdff5d);
  }
  </style>