<script>
  import { imgNavbar, imgStatusDefault } from '$lib/design/assets';
</script>

<svelte:head>
  <title>About — Fuori Campo</title>
</svelte:head>

<main class="about-page">
  <header class="navbar" aria-label="Main navigation">
    <img class="navbar-bg" src={imgNavbar} alt="" aria-hidden="true" />
    <div class="navbar-inner">
      <a class="logo" href="/" aria-label="Fuori Campo home">
        <img src={imgStatusDefault} alt="" />
      </a>

      <nav class="nav-links" aria-label="Sections">
        <a href="/gallery">GALLERIA</a>
        <a href="/category">CATEGORIE</a>
        <a href="/about">ABOUT</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <h1>FUORI CAMPO</h1>

    <p>
      Vogliamo raccontare le Olimpiadi <br />attraverso gli occhi di chi le ha <br />costruite restando nell&apos;ombra.<br /> Questo progetto celebra i volontari:<br /> il motore invisibile che, con dedizione silenziosa, ha permesso a Milano <br />Cortina 2026 di brillare.
    </p>
  </section>

  <footer class="team" aria-label="Team credits">
    <div class="team-copy">
      <p>Il nostro Team</p>
      <p>Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome</p>
    </div>
  </footer>
</main>

<style>
  :global(body) {
    background: #bdff5d;
  }

  .about-page {
    min-height: 100vh;
    background: #bdff5d;
    color: #000;
    position: relative;
    overflow: hidden;
    font-family: "Forma DJR Display", sans-serif;
  }

  .navbar {
    position: absolute;
    font-family: "Forma DJR Display Bold", sans-serif;
    inset: 0 0 auto 0;
    padding: 24px;
    z-index: 2;
  }

  .navbar-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    pointer-events: none;
  }

  .navbar-inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .logo {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    text-decoration: none;
    color: inherit;
  }

  .logo img {
    display: block;
    width: 67px;
    height: 63.784px;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .nav-links a {
    color: #000;
    text-decoration: none;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }

  .hero {
    padding: 96px 24px 0;
  }

  .hero h1 {
    margin: 20px 0 0 48px;
    font-size: clamp(4rem, 8vw, 5.2rem);
    line-height: 0.92;
    font-weight: 800;
    letter-spacing: 0;
  }

  .hero p {
    margin: 50px 208.5px 56px;
    max-width: none;
    color: #000;
    font-family: "Forma DJR Display", sans-serif;
    font-size: clamp(2.2rem, 4.2vw, 3.5rem);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0;
    white-space: normal;
  }

  .team {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0 24px 10px;
    color: #000;
    font-size: 24px;
    line-height: 1;
    font-weight: 500;
  }

  .team-copy {
    white-space: normal;
  }

  .team-copy p {
    margin: 0;
  }

  @media (min-width: 900px) {
    .hero {
      padding-top: 96px;
      padding-left: 24px;
      padding-right: 24px;
    }
  }
</style>
