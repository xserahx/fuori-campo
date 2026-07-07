<script module lang="ts">
  // Module-scope (not component-scope): survives every SPA remount of this
  // page within the same browser session — e.g. clicking the logo to come
  // back home — but resets to false on an actual full page load (first
  // visit or hard reload), since that re-evaluates the whole module fresh.
  let introPlayed = false;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto, afterNavigate } from "$app/navigation";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import { blurText } from "../lib/actions/blurText";
  import { scrollReveal } from "../lib/actions/scrollReveal";
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

  /* ── Fit the desktop question titles so they never overflow their panel ──
     The 116px headings are nowrap (br-controlled lines); the widest line/word
     (e.g. "CONCRETAMENTE") can exceed the panel width and clip. fitQuestions()
     scales each heading down via --qfit so its widest line fits. Mobile (≤700)
     wraps at 36px and opts out. */
  let questionsEl = $state<HTMLElement | undefined>(undefined);

  function fitQuestions() {
    if (!questionsEl || typeof window === 'undefined') return;
    const mobile = window.innerWidth <= 700;
    const heads = Array.from(questionsEl.querySelectorAll<HTMLElement>('.layered-panel h2'));

    for (const h of heads) {
      if (mobile) { h.style.setProperty('--qfit', '1'); continue; }
      h.style.setProperty('--qfit', '1');            // measure at natural size
      const avail = h.clientWidth;
      const natural = h.scrollWidth;
      h.style.setProperty('--qfit', avail > 0 && natural > avail ? String((avail / natural) * 0.99) : '1');
    }
  }

  $effect(() => {
    if (typeof window === 'undefined') return;

    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fitQuestions); };

    schedule();
    if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(() => schedule());
    window.addEventListener('resize', schedule, { passive: true });

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', schedule); };
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
    // --hero-scroll-p lives on <html>, which survives SPA navigation — if the
    // hero was scrolled past before leaving, it's left stuck near/at 1, which
    // zeroes out BlurTitle's opacity (calc(1 - p * 1.6)) on the next visit.
    document.documentElement.style.setProperty('--hero-scroll-p', '0');

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

    // ── GALLERY GATE — TRANSIZIONE (per-frame, robusta su mobile) ──
    // Scrollando dentro il gate la transizione parte a ~0.9 di progresso.
    // Trigger per-frame: non può essere mancato come un onEnter agganciato
    // all'ultimo pixel scrollabile sotto l'easing di Lenis + toolbar dinamica.
    ScrollTrigger.create({
      trigger: galleryGate,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        // Abbastanza tardi da leggere bene l'ultima frase, ma prima della fine
        // del gate così non c'è una lunga fascia nera vuota.
        if (self.progress >= 0.6) navigateToGallery();
      },
    });

    // ── GALLERY GATE — INGRESSO GALLERIA ──
    // La transizione parte a 'top top': l'istante in cui le foto riempiono lo
    // schermo (fine del reveal). NON a 'bottom bottom' (fondo del documento):
    // quel punto è l'ultimo pixel scrollabile e su mobile — con l'easing di
    // Lenis e la toolbar dinamica (dvh) — non viene raggiunto in modo
    // affidabile, quindi onEnter non scattava e la transizione non partiva.
    // Il gate ha ~50dvh di margine sotto (vedi height) così 'top top' cade
    // ben prima del fondo ed è sempre raggiunto scrollando dentro le foto.
    ScrollTrigger.create({
      trigger: galleryGate,
      start: 'top top',
      onEnter: () => navigateToGallery(),
    });

    return () => {
      navbarInverted.set(false);
      navbarHidden.set(false);
      window.removeEventListener('pointermove', onNavPeek);
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
        <span class="accent">18.000</span> alle Olimpiadi e<br> <span class="accent">4.600</span> alle Paralimpiadi
      </p>
    </section>

    <section class="story story--quote story--quote-left safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari <br>sono rimasti <span class="accent">invisibili</span>
      </p>
    </section>

    <section class="story story--quote story--quote-right safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Nella narrazione ufficiale<br class="q-break" /> erano spesso <span class="accent">dati per scontati</span>
      </p>
    </section>

    <!-- ── NUOVA SEZIONE DOMANDE (Layered Pinning) ── -->
    <div class="questions-container" bind:this={questionsEl}>

      <section class="layered-panel panel--lime question">
        <h2 use:scrollReveal>
          <span class="accent">MA </span>
          <span class="ghost-black">CHI SONO </span><br class="br-desktop" />
          <span class="accent">DAVVERO</span><br class="br-mobile" />
          <span class="accent">I VOLONTARI?</span>
        </h2>
      </section>

      <section class="layered-panel panel--dark question">
        <h2 use:scrollReveal>
          <span class="ghost-lime">PERCHÈ </span>
          <span class="accent">HANNO DECISO</span><br class="br-desktop" />
          <span class="accent">DI CANDIDARSI?</span>
        </h2>
      </section>

      <section class="layered-panel panel--lime question">
        <h2 use:scrollReveal>
          <span class="ghost-black">COSA FACEVANO</span><br class="br-desktop" /><br class="br-mobile" />
          <span class="accent">CONCRETAMENTE?</span>
        </h2>
      </section>

      <section class="layered-panel panel--dark question">
        <h2 use:scrollReveal>
          <span class="accent">NE È VALSA </span><br class="br-mobile" />
          <span class="accent">LA PENA?</span><br />
          <span class="ghost-lime">LO RIFAREBBERO</span><span class="accent">?</span>
        </h2>
      </section>

    </div>

    <section class="story story--left story--summary safe-area">
      <p class="story-summary-copy" use:blurText={{ delay: 65, duration: 750, threshold: 0.2 }}>
        Abbiamo chiesto ai volontari <br>di raccontarsi. <br>Le loro testimonianze sono raccolte in questo
        <a href="/gallery" class="accent archivio-link">archivio</a>
      </p>
    </section>

    <!-- Regione di scroll che innesca la transizione verso la galleria
         (nessuna anticipazione di immagini). -->
    <div class="gallery-gate" bind:this={galleryGate} aria-hidden="true"></div>

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
    text-align: right;
  }
  /* Piccolo respiro dopo l'ultima frase: quel tanto che basta perché non sia
     incollata alla galleria, ma senza vuoto — le foto iniziano a emergere
     appena si scorre oltre la frase, come continuazione del racconto. */
  .story--summary {
    padding-bottom: var(--spacing-8);
  }

  .gallery-gate {
    position: relative;
    /* Le foto emergono mentre il gate entra e riempiono lo schermo a 'top top'
       (dopo ~1 viewport di scroll) → lì parte la transizione. L'altezza è 1
       viewport visivo + ~50dvh di margine: quel margine NON viene mai scrollato
       (si transiziona a 'top top', prima), serve solo a garantire che 'top top'
       cada ben prima dell'ultimo pixel del documento, così su mobile il trigger
       scatta sempre. Diviso per lo zoom globale di <html> come i .layered-panel
       così il primo viewport copre ESATTAMENTE lo schermo visivo. */
    height: calc((100dvh + 50dvh) / var(--page-zoom, 1));
  }

  .archivio-link:hover {
    text-decoration: none;
  }

  :global(.question h2 span) {
    display: inline-block;
    will-change: transform, opacity, filter;
  }

  :global(.layered-panel h2 br.br-mobile) {
    display: none;
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
    /* --qfit (default 1) is set by fitQuestions() so each question shrinks to
       fit its panel — the fixed 116px overflows once a line (or long word like
       "CONCRETAMENTE") is wider than the panel. nowrap keeps the <br>-defined
       line structure; the fit scales the widest line down to fit. */
    font-size: calc(116px * var(--qfit, 1));
    font-weight: 800;
    /* Figma "Scrollitelling": 116px / line-height 106 / letter-spacing 0. */
    line-height: calc(106px * var(--qfit, 1));
    letter-spacing: var(--ts-h2-letter-spacing, 0em);
    margin: 0;
    width: 100%;
    white-space: nowrap;
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
    .story--summary.safe-area {
      padding-top: var(--spacing-15);
      padding-right: 0;
      /* Tight gap so the transition follows the last sentence directly. */
      padding-bottom: var(--spacing-6);
      padding-left: var(--spacing-5, 24px);
    }

    .story-summary-copy {
      width: min(340px, calc(100vw - 48px));
      margin: 0;
      color: var(--color-content-body, #fafafa);
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 500;
      line-height: 24px;
      letter-spacing: 0.96px;
    }

    .story-summary-copy br {
      display: none;
    }
  }

  /* Mobile (≤700px, matching app.html's zoom:1 cutoff). Per Figma "Home-mobile":
     each question is one full screen (100dvh), alternating lime/dark, with the
     question vertically CENTRED and inset 24px on its aligned side. On the 874px
     design device that centring lands the text 389px from top and 389px from
     bottom (389 + 96 text + 389 = 874) — exactly the annotated spacing. Text is
     solid (black on lime, white on dark), not ghost. The panels use the same
     sticky layered-pinning as desktop (see .layered-panel below). */
  @media (max-width: 700px) {
    /* Figma mobile (frame "Home-mobile"): four full-screen sections, each 874px
       = one 100dvh viewport, that simply SCROLL — a question centred in each,
       alternating lime/dark. This is NOT the desktop sticky "cover" (the next
       question sliding over the current one read as confusing, and Figma shows a
       plain scroll). So: position static, one screen tall, no hold margin. */
    .layered-panel {
      /* Sticky layered-pinning like desktop: each question pins full-screen and
         the NEXT one scrolls up and covers it (the covering order is the
         z-index: nth-child(1)→1 … (4)→4, set for all widths above). The 30dvh
         margin is the "hold" — the question rests full-screen for that much
         scroll before the next rises over it. */
      position: sticky;
      top: 0;
      /* One full screen per section. Mobile zoom is always 1, so no /page-zoom
         division (a bad --page-zoom value would make the whole calc() invalid and
         the height would collapse to content — exactly the "two questions share a
         screen" bug). The plain 100vh line is a fallback for engines without dvh
         so it can never fall back to auto height. */
      height: 100vh;
      height: 100dvh;
      min-height: 100dvh;
      margin: 0 0 30dvh !important;
      /* COLUMN flex so vertical centring is `justify-content: center` (main axis)
         — unambiguous, and it doesn't depend on the desktop row `align-items`.
         The question then sits centred: 389px from top and bottom on the 874px
         design screen. Left/right is `align-items`, set per question below. */
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .layered-panel h2 {
      /* Figma column: capped at 353px, with a 24px inset on the aligned side
         (the far side is naturally left over: 100vw - 24px*2), matching the
         app's .safe-area convention. */
      width: min(353px, calc(100vw - var(--spacing-5, 24px) * 2));
      margin: 0;
      /* Scaled from the Figma 116px down to a phone-readable size. Text WRAPS
         (white-space: normal) so long lines/words break instead of shrinking to
         one nowrap line; the <br>s still define the primary line breaks and
         overflow-wrap is the safety net. This overrides the desktop
         116px/nowrap/--qfit rule (fitQuestions() opts out below 700px). */
      font-size: clamp(28px, 9vw, 36px);
      font-weight: 800;
      line-height: 0.889;      /* Figma: leading 32 / size 36 */
      letter-spacing: 0.03em;  /* Figma: tracking 1.08 / size 36 */
      white-space: normal;
      overflow-wrap: break-word;
    }

    .layered-panel h2 br.br-desktop {
      display: none;
    }

    .layered-panel h2 br.br-mobile {
      display: inline;
    }

    /* Overrides the desktop `.question h2 span { display: inline-block }` rule,
       which would otherwise make multi-word spans (and the per-word
       .scroll-reveal-word spans injected by scrollReveal) wrap as rigid atomic
       units instead of flowing/breaking naturally like text. */
    .layered-panel h2 span {
      display: inline;
    }

    /* Q1/Q3 sit LEFT, Q2/Q4 RIGHT (per Figma). In the column flex this is the
       cross axis, so it's `align-items`. Each is inset by --spacing-5 (24px),
       overriding the desktop 72px side padding (.panel--lime/--dark) at higher
       specificity. Both paddings are set so the far side never reaches the
       edge. Vertical centring is the panel's justify-content above. */
    .layered-panel:nth-child(1),
    .layered-panel:nth-child(3) {
      align-items: flex-start;
      padding-left: var(--spacing-5, 24px);
      padding-right: var(--spacing-5, 24px);
    }

    .layered-panel:nth-child(2),
    .layered-panel:nth-child(4) {
      align-items: flex-end;
      padding-left: var(--spacing-5, 24px);
      padding-right: var(--spacing-5, 24px);
    }

    /* Esplicito su ENTRAMBI i lati (non solo "right"): senza una regola diretta
       sull'h2, il testo eredita da .panel--dark (regola fuori da questa media
       query, più avanti nel file → vince lei), che imposta text-align:right
       sulla SECTION — quindi anche le domande 1/3 (a sinistra) rischiano di
       ereditare "right". Fissare qui entrambi i lati elimina la dipendenza
       dall'ordine nel foglio di stile. */
    .layered-panel:nth-child(1) h2,
    .layered-panel:nth-child(3) h2 {
      text-align: left;
    }

    .layered-panel:nth-child(2) h2,
    .layered-panel:nth-child(4) h2 {
      text-align: right;
    }

    /* Figma mobile text is SOLID — no ghost/hollow outline: black on the lime
       sections, off-white (#fafafa) on the dark ones. This overrides the desktop
       ghost/accent per-word treatment. !important because the desktop
       `.panel--dark .accent` rule sits later in the file at equal specificity
       and would otherwise win. */
    .panel--lime :is(.accent, .ghost-lime, .ghost-black) {
      color: var(--color-content-body-black, #0e0e0e) !important;
      -webkit-text-fill-color: var(--color-content-body-black, #0e0e0e) !important;
      -webkit-text-stroke-width: 0 !important;
    }

    .panel--dark :is(.accent, .ghost-lime, .ghost-black) {
      color: var(--color-content-body, #fafafa) !important;
      -webkit-text-fill-color: var(--color-content-body, #fafafa) !important;
      -webkit-text-stroke-width: 0 !important;
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