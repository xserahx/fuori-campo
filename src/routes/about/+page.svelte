<script lang="ts">
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';

  import '$lib/styles/reset.css';
  import '$lib/styles/tokens.css';
  import '$lib/styles/base.css';
  import '$lib/styles/utilities.css';

  // ── Contenuti Oggettivi e Fattuali ──────────────
  const introSlides = [
    {
      titleTop: 'COS’È',
      titleBottom: 'FUORI CAMPO?',
      body: 'Fuori Campo è un archivio delle esperienze dei volontari di Milano Cortina 2026: un invito a scoprire il loro lavoro, spesso nascosto o dato per scontato, le fotografie e i ricordi che hanno scelto di condividere.'
    },
    {
      titleTop: 'QUAL È',
      titleBottom: 'L’OBIETTIVO?',
      body: 'Raccontare le Olimpiadi e le Paralimpiadi attraverso gli occhi dei volontari e sensibilizzare il pubblico sul tema, ispirando chiunque desideri, in futuro, vivere l’esperienza del volontariato sportivo.'
    },
    {
      titleTop: 'COM’È NATO',
      titleBottom: 'FUORI CAMPO?',
      body: 'Fuori Campo è un progetto nato dal Laboratorio di Web e Digital Design del secondo anno triennale del corso di Design della Comunicazione al Politecnico di Milano.'
    },
  ];

  let activeIndex = $state(0);

  function next() {
    activeIndex = (activeIndex + 1) % introSlides.length;
  }

  function prev() {
    activeIndex = (activeIndex - 1 + introSlides.length) % introSlides.length;
  }
</script>

<main class="about-page">
  <section class="intro safe-area">
    
    <div class="ghost-grid">
      {#each introSlides as slide, i}
        <div class="slide-content" class:active={i === activeIndex} aria-hidden={i !== activeIndex}>
          
          <h1 class="section-title">
            <span class="rise-mask"><span class="title-fill">{slide.titleTop}</span></span>
            <span class="rise-mask"><span class="title-outline">{slide.titleBottom}</span></span>
          </h1>

          <div class="intro-body-mask">
            <p class="intro-body">{slide.body}</p>
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
        <ArrowButton direction="left" ariaLabel="Slide precedente" onclick={prev} />
        <ArrowButton direction="right" ariaLabel="Slide successiva" onclick={next} />
      </div>
    </div>
    
  </section>

  <section class="test-scroll safe-area">
    <h2>ZONA CAROSELLO</h2>
    <p>ANCORA DA FARE.</p>
  </section>

</main>

<SiteFooter />

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary, #0e0e0e);
  }

  /* ── Page shell ─────────────────────────────────────────────── */
  .about-page {
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* ── Sezione Intro ────────────────────────────────────────────── */
  .intro {
    display: flex;
    flex-direction: column;
    padding-top: var(--spacing-10, 64px);
    padding-bottom: clamp(24px, 4vh, 48px);
    overflow-x: hidden;
  }

  /* ── Il trucco della Ghost Grid ───────────────────────────────── */
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
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  }

  .slide-content.active {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }

  /* ── Titoli (ESTRATTI ESATTAMENTE DAL RIFERIMENTO) ────────────── */
  .section-title {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .title-fill,
  .title-outline {
    font-family: var(--font-display);
    /* --title-fit (default 1) is set by fitTitle() in JS to shrink the
       one-line (nowrap) title just enough that the longest line fits its
       container at any desktop width — otherwise the --page-zoom-compensated
       size overflows and gets clipped by `overflow: hidden` (e.g. "GESTIONE
       OPERATIVA" at ~995px). */
    font-size: calc(clamp(
      var(--unit-56),
      calc(var(--unit-116) / max(var(--page-zoom, 1), 0.65)),
      var(--unit-200)
    ) * var(--title-fit, 1));
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    margin-left: var(--spacing-14);
    margin-top: 0;
    max-width: calc(100% - var(--spacing-17) - var(--spacing-11));
    overflow: hidden;
    min-width: 0;
  }

  .title-fill {
    color: var(--color-content-accent, #bdff5d);
    margin-top: -0.05em;
  }

  .rise-mask {
    display: block;
    overflow: hidden;
    padding-top: 0.06em;
  }

  /* ── Paragrafo descrittivo (ESTRATTO ESATTAMENTE) ─────────────── */
  .intro-body-mask {
    width: 100%; 
    position: relative;
    z-index: 5;
    margin: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none; /* Lascia passare i click alla card sotto */
  }

  .intro-body {
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
    
    /* 2. LA MAGIA: Il testo ora guarda l'altezza (vh), non solo la larghezza (vw) */
    /* Parte da un minimo di 20px e si ferma a 45px. Nel mezzo, usa il 4% dell'altezza dello schermo */
    font-size: clamp(25px, 6vh, 45px); 
  }

  /* ── Dot e Frecce (ESTRATTI ESATTAMENTE) ──────────────────────── */
  .dot-frecce {
    display: flex;
    align-items: center;
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
    content: '';
    display: block;
    width: var(--unit-16);
    height: var(--unit-16);
    border-radius: 50%;
    background: rgba(189, 255, 93, 0.3);
    transition: background 220ms ease, box-shadow 220ms ease;
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

  /* ── Area Test Scroll ─────────────────────────────────────────── */
  .test-scroll {
    min-height: 100vh; 
    background: #111;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-top: 1px solid #333;
    padding: 40px;
  }
</style>