<script lang="ts">
  import { page } from '$app/state';

  const links = [
    { href: '/gallery',  label: 'Galleria'  },
    { href: '/category', label: 'Categorie' },
    { href: '/about',    label: 'About'     },
  ];

  function isActive(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
  }
</script>

<footer class="site-footer" aria-label="Footer">

  <div class="footer-glow" aria-hidden="true"></div>

  <div class="footer-inner">

    <!-- Hero (left) + vertical nav (right) at the same row height -->
    <div class="footer-mid">
      <p class="footer-hero" aria-label="Fuori Campo">
        <span class="hero-fill">FUORI</span>
        <span class="hero-outline">CAMPO</span>
      </p>

      <nav class="footer-nav" aria-label="Navigazione footer">
        {#each links as link}
          <a
            href={link.href}
            class="footer-nav-link"
            class:footer-nav-link--active={isActive(link.href)}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >{link.label}</a>
        {/each}
      </nav>
    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <span class="footer-copy">Fuori Campo &copy; 2026</span>
      <span class="footer-place">Milano &middot; Cortina 2026</span>
    </div>

  </div>
</footer>

<style>
  @keyframes glow-breathe {
    0%,  100% { opacity: 0.80; transform: scale(1);    }
    50%        { opacity: 1;    transform: scale(1.06); }
  }

  /* ── Shell ──────────────────────────────────────────────────────── */
  .site-footer {
    position: relative;
    width: 100%;
    min-height: 50dvh;
    background: var(--color-background-primary, #0e0e0e);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Lime glow — screen blend, strong lime centre ───────────────── */
  .footer-glow {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70%;
    pointer-events: none;
    z-index: 0;
    transform-origin: bottom center;
    filter: blur(32px);
    /* Vertical lime glow rising from the floor */
    background:
      linear-gradient(to top, rgba(189, 255, 93, 0.75) 0%, rgba(189, 255, 93, 0.28) 50%, transparent 80%);
    /* Horizontal mask: left nearly invisible → right fully visible */
    mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.75) 65%, rgba(0,0,0,1) 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.75) 65%, rgba(0,0,0,1) 100%);
    animation: glow-breathe 7s ease-in-out infinite;
  }

  /* ── Inner — column: mid row + bottom bar ───────────────────────── */
  .footer-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--spacing-6, 32px) var(--spacing-11, 72px) var(--spacing-5, 24px);
    min-height: 50dvh;
    box-sizing: border-box;
  }

  /* ── Mid row: hero left, nav right, vertically centred ─────────── */
  .footer-mid {
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  /* ── Hero text ───────────────────────────────────────────────────── */
  .footer-hero {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none;
    user-select: none;
  }

  .hero-fill,
  .hero-outline {
    display: block;
    font-family:    var(--font-display);
    font-size:      clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 190px);
    font-weight:    800;
    line-height:    0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  .hero-fill {
    color: var(--color-content-accent, #bdff5d);
    margin-bottom: -6px;
  }

  .hero-outline {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: clamp(1px, 0.12vw, 2px) var(--color-content-accent, #bdff5d);
    padding-left: clamp(24px, calc(140px / max(var(--page-zoom, 1), 0.65)), 220px);
  }

  /* ── Vertical nav — right side, aligned to hero block ──────────── */
  .footer-nav {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-2, 8px);
    flex-shrink: 0;
  }

  .footer-nav-link {
    font-family:    var(--font-display);
    font-size:      var(--ts-nav-link-size, 24px);
    font-weight:    var(--ts-nav-link-weight, 500);
    line-height:    var(--ts-nav-link-line-height, 26px);
    letter-spacing: var(--ts-nav-link-letter-spacing, 0em);
    color:          var(--color-link-default, #fafafa);
    text-decoration: none;
    opacity: 0.78;
    display: inline-block;
    transition:
      color       var(--dur-fast, 220ms) var(--ease-nav, cubic-bezier(0.2, 1, 0.3, 1)),
      opacity     var(--dur-fast, 220ms) ease,
      text-shadow var(--dur-mid,  360ms) ease;
  }

  .footer-nav-link:hover {
    color: var(--color-content-accent, #bdff5d);
    opacity: 1;
    text-shadow: var(--glow-accent, 0 0 16px rgba(189, 255, 93, 0.32));
  }

  .footer-nav-link--active {
    color:      var(--color-link-selected, #bdff5d);
    opacity:    1;
    font-weight: 700;
  }

  /* ── Bottom bar ──────────────────────────────────────────────────── */
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-top: var(--spacing-5, 24px);
  }

  .footer-copy,
  .footer-place {
    font-family: var(--font-display);
    font-size:   var(--ts-volunteer-location-size, 16px);
    font-weight: var(--ts-volunteer-location-weight, 500);
    line-height: var(--ts-volunteer-location-line-height, 19.2px);
    color: rgba(250, 250, 250, 0.45);
  }

  /* ── Tablet (768px – 1023px) ────────────────────────────────────── */
  @media (min-width: 600px) and (max-width: 1023px) {
    .footer-inner {
      padding: var(--spacing-6) var(--spacing-8) var(--spacing-5); /* 32px 48px 24px */
    }
    .hero-outline {
      padding-left: clamp(16px, calc(100px / max(var(--page-zoom, 1), 0.65)), 140px);
    }
    .footer-nav-link { font-size: 20px; }
  }

  /* ── Mobile (≤ 599px) ────────────────────────────────────────────── */
  @media (max-width: 599px) {
    /* Glow: spread across full width on stacked layout */
    .footer-glow {
      mask-image:         linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,1) 100%);
      -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,1) 100%);
    }

    .footer-inner {
      padding: var(--spacing-5) var(--spacing-5) var(--spacing-4); /* 24px 24px 16px */
    }

    .footer-mid {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-6); /* 32px */
    }

    .footer-nav {
      align-items: flex-start;
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-4); /* 16px */
    }

    .footer-nav-link {
      font-size: 18px;
      line-height: 1.4;
    }

    .hero-outline { padding-left: 16px; }

    .footer-bottom { padding-top: var(--spacing-4); /* 16px */ }

    .footer-copy,
    .footer-place  { font-size: 13px; }
  }

  /* ── Reduced motion ──────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .footer-glow       { animation: none; opacity: 0.85; }
    .footer-nav-link   { transition: none; transform: none; }
  }
</style>
