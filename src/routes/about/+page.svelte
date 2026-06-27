<script lang="ts">
  import '../../lib/styles/tokens.css';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import { navbarInverted } from '$lib/stores/navbar';
  import { onMount } from 'svelte';

  onMount(() => {
    const mq = window.matchMedia('(max-width: 599px)');
    const update = (e: MediaQueryList | MediaQueryListEvent) => navbarInverted.set(e.matches);
    update(mq);
    mq.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
      navbarInverted.set(false);
    };
  });
</script>

<svelte:head>
  <title>About — Fuori Campo</title>
</svelte:head>

<main class="about-page" id="main-content">
  <section class="hero">
    <h1>FUORI CAMPO</h1>

    <p>
      Vogliamo raccontare le Olimpiadi <br />attraverso gli occhi di chi le ha <br />costruite restando nell&apos;ombra.<br /> Questo progetto celebra i volontari:<br /> il motore invisibile che, con dedizione <br>silenziosa, ha permesso a Milano<br>Cortina 2026 di brillare.
    </p>
  </section>

  <img
    class="team-photo"
    src="/volunteer_images/carosello_categorie/cat-1.jpg"
    alt="Il team"
    draggable="false"
  />

  <footer class="team" aria-label="Team credits">
    <div class="team-copy">
      <p>Il nostro Team</p>
      <p>Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome, Nome  Cognome</p>
    </div>
  </footer>
</main>

<SiteFooter />

<style>
  /* ── COSMOS entrance keyframes (dark → lime context, inverted) ── */
  @keyframes about-rise {
    from {
      opacity: 0;
      filter: blur(28px);
      transform: translateY(28px) scale(1.02);
    }
    to {
      opacity: 1;
      filter: blur(0px);
      transform: translateY(0px) scale(1);
    }
  }

  @keyframes about-slide {
    from {
      opacity: 0;
      filter: blur(16px);
      transform: translateX(-24px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
      transform: translateX(0px);
    }
  }

  .about-page {
    min-height: calc(100dvh - var(--navbar-height));
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    font-family: var(--font-display);
    padding-bottom: 24px;
    display: flex;
    flex-direction: column;
  }

  /* ── Responsive scroll gate ───────────────────────────────────────
     The About layout is sized to the 16" Figma reference frame (1728 × 1117).
     At or above that viewport HEIGHT it stays fixed exactly as in Figma — page
     scrolling is locked. Vertical scrolling is enabled only on shorter
     viewports (height < 1117px), where the fixed layout would otherwise clip
     its content. The real scroll container is the document, so the lock is on
     <html>; `:has(.about-page)` keeps it scoped to this page only (and it
     stops matching automatically when you navigate away). */
  @media (min-height: 1117px) {
    :global(html:has(.about-page)) {
      overflow: hidden;
    }
    .about-page {
      overflow-y: hidden;
    }
  }

  .hero {
    padding: clamp(56px, 8vh, 110px) clamp(16px, 2vw, 24px) 0 clamp(24px, 5.5vw, 80px);
    flex: 1 0 auto;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px);
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
    animation: about-rise 900ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
  }

  .hero p {
    /* Indent scales: zero on narrow, up to 260 px on 1440 px+ */
    margin: clamp(12px, 1.5vw, 18px) 0 0 clamp(0px, 18vw, 260px);
    max-width: 1311px;
    color: var(--color-content-body, #fafafa);
    font-family: var(--font-display);
    font-size: clamp(26px, calc(84px / max(var(--page-zoom, 1), 0.65)), 145px);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: 0;
    white-space: normal;
    animation: about-rise 1000ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
  }

  /* Team photo — hidden on desktop, shown on mobile */
  .team-photo {
    display: none;
  }

  .team {
    position: relative;
    left: 0;
    right: 0;
    padding: 0 clamp(24px, 5vw, 72px) 10px;
    color: rgba(250, 250, 250, 0.55);
    font-size: clamp(14px, 1.5vw, 24px);
    line-height: 1.3;
    font-weight: 500;
    margin-top: clamp(24px, 3vw, 40px);
    display: flex;
    justify-content: flex-start;
    animation: about-slide 700ms cubic-bezier(0.22, 1, 0.36, 1) 500ms both;
  }

  .team-copy {
    white-space: normal;
    text-align: left;
    max-width: 100%;
  }

  .team-copy p {
    margin: 0;
  }

  /* ── Mobile (≤ 599px) — Figma node 6197-9017 "About-mobile" ──── */
  @media (max-width: 599px) {
    .about-page {
      background: var(--color-content-accent);
      color: var(--color-content-body-black);
      padding-bottom: 48px;
    }

    .hero {
      padding: 32px 27px 0;
      flex: 0 0 auto;
    }

    .hero h1 {
      font-size: 56px;
      line-height: 1;
      color: var(--color-content-body-black);
    }

    .hero p {
      margin: 16px 0 0;
      font-size: 24px;
      font-weight: 500;
      line-height: 1.05;
      color: var(--color-content-body-black);
    }

    /* Let the text wrap naturally on mobile */
    .hero p br {
      display: none;
    }

    .team-photo {
      display: block;
      width: calc(100% - 54px);
      margin: 32px 27px 0;
      filter: grayscale(100%);
      aspect-ratio: 4 / 3;
      object-fit: cover;
    }

    .team {
      margin-top: 24px;
      padding: 0 27px;
      color: var(--color-content-body-black);
      font-size: 14px;
      line-height: 1.4;
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero h1,
    .hero p,
    .team {
      animation: none;
      opacity: 1;
      filter: none;
      transform: none;
    }
  }
</style>
