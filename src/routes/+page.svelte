<script>
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import { blurReveal } from "../lib/actions/blurReveal";
  import { imgArrow3, imgNavbar, imgStatusDefault, galleryImages } from "../lib/design/assets";

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
        <BlurTitle />
      </div>
    </section>

    <!-- INTRO -->
    <section class="story story--left story--intro"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 24 }}>
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <!-- NUMERI -->
    <section class="story story--right story--numbers"
      use:blurReveal={{ direction: "right", variant: "skew", blur: 28 }}>
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <!-- QUOTE -->
    <section class="quote-grid">
      <p class="quote quote--left"
        use:blurReveal={{ direction: "left", variant: "clip", blur: 20, threshold: 0.4 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
      </p>

      <p class="quote quote--right"
        use:blurReveal={{ direction: "right", variant: "clip", blur: 20, threshold: 0.4, delay: 150 }}>
        Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <!-- DOMANDA 1 -->
    <section class="question question--left" style={`margin-left:var(--question-left-1)`}
      use:blurReveal={{ direction: "left", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="accent">MA </span>
          <span class="ghost">CHI SONO </span>
          <span class="accent">DAVVERO</span><br />
          <span class="accent">I VOLONTARI?</span>
        </div>
      </h2>
    </section>

    <!-- DOMANDA 2 -->
    <section class="question question--right" style={`margin-left:var(--question-left-2)`}
      use:blurReveal={{ direction: "right", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">PERCHÈ </span>
          <span class="accent">HANNO DECISO</span><br />
          <span class="accent">DI CANDIDARSI?</span>
        </div>
      </h2>
    </section>

    <!-- DOMANDA 3 -->
    <section class="question question--left" style={`margin-left:var(--question-left-3)`}
      use:blurReveal={{ direction: "left", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">COSA FACEVANO </span><br />
          <span class="accent">CONCRETAMENTE?</span>
        </div>
      </h2>
    </section>

    <!-- DOMANDA 4 -->
    <section class="question question--right" style={`margin-left:var(--question-left-4)`}
      use:blurReveal={{ direction: "right", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="accent">NE È VALSA LA PENA?</span><br />
          <span class="ghost">LO RIFAREBBERO?</span>
        </div>
      </h2>
    </section>

    <!-- SUMMARY -->
    <section class="story story--left story--summary"
      use:blurReveal={{ direction: "left", threshold: 0.3 }}>
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <span class="accent"> archivio</span>.
      </p>
    </section>

    <!-- SCROLL CUE -->
    <section class="scroll-cue" aria-label="Scroll cue"
      use:blurReveal={{ direction: "left", threshold: 0.5, blur: 10, translateX: 20, duration: 600 }}>
      <p>Continua a scorrere per accedere alla galleria</p>
      <img src={imgArrow3} alt="" aria-hidden="true" />
    </section>

    <!-- GALLERY -->
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
