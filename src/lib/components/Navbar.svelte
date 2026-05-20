<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { imgNavbar, imgStatusDefault } from '$lib/design/assets';

  let { transparent = false } = $props<{ transparent?: boolean }>();

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

  function navLinkAction(node: HTMLAnchorElement, index: number) {
    navLinkRefs[index] = node;

    return {
      destroy() {
        if (navLinkRefs[index] === node) navLinkRefs[index] = undefined;
      }
    };
  }

  function resolveNavIndex(currentPathname: string) {
    const foundIndex = navItems.findIndex(
      (item) => currentPathname === item.href || currentPathname.startsWith(`${item.href}/`)
    );

    return foundIndex >= 0 ? foundIndex : 0;
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

  function setHover(index: number) {
    underlineInitialized = true;
    hoveredNavIndex = index;
    underlineVisible = true;
    syncUnderline(index);
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

  onMount(async () => {
    const handleResize = () => {
      if (underlineInitialized) syncActiveUnderline();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<header class:navbar--transparent={transparent} class="navbar" aria-label="Main navigation">
  {#if !transparent}
    <img class="navbar-bg" src={imgNavbar} alt="" aria-hidden="true" />
  {/if}
  <div class="navbar-inner">
    <a class="logo" href="/" aria-label="Fuori campo home">
      <img src={imgStatusDefault} alt="" />
    </a>

    <nav class="nav-links" bind:this={navContainer} onmouseleave={clearHover}>
      {#each navItems as item, index}
        <a
          class="nav-link"
          class:is-active={index === activeNavIndex}
          href={item.href}
          use:navLinkAction={index}
          onmouseenter={() => setHover(index)}
          onfocus={() => setHover(index)}
          onclick={() => setHover(index)}
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
  </div>
</header>
