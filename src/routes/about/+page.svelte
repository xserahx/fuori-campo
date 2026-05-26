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
    padding: 110px 24px 0 80px;
    flex: 1 0 auto;
  }

  .hero h1 {
    margin: 0;
    font-size: 116px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
  }

  .hero p {
    margin: 18px 0 0 260px;
    max-width: 1311px;
    color: #000;
    font-family: "Forma DJR Display", sans-serif;
    font-size: 84px;
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: 0;
    white-space: normal;
  }

  .team {
    position: relative;
    left: 0;
    right: 0;
    padding: 0 72px 10px;
    color: #000;
    font-size: 24px;
    line-height: 1;
    font-weight: 500;
    margin-top: 40px;
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

  @media (min-width: 900px) {
    .hero {
      padding-top: 110px;
      padding-left: 80px;
      padding-right: 24px;
    }
  }
</style>
