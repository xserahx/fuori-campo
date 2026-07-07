<script module lang="ts">
 // Scope del modulo (non del componente): questo valore sopravvive a ogni
// remount della pagina dentro la stessa sessione SPA — ad esempio quando
// si clicca il logo per tornare alla home.  
// Si resetta invece a false su un vero full page load (prima visita o
// hard reload), perché in quel caso l’intero modulo viene rivalutato da zero.
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

  /* ── Costanti di tuning ─────────────────────────────────────────────
   Tutti i timing e le variabili che regolano la loading page sono qui.
   L’idea è semplice: ogni valore ha una propria variabile, così
   eventuali ritocchi futuri richiedono di cambiare una sola riga di codice
   invece di inseguire valori sparsi nel file */

  // Timeline del caricamento iniziale (intro loader)
  const INTRO_DURATION_MS = 4800; // durata del riempimento della progress bar
  const INTRO_HOLD_MS = 560;      // breve pausa al 100% prima della dissolvenza
  const INTRO_EXIT_MS = 2100;     // tempo di fade-out dell’overlay del loader

  // Parallasse dell’hero
  const HERO_PARALLAX_SCROLL_VH = 0.7; // distanza di scroll (in frazione della viewport) su cui --hero-scroll-p va da 0 → 1

  // Visibilità della navbar durante lo scrollytelling
  const NAVBAR_MIDPOINT_FACTOR = 0.5;  // punto medio dello schermo usato per capire se un “beat” è in vista
  const NAVBAR_PEEK_THRESHOLD_PX = 64; // distanza dal bordo superiore per far riapparire la navbar con un “peek”

  // Gate della gallery
  const GALLERY_GATE_TRIGGER_PROGRESS = 0.6; // progress di scroll attraverso il gate che attiva il passaggio alla /gallery

  // Auto-fit dei titoli delle domande
  const MOBILE_BREAKPOINT_PX = 700; // sotto questa larghezza i titoli vanno a capo invece di ridursi (vedi fitQuestions)
  const FIT_SAFETY_MARGIN = 0.99;   // margine di sicurezza per evitare che il testo tocchi i bordi del pannello

  /* ── Intro loader ──────────────────────────────────────────────── */
  const introSeen = browser && introPlayed;
  let showIntro = $state(!introSeen);
  let introExiting = $state(false);
  let loaderProgress = $state(0);

  /* ── DOM refs essenziali ───────────────────────────────────────── */
  let heroSection: HTMLElement | null = null;
  let galleryGate: HTMLElement | null = null;

  // Le heading delle domande su desktop usano `nowrap` per mantenere intatti
  // i ritorni a capo inseriti a mano con <br>. Questo però significa che la
  // riga più lunga (tipo una parola estesa come “CONCRETAMENTE”) può superare
  // la larghezza del pannello e venire tagliata.
  //
  // fitQuestions() misura la larghezza naturale di ogni heading rispetto allo
  // spazio disponibile e scrive un fattore di scala --qfit che il CSS applica
  // alla font-size. In questo modo ogni titolo rientra perfettamente nel
  // pannello senza mai toccare i line break manuali.
  //
  // Su mobile invece il testo va a capo normalmente (vedi media query ≤700px),
  // quindi questa logica viene disattivata.
  let questionsEl = $state<HTMLElement | undefined>(undefined);

  function fitQuestions() {
    if (!questionsEl || typeof window === 'undefined') return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;
    const headings = Array.from(questionsEl.querySelectorAll<HTMLElement>('.layered-panel h2'));

    for (const heading of headings) {
      if (isMobile) {
        heading.style.setProperty('--qfit', '1');
        continue;
      }
  // Prima riportiamo il titolo alla sua dimensione naturale, così
  // clientWidth/scrollWidth misurano l’eventuale overflow reale e non
  // una larghezza alterata da una riduzione precedente.
      heading.style.setProperty('--qfit', '1');

      const availableWidth = heading.clientWidth;
      const naturalWidth = heading.scrollWidth;
      const overflows = availableWidth > 0 && naturalWidth > availableWidth;

      heading.style.setProperty(
        '--qfit',
        overflows ? String((availableWidth / naturalWidth) * FIT_SAFETY_MARGIN) : '1'
      );
    }
  }

  $effect(() => {
    if (typeof window === 'undefined') return;

  // Il caricamento tardivo dei font (classico caso di FOUT) o un resize della
  // finestra possono modificare la larghezza effettiva delle heading. Per questo
  // rifacciamo il fit in entrambi gli scenari. Il debounce via rAF serve a
  // comprimere una raffica di eventi di resize in una singola misurazione pulita..
    let rafId = 0;
    const scheduleFit = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(fitQuestions);
    };

    scheduleFit();
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(scheduleFit);
    }
    window.addEventListener('resize', scheduleFit, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleFit);
    };
  });

  // I due ScrollTrigger qui sotto possono decidere, in momenti diversi, che “adesso” è il momento di passare alla /gallery. Questo flag serve
  // a garantire che la navigazione avvenga una sola volta, evitando doppi trigger o transizioni duplicate.
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

    document.documentElement.style.setProperty('--hero-scroll-p', '0');

    const landing = document.querySelector<HTMLElement>('.landing');
    if (landing) gsap.set(landing, { clearProps: 'filter,transform,opacity' });
  });

  let loaderRaf = 0;
  let exitTimeout: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
  // Se abbiamo già visto l’intro (ritorno “soft” alla home), saltiamo completamente il loader: niente barra di avanzamento, niente fade,
  // si entra direttamente nella pagina.
    if (introSeen) return;

  // Curva di easing “ease‑in‑out” basata sul coseno: parte e termina in modo morbido, con la massima velocità al centro. Risulta più intenzionale e piacevole rispetto a un riempimento lineare.
    const easeInOutCosine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / INTRO_DURATION_MS);
      loaderProgress = easeInOutCosine(progress) * 100;

      if (progress < 1) {
        loaderRaf = requestAnimationFrame(tick);
        return;
      }

    // La barra è ormai arrivata visivamente al 100% — resta ferma per un istante così che l’utente percepisca chiaramente che il caricamento è“completato”, prima di iniziare la dissolvenza del loader.
      loaderProgress = 100;
      introPlayed = true;

      exitTimeout = setTimeout(() => {
        introExiting = true;
        exitTimeout = setTimeout(() => { showIntro = false; }, INTRO_EXIT_MS);
      }, INTRO_HOLD_MS);
    };

    loaderRaf = requestAnimationFrame(tick);

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

    /* ── PARALLAX HERO ──*/
    ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: () => '+=' + window.innerHeight * HERO_PARALLAX_SCROLL_VH,
      onUpdate: (self) => {
        document.documentElement.style.setProperty('--hero-scroll-p', self.progress.toFixed(3));
      },
    });

    /* ── NAVBAR: nascosta durante lo scrollytelling ──────────────────
       La navbar sparisce non appena inizia il racconto (prima .story) e
       torna visibile solo all'ultimo testo (.story--summary) — durante le
       domande a schermo intero non deve competere con il testo gigante.
       Chi vuole comunque navigare la richiama portando il mouse in cima
       allo schermo ("peek"). */
    let storytellingHidesNavbar = false;
    let pointerIsPeeking = false;
    const applyNavbarVisibility = () => {
      navbarHidden.set(storytellingHidesNavbar && !pointerIsPeeking);
    };

    // Ricalcolato ad ogni frame dalle posizioni live degli elementi, invece
    // che da eventi onEnter/onLeave puntuali: così non c'è nessun edge case
    // di toggle che può essere "mancato" da uno scroll molto rapido.
    const introSection = document.querySelector<HTMLElement>('.story--intro');
    const summarySection = document.querySelector<HTMLElement>('.story--summary');

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: () => {
        if (!introSection || !summarySection) return;

        const viewportMid = window.innerHeight * NAVBAR_MIDPOINT_FACTOR;
        const introTop = introSection.getBoundingClientRect().top;
        const summaryTop = summarySection.getBoundingClientRect().top;

        storytellingHidesNavbar = introTop <= viewportMid && summaryTop > viewportMid;
        applyNavbarVisibility();
      },
    });

    const handlePointerPeek = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return; // touch has no "hover near the top"

      const isPeeking = event.clientY <= NAVBAR_PEEK_THRESHOLD_PX;
      if (isPeeking !== pointerIsPeeking) {
        pointerIsPeeking = isPeeking;
        applyNavbarVisibility();
      }
    };
    window.addEventListener('pointermove', handlePointerPeek, { passive: true });

    /* ── LAYERED STACKING (CSS sticky) ────────────────────────────────
       Lo stacking dei pannelli-domanda è nativo del browser (position:
       sticky, vedi .layered-panel nel CSS): ogni domanda resta incollata
       in cima mentre la successiva le scorre sopra. Essendo calcolato dal
       browser nello stesso spazio di coordinate dello zoom globale su
       <html>, non soffre del bug di misura che affligge il pin di
       ScrollTrigger sotto zoom (che farebbe partire il pannello successivo
       un filo in anticipo). GSAP qui serve solo a sincronizzare il colore
       della navbar con il pannello attivo. */
    const questionPanels = gsap.utils.toArray<HTMLElement>('.layered-panel');

    questionPanels.forEach((panel) => {
      ScrollTrigger.create({
        trigger: panel,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) {
            navbarInverted.set(panel.classList.contains('panel--lime'));
          }
        },
      });
    });

    // Appena si esce dal blocco domande la navbar torna visibile.
    ScrollTrigger.create({
      trigger: '.questions-container',
      start: 'top top',
      end: 'bottom top',
      onLeave: () => navbarInverted.set(false),
      onLeaveBack: () => navbarInverted.set(false),
    });

    /* ── GALLERY GATE: transizione ─────
       Trigger per-frame (onUpdate), non un onEnter puntuale: su mobile,
       con l'easing di Lenis e la toolbar dinamica del browser.
       0.6 di differenza è abbastanza da lasciar leggere bene l'ultima frase dello storytelling, ma
       abbastanza presto da non lasciare una fascia nera vuota prima della galleria. */
    ScrollTrigger.create({
      trigger: galleryGate,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        if (self.progress >= GALLERY_GATE_TRIGGER_PROGRESS) navigateToGallery();
      },
    });

    /* ── GALLERY GATE: ingresso galleria ───────────────────────────────
       Parte a 'top top' — l'istante in cui le foto riempiono lo schermo,
       a fine reveal — e non a 'bottom bottom' (il fondo del documento):
       quel punto, su mobile, spesso non viene mai raggiunto per via
       dell'easing di Lenis e della toolbar dinamica (dvh), quindi un
       onEnter agganciato lì non scatterebbe mai. Il gate ha ~50dvh di
       margine sotto (vedi .gallery-gate nel CSS) proprio per garantire che
       'top top' cada ben prima del fondo reale del documento. */
    ScrollTrigger.create({
      trigger: galleryGate,
      start: 'top top',
      onEnter: () => navigateToGallery(),
    });

    return () => {
      navbarInverted.set(false);
      navbarHidden.set(false);
      window.removeEventListener('pointermove', handlePointerPeek);
      // Rimuove tutti gli ScrollTrigger quando si cambia pagina.
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
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

    <section class="story story--right story--numbers safe-area">
      <p use:blurText={{ delay: 65, duration: 800 }}>
        <span class="accent">18.000</span> alle Olimpiadi e<br /> <span class="accent">4.600</span> alle Paralimpiadi
      </p>
    </section>

    <section class="story story--quote story--quote-left safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari <br />sono rimasti <span class="accent">invisibili</span>
      </p>
    </section>

    <section class="story story--quote story--quote-right safe-area">
      <p class="quote" use:blurText={{ delay: 55, duration: 850, threshold: 0.15 }}>
        Nella narrazione ufficiale<br class="q-break" /> erano spesso <span class="accent">dati per scontati</span>
      </p>
    </section>

    <!-- ── Sequenza domande a scroll (layered pinning, vedi CSS sotto) ── -->
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
          <span class="ghost-lime">LO RIFAREBBERO?</span>
        </h2>
      </section>

    </div>

    <section class="story story--left story--summary safe-area">
      <p class="story-summary-copy" use:blurText={{ delay: 65, duration: 750, threshold: 0.2 }}>
        Abbiamo chiesto ai volontari <br>di raccontarsi. <br>Le loro testimonianze sono raccolte in questo
        <a href="/gallery" class="accent archivio-link">archivio</a>
      </p>
    </section>

    <!-- Regione di scroll "muta" che innesca la transizione verso la galleria — nessuna anticipazione di immagini, solo spazio. -->
    <div class="gallery-gate" bind:this={galleryGate} aria-hidden="true"></div>

  </main>
</div>

<style>
  /* ── Allineamento testi per sezione ── */
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
    align-items: center; /* centro verticale all'interno dello spazio rimanente */
    flex-shrink: 0;
    box-sizing: border-box; 
    font-size: var(--unit-36, 36px);
  }

  /* Struttura degli H2 pensata per garantire l'impaginazione */
  .question h2 {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  /* ── LAYERED PINNING: contenitore e pannelli ── */
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

  .layered-panel h2 {
    font-family: var(--font-display);
    /* --qfit (default 1) è impostato da fitQuestions() così ogni domanda si
       restringe quanto basta per stare nel pannello — la dimensione fissa
       trabocca appena una riga (o una parola lunga come "CONCRETAMENTE") è
       più larga del pannello. nowrap preserva la struttura di riga definita
       dai <br>; il fit scala solo la riga più larga per farla stare. */
    font-size: calc(var(--ts-scrollitelling-size, 116px) * var(--qfit, 1));
    font-weight: var(--ts-scrollitelling-weight, 800);
    /* Figma "Scrollitelling": 116px / line-height 106 / letter-spacing 0. */
    line-height: calc(var(--ts-scrollitelling-line-height, 106px) * var(--qfit, 1));
    letter-spacing: var(--ts-scrollitelling-letter-spacing, 0em);
    margin: 0;
    width: 100%;
    white-space: nowrap;
  }

  .ghost-lime {
    -webkit-text-stroke-color: var(--q-fg, var(--color-content-accent));
    -webkit-text-stroke-width: var(--stroke-1, 2px);
    color: transparent;
  }

  .ghost-black {
    -webkit-text-stroke-color: var(--q-fg, var(--color-content-body-black));
    -webkit-text-stroke-width: 2.5px; /* leggermente più spesso di --stroke-1: scelta intenzionale per bilanciare il peso ottico su fondo lime */
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
      width: min(340px, calc(100vw - var(--spacing-5, 24px) * 2));
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

  /* Mobile (≤700px, stesso cutoff di zoom:1 usato in app.html).  
   Nella Figma “Home‑mobile” ogni domanda occupa un’intera schermata (100dvh),
   alternando lime e dark. Il testo della domanda è centrato verticalmente e
   ha un inset di 24px sul lato a cui è allineato.

   Sul device di riferimento da 874px, questo centraggio porta il blocco
   testuale a 389px dal bordo superiore e 389px da quello inferiore
   (389 + 96 di testo + 389 = 874), esattamente come annotato in Figma.

   Il testo è pieno (nero su lime, bianco su dark), mai “ghost”.  
   I pannelli usano lo stesso sistema di sticky layered‑pinning del desktop
   (vedi .layered-panel più sotto). */

  @media (max-width: 700px) {
   /* Figma mobile (frame “Home‑mobile”): quattro sezioni a schermo pieno,
   ciascuna alta 874px, equivalenti a un viewport da 100dvh. Qui il
   comportamento è un semplice SCROLL lineare: ogni domanda è centrata
   verticalmente nella propria schermata, alternando lime/dark.

   Questo non è il meccanismo “sticky cover” del desktop: il passaggio
   della domanda successiva sopra quella corrente risulta poco chiaro
   su mobile, e Figma mostra esplicitamente uno scroll semplice.  
   Quindi: posizione statica, altezza di una schermata, nessun hold margin. */
   
    .layered-panel {
  /* Sticky layered‑pinning come su desktop: ogni domanda viene “pinnata”
   a schermo intero e la SUCCESSIVA scorre verso l’alto andando a coprirla.
   L’ordine di copertura segue lo z-index: nth-child(1)→1 … (4)→4, già
   impostato per tutte le larghezze superiori al breakpoint.

   Il margine di 30dvh è la fase di “hold”: la domanda rimane a schermo
   pieno per quella porzione di scroll prima che la successiva inizi a
   salire e sovrapporsi. */
      position: sticky;
      top: 0;
  /* Una schermata piena per ogni sezione. Su mobile lo zoom è sempre 1, quindi
   non applichiamo alcuna divisione tramite /page-zoom: un valore errato di
   --page-zoom renderebbe l’intero calc() invalido e l’altezza collasserebbe
   al contenuto — esattamente il bug in cui due domande finiscono nella stessa
   schermata.

   La dichiarazione 100vh è un fallback per coloro che non supportano dvh,
   così l’altezza non può mai ricadere su “auto”. */
      height: 100vh;
      height: 100dvh;
      min-height: 100dvh;
      margin: 0 0 30dvh !important;
    /* Layout in colonna così il centro verticale è gestito da
   `justify-content: center` (asse principale) — chiaro, diretto e
   indipendente dall’allineamento orizzontale usato su desktop.

   In questo modo la domanda risulta perfettamente centrata: 389px
   dal bordo superiore e 389px da quello inferiore sul device da 874px,
   rispettando le misure annotate in Figma.

   L’allineamento sinistra/destra invece è gestito da `align-items`,
   impostato per ogni domanda più sotto. */
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .layered-panel h2 {
     /* Colonna Figma: larghezza massima 353px, con un inset di 24px sul lato
    dell’allineamento. Il lato opposto rimane naturalmente “libero”
    (100vw - 24px*2), seguendo la stessa logica della safe-area usata nell’app. */
      width: min(353px, calc(100vw - var(--spacing-5, 24px) * 2));
      margin: 0;
      /* Scaled from the Figma 116px down to a phone-readable size. Text WRAPS
         (white-space: normal) so long lines/words break instead of shrinking to
         one nowrap line; the <br>s still define the primary line breaks and
         overflow-wrap is the safety net. This overrides the desktop
         116px/nowrap/--qfit rule (fitQuestions() opts out below 700px). */
      font-size: clamp(28px, 9vw, 36px);
      font-weight: 800;
      line-height: 0.889;     /* Figma: leading 32 / size 36 */
      letter-spacing: 0.03em; /* Figma: tracking 1.08 / size 36 */
      white-space: normal;
      overflow-wrap: break-word;
    }

    .layered-panel h2 br.br-desktop {
      display: none;
    }

    .layered-panel h2 br.br-mobile {
      display: inline;
    }

    /* Override della regola desktop `.question h2 span { display: inline-block }`,
   che altrimenti farebbe comportare gli span multi‑parola (e gli span per‑parola
   generati da scrollReveal) come blocchi rigidi: niente flusso naturale, niente
   spezzatura del testo. Qui forziamo il comportamento testuale normale. */
    .layered-panel h2 span {
      display: inline;
    }

    /* Q1/Q3 a SINISTRA, Q2/Q4 a DESTRA (come in Figma). Nel layout a colonna
   questo è l’asse trasversale, quindi usiamo `align-items`.  
   Ogni domanda ha un inset di --spacing-5 (24px), che sovrascrive la
   padding laterale desktop da 72px (.panel--lime/--dark) grazie alla
   specificità più alta.

   Entrambe le padding sono impostate in modo che il lato opposto non
   arrivi mai a toccare il bordo.  
   La posizione centrale verticale invece è gestita dal `justify-content` del
   pannello, definito sopra. */

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

   /* Su mobile il testo in Figma è FILL — niente ghost/outline: nero nelle
   sezioni lime, off‑white (#fafafa) in quelle dark. Questo override forza
   il trattamento solido, sostituendo quello ghost/accent per‑parola del desktop.

   L’uso di !important è necessario perché la regola desktop `.panel--dark .accent` compare più avanti nel file con la stessa
   specificità e altrimenti avrebbe la precedenza. */

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

  /* ── Colori (sfondo e testo) ── */
  .panel--lime {
    background-color: var(--color-content-accent, #bdff5d);
    color: var(--color-content-body-black, #0e0e0e);
    text-align: left;
    padding: 0;
    padding-left: var(--spacing-11, 72px);
  }

  .panel--lime .accent {
    color: var(--color-content-body-black, #0e0e0e);
  }

  .panel--dark {
    background-color: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    text-align: right;
    padding: 0;
    padding-right: var(--spacing-11, 72px);
  }

  .panel--dark .accent {
    color: var(--color-content-accent, #bdff5d);
  }
</style>
