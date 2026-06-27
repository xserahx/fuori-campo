<script lang="ts">
  import { page } from '$app/state';

  let { pinned = false, inverted = false } = $props<{ pinned?: boolean; inverted?: boolean }>();

  type NavItem = { href: string; label: string };

  const navItems: NavItem[] = [
    { href: '/gallery',  label: 'GALLERIA' },
    { href: '/category', label: 'CATEGORIE' },
    { href: '/about',    label: 'ABOUT' }
  ];

  /* Index of the nav item matching the current route (-1 on the homepage). */
  const activeIndex = $derived(
    navItems.findIndex(
      ({ href }) => page.url.pathname === href || page.url.pathname.startsWith(`${href}/`)
    )
  );

  let visible = $state(true);   // navbar on screen? (always true while pinned)
  let menuOpen = $state(false); // mobile overlay open?

  function closeMenu() {
    menuOpen = false;
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  /* Browser-tab title tracks the active section. */
  $effect(() => {
    const label = activeIndex >= 0 ? navItems[activeIndex].label : '';
    document.title = label ? `${label} — Fuori Campo` : 'Fuori Campo';
  });

  /* Close the mobile overlay on every route change. */
  $effect(() => {
    page.url.pathname;
    closeMenu();
  });

  /* Visibility + window listeners. Pinned pages stay permanently open and only
     need Escape-to-close; unpinned pages reveal/hide the bar from wheel + pointer
     intent. Re-runs whenever `pinned` flips, so the attached listeners always
     match the current page. */
  $effect(() => {
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKeydown);

    if (pinned) {
      visible = true;
      return () => window.removeEventListener('keydown', onKeydown);
    }

    let lastY = 0;
    let seen = false;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) visible = false;
      else if (e.deltaY < 0) visible = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (!seen) { lastY = e.clientY; seen = true; return; }
      if (e.clientY <= 80 && (e.clientY < lastY || e.movementY < 0)) visible = true;
      lastY = e.clientY;
    };

    const onResize = () => { if (window.innerWidth > 599) closeMenu(); };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
    };
  });
</script>

<!-- Shared "F" logo mark — fill follows the `color` of its .logo ancestor. -->
{#snippet logoMark(maskId: string)}
  <svg width="35" height="77" viewBox="0 0 36 49" fill="none" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <mask id={maskId} maskUnits="userSpaceOnUse" x="-0.728027" y="-0.199951" width="37" height="49" fill="black">
      <rect fill="white" x="-0.728027" y="-0.199951" width="37" height="49"/>
      <path d="M2.57597 46.8C2.22397 46.8 1.99997 46.608 1.99997 46.192L2.28797 24.368L1.99997 2.57605C1.99997 2.19205 2.22397 2.00005 2.57597 2.00005H33.296C33.648 2.00005 33.872 2.22405 33.872 2.57605V9.96805C33.872 10.352 33.648 10.576 33.296 10.576H14.064L13.872 20.976H32.464C32.816 20.976 33.04 21.2 33.04 21.552V28.944C33.04 29.328 32.816 29.552 32.464 29.552H13.872L14.064 46.192C14.064 46.608 13.84 46.8 13.456 46.8H2.57597Z"/>
    </mask>
    <path d="M1.99997 46.192L0.000146836 46.1657L-2.72989e-05 46.1789V46.192H1.99997ZM2.28797 24.368L4.2878 24.3944L4.28815 24.368L4.2878 24.3416L2.28797 24.368ZM1.99997 2.57605H-2.72989e-05V2.58926L0.000147343 2.60247L1.99997 2.57605ZM14.064 10.576V8.57605H12.1006L12.0643 10.5391L14.064 10.576ZM13.872 20.976L11.8723 20.9391L11.8347 22.976H13.872V20.976ZM13.872 29.552V27.552H11.8488L11.8721 29.5751L13.872 29.552ZM14.064 46.192H16.064V46.1805L16.0638 46.169L14.064 46.192ZM2.57597 46.8V44.8C2.75059 44.8 3.18467 44.8523 3.57019 45.2378C3.95744 45.6251 3.99997 46.0527 3.99997 46.192H1.99997H-2.72989e-05C-2.72989e-05 46.7474 0.15451 47.479 0.741759 48.0663C1.32727 48.6518 2.04935 48.8 2.57597 48.8V46.8ZM1.99997 46.192L3.9998 46.2184L4.2878 24.3944L2.28797 24.368L0.288147 24.3417L0.000146836 46.1657L1.99997 46.192ZM2.28797 24.368L4.2878 24.3416L3.9998 2.54962L1.99997 2.57605L0.000147343 2.60247L0.288147 24.3945L2.28797 24.368ZM1.99997 2.57605H3.99997C3.99997 2.77451 3.93271 3.21082 3.54104 3.58682C3.1635 3.94925 2.7495 4.00005 2.57597 4.00005V2.00005V4.57764e-05C2.05045 4.57764e-05 1.34844 0.146839 0.770908 0.701271C0.179238 1.26928 -2.72989e-05 1.99359 -2.72989e-05 2.57605H1.99997ZM2.57597 2.00005V4.00005H33.296V2.00005V4.57764e-05H2.57597V2.00005ZM33.296 2.00005V4.00005C33.041 4.00005 32.6418 3.91027 32.3018 3.57026C31.9617 3.23024 31.872 2.83098 31.872 2.57605H33.872H35.872C35.872 1.96911 35.6702 1.28185 35.1302 0.741837C34.5902 0.20182 33.9029 4.57764e-05 33.296 4.57764e-05V2.00005ZM33.872 2.57605H31.872V9.96805H33.872H35.872V2.57605H33.872ZM33.872 9.96805H31.872C31.872 9.77418 31.9345 9.38319 32.2743 9.02983C32.622 8.66821 33.039 8.57605 33.296 8.57605V10.576V12.576C33.9049 12.576 34.6099 12.3719 35.1576 11.8023C35.6974 11.2409 35.872 10.5459 35.872 9.96805H33.872ZM33.296 10.576V8.57605H14.064V10.576V12.576H33.296V10.576ZM14.064 10.576L12.0643 10.5391L11.8723 20.9391L13.872 20.976L15.8716 21.013L16.0636 10.613L14.064 10.576ZM13.872 20.976V22.976H32.464V20.976V18.976H13.872V20.976ZM32.464 20.976V22.976C32.209 22.976 31.8098 22.8863 31.4698 22.5463C31.1297 22.2062 31.04 21.807 31.04 21.552H33.04H35.04C35.04 20.9451 34.8382 20.2579 34.2982 19.7178C33.7582 19.1778 33.0709 18.976 32.464 18.976V20.976ZM33.04 21.552H31.04V28.944H33.04H35.04V21.552H33.04ZM33.04 28.944H31.04C31.04 28.7502 31.1025 28.3592 31.4423 28.0058C31.79 27.6442 32.207 27.552 32.464 27.552V29.552V31.552C33.0729 31.552 33.7779 31.3479 34.3256 30.7783C34.8654 30.2169 35.04 29.5219 35.04 28.944H33.04ZM32.464 29.552V27.552H13.872V29.552V31.552H32.464V29.552ZM13.872 29.552L11.8721 29.5751L12.0641 46.2151L14.064 46.192L16.0638 46.169L15.8718 29.529L13.872 29.552ZM14.064 46.192H12.064C12.064 46.0527 12.1074 45.6049 12.5178 45.2104C12.9138 44.8296 13.3401 44.8 13.456 44.8V46.8V48.8C13.9558 48.8 14.6862 48.6745 15.2902 48.0937C15.9085 47.4992 16.064 46.7474 16.064 46.192H14.064ZM13.456 46.8V44.8H2.57597V46.8V48.8H13.456V46.8Z" mask="url(#{maskId})"/>
  </svg>
{/snippet}

{#if menuOpen}
  <div class="nav-mobile-overlay" id="nav-mobile-overlay" role="dialog" aria-modal="true" aria-label="Menu di navigazione">
    <div class="overlay-header">
      <a class="logo" href="/" onclick={closeMenu} aria-label="Fuori campo home">
        {@render logoMark('logo-menu')}
      </a>
      <button class="overlay-close" onclick={closeMenu} aria-label="Chiudi menu">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4.5 4.5L25.5 25.5M25.5 4.5L4.5 25.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <nav class="nav-mobile-nav">
      {#each navItems as item, i}
        <a
          class="mobile-nav-link"
          class:is-active={i === activeIndex}
          href={item.href}
          onclick={closeMenu}
          style="--i:{i}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}

<header class="navbar" class:navbar--inverted={inverted} class:hidden={!visible} aria-label="Main navigation">
  <div class="navbar-inner">
    <a class="logo" href="/" aria-label="Fuori campo home">
      {@render logoMark('logo-nav')}
    </a>

    <nav class="nav-links" aria-label="Navigazione principale">
      {#each navItems as item, i}
        <a class="nav-link" class:is-active={i === activeIndex} href={item.href}>{item.label}</a>
      {/each}
    </nav>

    <!-- Hamburger — visible only on mobile via CSS -->
    <button class="nav-burger" aria-label="Apri menu" aria-controls="nav-mobile-overlay" onclick={toggleMenu}>
      <svg width="37" height="21" viewBox="0 0 37 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M34.625 1.54134L2.375 1.54134M34.625 10.4997L2.375 10.4997M34.625 19.458L2.375 19.458" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</header>

<style>
  /* ── Hamburger button — hidden on desktop ──────────────────────── */
  .nav-burger {
    display: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-left: auto;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    color: color-mix(in srgb, var(--color-content-body) 90%, transparent);
    -webkit-tap-highlight-color: transparent;
    transition: transform var(--dur-mid) var(--ease-spring);
  }
  .nav-burger:active { transform: scale(0.96); transition-duration: var(--dur-instant); }
  .navbar--inverted .nav-burger { color: var(--color-content-body-black); }

  /* ── Mobile full-screen overlay ─────────────────────────────────── */
  .nav-mobile-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: 0 27px 64px;
    background: var(--color-content-accent);
    animation: overlay-in 320ms var(--ease-cinema) both;
  }

  @keyframes overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Overlay header (logo + close) ──────────────────────────────── */
  .overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 96px;
    flex-shrink: 0;
  }
  .nav-mobile-overlay .logo { color: var(--color-content-body-black); }

  .overlay-close {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-content-body-black);
    -webkit-tap-highlight-color: transparent;
    transition: opacity var(--dur-fast) ease, transform var(--dur-mid) var(--ease-spring);
  }
  .overlay-close:hover  { opacity: 0.72; }
  .overlay-close:active { transform: scale(0.96); transition-duration: var(--dur-instant), var(--dur-instant); }

  /* ── Mobile nav links ───────────────────────────────────────────── */
  .nav-mobile-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-start;
    padding-top: 56px;
    gap: 32px;
  }

  .mobile-nav-link {
    display: block;
    color: var(--color-content-primary);
    font-family: var(--font-display);
    font-size: 48px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    letter-spacing: 0;
    text-align: center;
    text-transform: uppercase;
    text-decoration: none;
    opacity: 0;
    animation: link-in 420ms var(--ease-cinema) calc(60ms + var(--i, 0) * 70ms) forwards;
    transition: color var(--dur-instant) ease, opacity var(--dur-instant) ease;
    -webkit-tap-highlight-color: transparent;
  }
  .mobile-nav-link.is-active { color: var(--color-background-primary); font-weight: 500; }
  .mobile-nav-link:active    { opacity: 0.5; }

  @keyframes link-in {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Show hamburger on mobile only ──────────────────────────────── */
  @media (max-width: 599px) {
    .nav-burger { display: flex; }
  }
</style>
