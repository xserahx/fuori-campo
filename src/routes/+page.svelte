<script>
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import { BlurReveal } from "../lib/actions/blurReveal";
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

    <section class="story story--left story--intro"
      use:BlurReveal={{ direction: "left", threshold: 0.3 }}>
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <section class="story story--right story--numbers"
      use:BlurReveal={{ direction: "right", threshold: 0.3 }}>
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <section class="quote-grid">
      <p class="quote quote--left"
        use:BlurReveal={{ direction: "left", threshold: 0.4, blur: 14, translateX: 50 }}>
        Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
      </p>
      <p class="quote quote--right"
        use:BlurReveal={{ direction: "right", threshold: 0.4, blur: 14, translateX: 50 }}>
        Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-1)`}
      use:BlurReveal={{ direction: "left", threshold: 0.2, blur: 22, translateX: 80, duration: 900 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="accent">MA </span>
          <span class="ghost">CHI SONO </span>
          <span class="accent">DAVVERO</span><br />
          <span class="accent">I VOLONTARI?</span>
        </div>
      </h2>
    </section>

    <section class="question question--right" style={`margin-left:var(--question-left-2)`}
      use:BlurReveal={{ direction: "right", threshold: 0.2, blur: 22, translateX: 80, duration: 900 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">PERCHÈ </span>
          <span class="accent">HANNO DECISO</span><br />
          <span class="accent">DI CANDIDARSI?</span>
        </div>
      </h2>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-3)`}
      use:BlurReveal={{ direction: "left", threshold: 0.2, blur: 22, translateX: 80, duration: 900 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">COSA FACEVANO </span><br />
          <span class="accent">CONCRETAMENTE?</span>
        </div>
      </h2>
    </section>

    <section class="question question--right" style={`margin-left:var(--question-left-4)`}
      use:BlurReveal={{ direction: "right", threshold: 0.2, blur: 22, translateX: 80, duration: 900 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="accent">NE È VALSA LA PENA?</span><br />
          <span class="ghost">LO RIFAREBBERO?</span>
        </div>
      </h2>
    </section>

    <section class="story story--left story--summary"
      use:BlurReveal={{ direction: "left", threshold: 0.3 }}>
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <span class="accent"> archivio</span>.
      </p>
    </section>

    <section class="scroll-cue" aria-label="Scroll cue"
      use:BlurReveal={{ direction: "left", threshold: 0.5, blur: 10, translateX: 20, duration: 600 }}>
      <p>Continua a scorrere per accedere alla galleria</p>
      <img src={imgArrow3} alt="" aria-hidden="true" />
    </section>

    <section class="gallery" aria-label="Gallery preview">
      {#each galleryImages as src, index}
        <figure
          class="gallery-item"
          style={`width:var(--gallery-width-${(index % galleryCount) + 1}); margin-top:var(--gallery-offset-${(index % offsetCount) + 1});`}
          use:BlurReveal={{ direction: index % 2 === 0 ? "left" : "right", threshold: 0.1, blur: 12, translateX: 30, duration: 700 }}>
          <img src={src} alt="gallery sample" />
        </figure>
      {/each}
    </section>
  </main>
</div>
