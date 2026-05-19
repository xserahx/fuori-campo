<script>
  import "../lib/styles/tokens.css";
  import { imgArrow3, imgNavbar, imgStatusDefault, galleryImages } from "../lib/design/assets";

  // Gallery sizing now driven by CSS tokens for exact Figma spacing
  const galleryCount = 12;
  const offsetCount = 6;
</script>

<div class="site">
  <header class="navbar">
    <img class="navbar-bg" src={imgNavbar} alt="" aria-hidden="true" />
    <div class="navbar-inner">
      <a class="logo" href="/" aria-label="Fuori campo home">
        <img src={imgStatusDefault} alt="" />
      </a>

      <nav class="nav-links" aria-label="Main navigation">
        <a href="/galleria">GALLERIA</a>
        <a href="/categorie">CATEGORIE</a>
        <a href="/about">ABOUT</a>
      </nav>
    </div>
  </header>

  <main class="landing">
    <section class="hero-outer">
      <div class="hero-inner">
        <div class="title-wrap">
          <h1 class="title-large title-line--filled">FUORI</h1>
          <h1 class="title-large title-line--outline">CAMPO</h1>
        </div>
      </div>
    </section>

    <section class="story story--left story--intro">
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <section class="story story--right story--numbers">
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <section class="quote-grid">
      <p class="quote quote--left">
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
      </p>
      <p class="quote quote--right">
        Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-1)`}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
            <span class="accent">MA </span>
            <span class="ghost">CHI SONO </span>
            <span class="accent">DAVVERO</span><br />
            <span class="accent">I VOLONTARI?</span>
        </div>
      </h2>
    </section>

    <section class="question question--right" style={`margin-left:var(--question-left-2)`}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
            <span class="ghost">PERCHÈ </span>
            <span class="accent">HANNO DECISO</span><br />
            <span class="accent">DI CANDIDARSI?</span>
        </div>
      </h2>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-3)`}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
            <span class="ghost">COSA FACEVANO </span><br />
            <span class="accent">CONCRETAMENTE?</span>
        </div>
      </h2>
    </section>

    <section class="question question--right" style={`margin-left:var(--question-left-4)`}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
            <span class="accent">NE È VALSA LA PENA?</span><br />
            <span class="ghost">LO RIFAREBBERO?</span>
        </div>
      </h2>
    </section>

    <section class="story story--left story--summary">
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <span class="accent"> archivio</span>.
      </p>
    </section>

    <section class="scroll-cue" aria-label="Scroll cue">
      <p>Continua a scorrere per accedere alla galleria</p>
      <img src={imgArrow3} alt="" aria-hidden="true" />
    </section>

    <section class="gallery" aria-label="Gallery preview">
      {#each galleryImages as src, index}
        <figure
          class="gallery-item"
          style={`width:var(--gallery-width-${(index % galleryCount) + 1}); margin-top:var(--gallery-offset-${(index % offsetCount) + 1});`}>
          <img src={src} alt="gallery sample" />
        </figure>
      {/each}
    </section>
  </main>
</div>