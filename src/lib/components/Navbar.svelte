<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let { transparent = false, pinned = false, inverted = false } = $props<{ transparent?: boolean; pinned?: boolean; inverted?: boolean }>();
  const logoColor = $derived(inverted ? '#0e0e0e' : '#BDFF5D');

  type NavItem = {
    href: string;
    label: string;
  };

  const navItems: NavItem[] = [
    { href: '/gallery', label: 'GALLERIA' },
    { href: '/category', label: 'CATEGORIE' },
    { href: '/about', label: 'ABOUT' }
  ];

  let navContainer: HTMLElement | null = null;
  let navLinkRefs: Array<HTMLAnchorElement | undefined> = [];
  const activeNavIndex = $derived(resolveNavIndex(page.url.pathname));
  let underlineLeft = $state(0);
  let underlineWidth = $state(0);
  let underlineVisible = $state(false);
  let underlineInitialized = $state(false);
  let hoveredNavIndex = $state(-1);
  const isHomePage = $derived(page.url.pathname === '/');

  // NAVBAR VISIBILITY STATE
  let visible = $state(true);
  let lastScrollY = 0;

  // MOBILE MENU STATE
  let menuOpen = $state(false);

  function toggleMenu() {
    menuOpen = !menuOpen;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    document.body.style.overflow = '';
  }

  function navLinkAction(node: HTMLAnchorElement, index: number) {
    navLinkRefs[index] = node;

    return {
      destroy() {
        if (navLinkRefs[index] === node) navLinkRefs[index] = undefined;
      }
    };
  }

  function resolveNavIndex(currentPathname: string) {
    if (!currentPathname || currentPathname === '/') return -1;

    const foundIndex = navItems.findIndex(
      (item) => currentPathname === item.href || currentPathname.startsWith(`${item.href}/`)
    );

    return foundIndex >= 0 ? foundIndex : -1;
  }

  function syncUnderline(index: number) {
    const link = navLinkRefs[index];
    if (!link || !navContainer) return;

    const linkRect = link.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();

    underlineLeft = linkRect.left - containerRect.left;
    underlineWidth = linkRect.width;
  }

  function syncActiveUnderline() {
    const targetIndex = hoveredNavIndex >= 0 ? hoveredNavIndex : activeNavIndex;
    syncUnderline(targetIndex);
    if (underlineInitialized) underlineVisible = true;
  }

  function clearHover() {
    hoveredNavIndex = -1;
    if (underlineInitialized) {
      underlineVisible = true;
      syncActiveUnderline();
    } else {
      underlineVisible = false;
    }
  }

  $effect(() => {
    activeNavIndex;
    hoveredNavIndex;
    navContainer;
    if (underlineInitialized) syncActiveUnderline();
  });

  $effect(() => {
    if (pinned) visible = true;
  });

  // Close mobile menu on route change
  $effect(() => {
    page.url.pathname;
    closeMenu();
  });

  // Update browser title to match active nav section (client-only)
  $effect(() => {
    activeNavIndex;
    if (typeof document === 'undefined') return;
    try {
      if (activeNavIndex >= 0 && navItems[activeNavIndex]) {
        const label = String(navItems[activeNavIndex].label).toUpperCase();
        document.title = `${label} — Fuori Campo`;
      } else {
        document.title = 'Fuori Campo';
      }
    } catch (e) {
      // ignore in environments where document isn't writable
    }
  });

  onMount(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeydown);

    if (pinned) {
      visible = true;
      return () => window.removeEventListener('keydown', onKeydown);
    }

    const isInHeroViewport = () => {
      if (!isHomePage) return false;
      return window.scrollY < window.innerHeight * 0.92;
    };

    const handleResize = () => {
      if (underlineInitialized) syncActiveUnderline();
      if (window.innerWidth > 599) closeMenu();
    };

    const handleScroll = () => {
      if (isHomePage) {
        if (isInHeroViewport()) {
          visible = true;
          underlineVisible = true;
        } else {
          const currentScrollY = window.scrollY;
          const scrollDelta = currentScrollY - lastScrollY;

          if (scrollDelta > 8) {
            visible = false;
            underlineVisible = false;
          } else if (scrollDelta < -8) {
            visible = true;
            underlineVisible = true;
          }
        }
      }

      lastScrollY = window.scrollY;
    };

    // POINTER-BASED REVEAL (REFERENCE BEHAVIOR)
    let lastPointerY = 0;
    let sawPointer = false;

    const pointerMove = (e: PointerEvent) => {
      if (pinned) return;

      if (e.pointerType === 'touch') return;

      if (!sawPointer) {
        lastPointerY = e.clientY;
        sawPointer = true;
        return;
      }

      const movingUp = e.clientY < lastPointerY || e.movementY < 0;
      const nearTop = e.clientY <= 80;

      if (nearTop && movingUp && (!isHomePage || !isInHeroViewport())) {
        visible = true;
        underlineVisible = true;
      }

      lastPointerY = e.clientY;
    };

    // HIDE ON SCROLL DOWN
    const onWheel = (ev: WheelEvent) => {
      if (pinned) return;
      if (isInHeroViewport()) {
        visible = true;
        underlineVisible = true;
        return;
      }

      if (ev.deltaY < 0) {
        visible = true;
        underlineVisible = true;
      } else if (ev.deltaY > 0) {
        visible = false;
        underlineVisible = false;
      }
    };

    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('wheel', onWheel);
    };
  });
</script>

{#if menuOpen}
<div class="nav-mobile-overlay" id="nav-mobile-overlay" role="dialog" aria-modal="true" aria-label="Menu di navigazione">
  <div class="overlay-header">
    <a class="logo" href="/" onclick={closeMenu} aria-label="Fuori campo home">
      <svg width="35" height="77" viewBox="0 0 36 49" fill="none" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <mask id="path-1-outside-overlay" maskUnits="userSpaceOnUse" x="-0.728027" y="-0.199951" width="37" height="49" fill="black">
          <rect fill="white" x="-0.728027" y="-0.199951" width="37" height="49"/>
          <path d="M2.57597 46.8C2.22397 46.8 1.99997 46.608 1.99997 46.192L2.28797 24.368L1.99997 2.57605C1.99997 2.19205 2.22397 2.00005 2.57597 2.00005H33.296C33.648 2.00005 33.872 2.22405 33.872 2.57605V9.96805C33.872 10.352 33.648 10.576 33.296 10.576H14.064L13.872 20.976H32.464C32.816 20.976 33.04 21.2 33.04 21.552V28.944C33.04 29.328 32.816 29.552 32.464 29.552H13.872L14.064 46.192C14.064 46.608 13.84 46.8 13.456 46.8H2.57597Z"/>
        </mask>
        <path d="M1.99997 46.192L0.000146836 46.1657L-2.72989e-05 46.1789V46.192H1.99997ZM2.28797 24.368L4.2878 24.3944L4.28815 24.368L4.2878 24.3416L2.28797 24.368ZM1.99997 2.57605H-2.72989e-05V2.58926L0.000147343 2.60247L1.99997 2.57605ZM14.064 10.576V8.57605H12.1006L12.0643 10.5391L14.064 10.576ZM13.872 20.976L11.8723 20.9391L11.8347 22.976H13.872V20.976ZM13.872 29.552V27.552H11.8488L11.8721 29.5751L13.872 29.552ZM14.064 46.192H16.064V46.1805L16.0638 46.169L14.064 46.192ZM2.57597 46.8V44.8C2.75059 44.8 3.18467 44.8523 3.57019 45.2378C3.95744 45.6251 3.99997 46.0527 3.99997 46.192H1.99997H-2.72989e-05C-2.72989e-05 46.7474 0.15451 47.479 0.741759 48.0663C1.32727 48.6518 2.04935 48.8 2.57597 48.8V46.8ZM1.99997 46.192L3.9998 46.2184L4.2878 24.3944L2.28797 24.368L0.288147 24.3417L0.000146836 46.1657L1.99997 46.192ZM2.28797 24.368L4.2878 24.3416L3.9998 2.54962L1.99997 2.57605L0.000147343 2.60247L0.288147 24.3945L2.28797 24.368ZM1.99997 2.57605H3.99997C3.99997 2.77451 3.93271 3.21082 3.54104 3.58682C3.1635 3.94925 2.7495 4.00005 2.57597 4.00005V2.00005V4.57764e-05C2.05045 4.57764e-05 1.34844 0.146839 0.770908 0.701271C0.179238 1.26928 -2.72989e-05 1.99359 -2.72989e-05 2.57605H1.99997ZM2.57597 2.00005V4.00005H33.296V2.00005V4.57764e-05H2.57597V2.00005ZM33.296 2.00005V4.00005C33.041 4.00005 32.6418 3.91027 32.3018 3.57026C31.9617 3.23024 31.872 2.83098 31.872 2.57605H33.872H35.872C35.872 1.96911 35.6702 1.28185 35.1302 0.741837C34.5902 0.20182 33.9029 4.57764e-05 33.296 4.57764e-05V2.00005ZM33.872 2.57605H31.872V9.96805H33.872H35.872V2.57605H33.872ZM33.872 9.96805H31.872C31.872 9.77418 31.9345 9.38319 32.2743 9.02983C32.622 8.66821 33.039 8.57605 33.296 8.57605V10.576V12.576C33.9049 12.576 34.6099 12.3719 35.1576 11.8023C35.6974 11.2409 35.872 10.5459 35.872 9.96805H33.872ZM33.296 10.576V8.57605H14.064V10.576V12.576H33.296V10.576ZM14.064 10.576L12.0643 10.5391L11.8723 20.9391L13.872 20.976L15.8716 21.013L16.0636 10.613L14.064 10.576ZM13.872 20.976V22.976H32.464V20.976V18.976H13.872V20.976ZM32.464 20.976V22.976C32.209 22.976 31.8098 22.8863 31.4698 22.5463C31.1297 22.2062 31.04 21.807 31.04 21.552H33.04H35.04C35.04 20.9451 34.8382 20.2579 34.2982 19.7178C33.7582 19.1778 33.0709 18.976 32.464 18.976V20.976ZM33.04 21.552H31.04V28.944H33.04H35.04V21.552H33.04ZM33.04 28.944H31.04C31.04 28.7502 31.1025 28.3592 31.4423 28.0058C31.79 27.6442 32.207 27.552 32.464 27.552V29.552V31.552C33.0729 31.552 33.7779 31.3479 34.3256 30.7783C34.8654 30.2169 35.04 29.5219 35.04 28.944H33.04ZM32.464 29.552V27.552H13.872V29.552V31.552H32.464V29.552ZM13.872 29.552L11.8721 29.5751L12.0641 46.2151L14.064 46.192L16.0638 46.169L15.8718 29.529L13.872 29.552ZM14.064 46.192H12.064C12.064 46.0527 12.1074 45.6049 12.5178 45.2104C12.9138 44.8296 13.3401 44.8 13.456 44.8V46.8V48.8C13.9558 48.8 14.6862 48.6745 15.2902 48.0937C15.9085 47.4992 16.064 46.7474 16.064 46.192H14.064ZM13.456 46.8V44.8H2.57597V46.8V48.8H13.456V46.8Z" fill="#0e0e0e" mask="url(#path-1-outside-overlay)"/>
      </svg>
    </a>
    <button class="overlay-close" onclick={closeMenu} aria-label="Chiudi menu">
      <span class="close-bar"></span>
      <span class="close-bar"></span>
    </button>
  </div>

  <nav class="nav-mobile-nav">
    {#each navItems as item, index}
      <a
        class="mobile-nav-link"
        class:is-active={index === activeNavIndex}
        href={item.href}
        onclick={closeMenu}
        style="--i:{index}"
      >
        {item.label}
      </a>
    {/each}
  </nav>
</div>
{/if}

<header
  class="navbar"
  class:navbar--transparent={transparent}
  class:navbar--inverted={inverted}
  class:visible
  class:hidden={!visible}
  aria-label="Main navigation"
>
  {#if !transparent && !inverted}
    <img class="navbar-bg" src="/volunteer_images/ui/imgNavbar.png" alt="" aria-hidden="true" />
  {/if}

  <div class="navbar-inner">
    <a class="logo" href="/" aria-label="Fuori campo home">
      <svg width="35" height="77" viewBox="0 0 36 49" fill="none" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <mask id="path-1-outside-1_3960_5180" maskUnits="userSpaceOnUse" x="-0.728027" y="-0.199951" width="37" height="49" fill="black">
          <rect fill="white" x="-0.728027" y="-0.199951" width="37" height="49"/>
          <path d="M2.57597 46.8C2.22397 46.8 1.99997 46.608 1.99997 46.192L2.28797 24.368L1.99997 2.57605C1.99997 2.19205 2.22397 2.00005 2.57597 2.00005H33.296C33.648 2.00005 33.872 2.22405 33.872 2.57605V9.96805C33.872 10.352 33.648 10.576 33.296 10.576H14.064L13.872 20.976H32.464C32.816 20.976 33.04 21.2 33.04 21.552V28.944C33.04 29.328 32.816 29.552 32.464 29.552H13.872L14.064 46.192C14.064 46.608 13.84 46.8 13.456 46.8H2.57597Z"/>
        </mask>
        <path d="M1.99997 46.192L0.000146836 46.1657L-2.72989e-05 46.1789V46.192H1.99997ZM2.28797 24.368L4.2878 24.3944L4.28815 24.368L4.2878 24.3416L2.28797 24.368ZM1.99997 2.57605H-2.72989e-05V2.58926L0.000147343 2.60247L1.99997 2.57605ZM14.064 10.576V8.57605H12.1006L12.0643 10.5391L14.064 10.576ZM13.872 20.976L11.8723 20.9391L11.8347 22.976H13.872V20.976ZM13.872 29.552V27.552H11.8488L11.8721 29.5751L13.872 29.552ZM14.064 46.192H16.064V46.1805L16.0638 46.169L14.064 46.192ZM2.57597 46.8V44.8C2.75059 44.8 3.18467 44.8523 3.57019 45.2378C3.95744 45.6251 3.99997 46.0527 3.99997 46.192H1.99997H-2.72989e-05C-2.72989e-05 46.7474 0.15451 47.479 0.741759 48.0663C1.32727 48.6518 2.04935 48.8 2.57597 48.8V46.8ZM1.99997 46.192L3.9998 46.2184L4.2878 24.3944L2.28797 24.368L0.288147 24.3417L0.000146836 46.1657L1.99997 46.192ZM2.28797 24.368L4.2878 24.3416L3.9998 2.54962L1.99997 2.57605L0.000147343 2.60247L0.288147 24.3945L2.28797 24.368ZM1.99997 2.57605H3.99997C3.99997 2.77451 3.93271 3.21082 3.54104 3.58682C3.1635 3.94925 2.7495 4.00005 2.57597 4.00005V2.00005V4.57764e-05C2.05045 4.57764e-05 1.34844 0.146839 0.770908 0.701271C0.179238 1.26928 -2.72989e-05 1.99359 -2.72989e-05 2.57605H1.99997ZM2.57597 2.00005V4.00005H33.296V2.00005V4.57764e-05H2.57597V2.00005ZM33.296 2.00005V4.00005C33.041 4.00005 32.6418 3.91027 32.3018 3.57026C31.9617 3.23024 31.872 2.83098 31.872 2.57605H33.872H35.872C35.872 1.96911 35.6702 1.28185 35.1302 0.741837C34.5902 0.20182 33.9029 4.57764e-05 33.296 4.57764e-05V2.00005ZM33.872 2.57605H31.872V9.96805H33.872H35.872V2.57605H33.872ZM33.872 9.96805H31.872C31.872 9.77418 31.9345 9.38319 32.2743 9.02983C32.622 8.66821 33.039 8.57605 33.296 8.57605V10.576V12.576C33.9049 12.576 34.6099 12.3719 35.1576 11.8023C35.6974 11.2409 35.872 10.5459 35.872 9.96805H33.872ZM33.296 10.576V8.57605H14.064V10.576V12.576H33.296V10.576ZM14.064 10.576L12.0643 10.5391L11.8723 20.9391L13.872 20.976L15.8716 21.013L16.0636 10.613L14.064 10.576ZM13.872 20.976V22.976H32.464V20.976V18.976H13.872V20.976ZM32.464 20.976V22.976C32.209 22.976 31.8098 22.8863 31.4698 22.5463C31.1297 22.2062 31.04 21.807 31.04 21.552H33.04H35.04C35.04 20.9451 34.8382 20.2579 34.2982 19.7178C33.7582 19.1778 33.0709 18.976 32.464 18.976V20.976ZM33.04 21.552H31.04V28.944H33.04H35.04V21.552H33.04ZM33.04 28.944H31.04C31.04 28.7502 31.1025 28.3592 31.4423 28.0058C31.79 27.6442 32.207 27.552 32.464 27.552V29.552V31.552C33.0729 31.552 33.7779 31.3479 34.3256 30.7783C34.8654 30.2169 35.04 29.5219 35.04 28.944H33.04ZM32.464 29.552V27.552H13.872V29.552V31.552H32.464V29.552ZM13.872 29.552L11.8721 29.5751L12.0641 46.2151L14.064 46.192L16.0638 46.169L15.8718 29.529L13.872 29.552ZM14.064 46.192H12.064C12.064 46.0527 12.1074 45.6049 12.5178 45.2104C12.9138 44.8296 13.3401 44.8 13.456 44.8V46.8V48.8C13.9558 48.8 14.6862 48.6745 15.2902 48.0937C15.9085 47.4992 16.064 46.7474 16.064 46.192H14.064ZM13.456 46.8V44.8H2.57597V46.8V48.8H13.456V46.8Z" fill={logoColor} mask="url(#path-1-outside-1_3960_5180)"/>
      </svg>
    </a>

    <nav class="nav-links" aria-label="Navigazione principale" bind:this={navContainer} onmouseleave={clearHover}>
      {#each navItems as item, index}
        <a
          class="nav-link"
          class:is-active={index === activeNavIndex}
          href={item.href}
          use:navLinkAction={index}
        >
          {item.label}
        </a>
      {/each}

      <span
        class="nav-underline"
        class:visible={underlineVisible}
        style={`left: ${underlineLeft}px; width: ${underlineWidth}px;`}
        aria-hidden="true"
      ></span>
    </nav>

    <!-- Hamburger button — visible only on mobile via CSS -->
    <button
      class="nav-burger"
      aria-label="Apri menu"
      aria-controls="nav-mobile-overlay"
      onclick={toggleMenu}
    >
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
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-left: auto;
    flex-shrink: 0;
    color: rgba(250, 250, 250, 0.9);
    -webkit-tap-highlight-color: transparent;
    transition: opacity var(--dur-fast, 220ms) ease, transform var(--dur-mid, 360ms) var(--ease-spring, cubic-bezier(0.22, 1, 0.36, 1));
  }

  .nav-burger:hover  { opacity: 0.72; }
  .nav-burger:active { transform: scale(0.96); transition-duration: var(--dur-instant, 140ms), var(--dur-instant, 140ms); }

  /* Dark variant for inverted navbar (e.g. About page) */
  :global(.navbar--inverted) .nav-burger { color: #0e0e0e; }

  /* ── Mobile full-screen overlay ─────────────────────────────────── */
  .nav-mobile-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--color-content-accent, #bdff5d);
    display: flex;
    flex-direction: column;
    padding: 0 27px 64px;
    animation: overlay-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Overlay header row (logo + close) ──────────────────────────── */
  .overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 96px;
    flex-shrink: 0;
  }

  .overlay-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    position: relative;
    -webkit-tap-highlight-color: transparent;
    transition: opacity var(--dur-fast, 220ms) ease, transform var(--dur-mid, 360ms) var(--ease-spring, cubic-bezier(0.22, 1, 0.36, 1));
  }

  .overlay-close:hover  { opacity: 0.72; }
  .overlay-close:active { transform: scale(0.96); transition-duration: var(--dur-instant, 140ms), var(--dur-instant, 140ms); }

  .close-bar {
    position: absolute;
    width: 24px;
    height: 2px;
    background: #0e0e0e;
    border-radius: 2px;
  }

  .close-bar:nth-child(1) { transform: rotate(45deg); }
  .close-bar:nth-child(2) { transform: rotate(-45deg); }

  /* ── Nav links ───────────────────────────────────────────────────── */
  .nav-mobile-nav {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    flex: 1;
    justify-content: center;
  }

  .mobile-nav-link {
    display: block;
    color: rgba(14, 14, 14, 0.45);
    font-family: var(--font-display);
    font-size: 52px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    text-decoration: none;
    padding: 6px 0;
    opacity: 0;
    animation: link-in 420ms cubic-bezier(0.16, 1, 0.3, 1) calc(60ms + var(--i, 0) * 70ms) forwards;
    transition: color 140ms ease, opacity 140ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-nav-link.is-active {
    color: #0e0e0e;
  }

  .mobile-nav-link:active {
    opacity: 0.5;
  }

  @keyframes link-in {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Show burger on mobile only ─────────────────────────────────── */
  @media (max-width: 599px) {
    .nav-burger { display: flex; }
  }

</style>
