<script>
  import '../../lib/styles/tokens.css';
</script>

<svelte:head>
  <title>About — Fuori Campo</title>
</svelte:head>

<main class="about-page">
  <section class="hero">
    <h1>FUORI CAMPO</h1>

    <p>
      Vogliamo raccontare le Olimpiadi <br />attraverso gli occhi di chi le ha <br />costruite restando nell&apos;ombra.<br /> Questo progetto celebra i volontari:<br /> il motore invisibile che, con dedizione <br>silenziosa, ha permesso a Milano<br>Cortina 2026 di brillare.
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
    min-height: calc(100dvh - var(--navbar-height));
    background: #bdff5d;
    color: #000;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    font-family: "Forma DJR Display", sans-serif;
    padding-bottom: 24px;
    display: flex;
    flex-direction: column;
  }

  .hero {
    padding: clamp(56px, 8vh, 110px) clamp(16px, 2vw, 24px) 0 clamp(24px, 5.5vw, 80px);
    flex: 1 0 auto;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(48px, 8vw, 116px);
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
  }

  .hero p {
    /* Indent scales: zero on narrow, up to 260 px on 1440 px+ */
    margin: clamp(12px, 1.5vw, 18px) 0 0 clamp(0px, 18vw, 260px);
    max-width: 1311px;
    color: #000;
    font-family: "Forma DJR Display", sans-serif;
    font-size: clamp(26px, 5.8vw, 84px);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: 0;
    white-space: normal;
  }

  .team {
    position: relative;
    left: 0;
    right: 0;
    padding: 0 clamp(24px, 5vw, 72px) 10px;
    color: #000;
    font-size: clamp(14px, 1.5vw, 24px);
    line-height: 1.3;
    font-weight: 500;
    margin-top: clamp(24px, 3vw, 40px);
    display: flex;
    justify-content: flex-start;
  }

  .team-copy {
    white-space: normal;
    text-align: left;
    max-width: 100%;
  }

  .team-copy p {
    margin: 0;
  }
</style>
