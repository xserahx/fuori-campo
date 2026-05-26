<script lang="ts">
  import { onMount } from "svelte";
  import "../lib/styles/tokens.css";
  import BlurTitle from "../lib/components/BlurTitle.svelte";
  import ScrollArrow from "../lib/components/ScrollArrow.svelte";
  import { blurReveal } from "../lib/actions/blurReveal";
  import { imgNavbar, imgStatusDefault, galleryImages } from "../lib/design/assets";
  import IntroLoader from "../lib/components/IntroLoader.svelte";

  let showIntro = $state(true);
  let introExiting = $state(false);
  let loaderProgress = $state(0);
  let navbarVisible = $state(true);
  let navbarFixed = $state(true);
  let activeNavIndex = $state(0);
  let underlineLeft = $state(0);
  let underlineWidth = $state(0);
  let underlineVisible = $state(false);

  const volunteers = ["/volontari/1.jpg", "/volontari/2.jpg", "/volontari/3.jpg"];
  const navItems = [
    { href: "/gallery", label: "GALLERIA" },
    { href: "/category", label: "CATEGORIE" },
    { href: "/about", label: "ABOUT" }
  ];

  let loaderPhotoSrc = $state(volunteers[0]);
  let activeLoaderSet = $state(0);

  const loaderBlockLayouts = [
    [
      { left: 0, top: 0, width: 50, height: 50 },
      { left: 50, top: 0, width: 50, height: 50 },
      { left: 0, top: 50, width: 50, height: 50 },
      { left: 50, top: 50, width: 50, height: 50 }
    ],
    [
      { left: 0, top: 0, width: 100, height: 50 },
      { left: 0, top: 50, width: 100, height: 50 }
    ]
  ];

  let interval: ReturnType<typeof setInterval> | undefined;
  let exitTimeout: ReturnType<typeof setTimeout> | undefined;
  let heroSection: HTMLElement | null = null;
  let lastScrollY = 0;
  let lastPointerY = 0;
  let sawPointer = false;
  let navContainer: HTMLElement | null = null;
  let navLinkRefs: Array<HTMLAnchorElement | undefined> = [];

  function navLinkAction(node: HTMLAnchorElement, index: number) {
    navLinkRefs[index] = node;

    return {
      destroy() {
        if (navLinkRefs[index] === node) navLinkRefs[index] = undefined;
      }
    };
  }

  function resolveNavIndex() {
    const pathname = window.location.pathname;
    const foundIndex = navItems.findIndex(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

    return foundIndex >= 0 ? foundIndex : 0;
  }

  function syncUnderline(index: number) {
    const link = navLinkRefs[index];
    if (!link || !navContainer) return;

    const linkRect = link.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();

    activeNavIndex = index;
    underlineLeft = linkRect.left - containerRect.left;
    underlineWidth = linkRect.width;
    underlineVisible = navbarVisible;
  }

  function setNavSelection(index: number) {
    syncUnderline(index);
  }

  function resetNavSelection() {
    syncUnderline(routeNavIndex);
  }

  let routeNavIndex = 0;

  onMount(() => {
    interval = setInterval(() => {
      loaderProgress += 2;

      if (loaderProgress % 20 === 0) {
        activeLoaderSet = (activeLoaderSet + 1) % loaderBlockLayouts.length;
        loaderPhotoSrc = volunteers[Math.floor(Math.random() * volunteers.length)];
      }

      if (loaderProgress >= 100) {
        introExiting = true;
        exitTimeout = setTimeout(() => {
          showIntro = false;
        }, 600);

        if (interval) clearInterval(interval);
      }
    }, 60);

    return () => {
      if (interval) clearInterval(interval);
      if (exitTimeout) clearTimeout(exitTimeout);
    };
  });

  onMount(() => {
    const updateNavbarState = () => {
      if (!heroSection) {
        navbarVisible = true;
        navbarFixed = true;
        underlineVisible = true;
        return;
      }

      const rect = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 && rect.bottom > window.innerHeight * 0.45;

      navbarVisible = inHero;
      navbarFixed = inHero;
      underlineVisible = inHero;
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        const inHero = rect.top < window.innerHeight * 0.15 && rect.bottom > window.innerHeight * 0.45;

        if (inHero) {
          navbarVisible = true;
          navbarFixed = true;
          underlineVisible = true;
        } else if (currentScrollY <= 20) {
          navbarVisible = false;
          navbarFixed = true;
          underlineVisible = false;
        } else if (scrollDelta > 8) {
          navbarVisible = false;
          underlineVisible = false;
        } else if (scrollDelta < -8) {
          navbarVisible = true;
          underlineVisible = true;
        }
      }

      lastScrollY = currentScrollY;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      if (!sawPointer) {
        lastPointerY = event.clientY;
        sawPointer = true;
        return;
      }

      const movingUp = event.clientY < lastPointerY || event.movementY < 0;
      const nearTopEdge = event.clientY <= 180;

      if (!heroSection) return;

      const rect = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 && rect.bottom > window.innerHeight * 0.45;

      if (!inHero && movingUp && nearTopEdge) {
        navbarVisible = true;
        underlineVisible = true;
      }

      lastPointerY = event.clientY;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!heroSection || event.deltaY >= 0 || window.scrollY <= 20) return;

      const rect = heroSection.getBoundingClientRect();
      const inHero = rect.top < window.innerHeight * 0.15 && rect.bottom > window.innerHeight * 0.45;

      if (!inHero) {
        navbarVisible = true;
        underlineVisible = true;
      }
    };

    window.addEventListener("scroll", updateNavbarState, { passive: true });
    window.addEventListener("resize", updateNavbarState, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    routeNavIndex = resolveNavIndex();
    activeNavIndex = routeNavIndex;

    updateNavbarState();
    handleScroll();

    requestAnimationFrame(() => syncUnderline(activeNavIndex));

    return () => {
      window.removeEventListener("scroll", updateNavbarState);
      window.removeEventListener("resize", updateNavbarState);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("wheel", handleWheel);
    };
  });

  const galleryCount = 12;
  const offsetCount = 6;
</script>

<IntroLoader
  {showIntro}
  {introExiting}
  {loaderPhotoSrc}
  {loaderBlockLayouts}
  {activeLoaderSet}
  {loaderProgress}
/>

<div class="site">
  <main class="landing">
    <section class="hero-outer" bind:this={heroSection}>
      <div class="hero-inner">
        <BlurTitle />
      </div>
    </section>

    <section class="story story--left story--intro"
      use:blurReveal={{ direction: "left", variant: "slide", blur: 24 }}>
      <p class="lead-paragraph">
        <span class="accent">Milano Cortina 2026</span> ha coinvolto migliaia di volontari:
      </p>
    </section>

    <section class="story story--right story--numbers"
      use:blurReveal={{ direction: "right", variant: "skew", blur: 28 }}>
      <p>
        <span class="accent">18.000</span> alle Olimpiadi e <span class="accent">4.600</span> alle Paralimpiadi.
      </p>
    </section>

    <!-- QUOTE 1 -->
    <section class="story story--quote story--quote-left"use:blurReveal={{ direction: "left", variant: "clip", blur: 20, threshold: 0.4 }}>
      <p class="quote">
      Mentre le telecamere erano puntate sulle gare, i volontari sono rimasti ai margini.
     </p>
    </section>

    <!-- QUOTE 2 -->
    <section class="story story--quote story--quote-right"use:blurReveal={{ direction: "right", variant: "clip", blur: 20, threshold: 0.4, delay: 150 }}>
      <p class="quote">
      Nella narrazione ufficiale erano spesso dati per scontati.
      </p>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-1)`} use:blurReveal={{ direction: "left", variant: "letterspace", blur: 30, duration: 1100 }}>
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
      use:blurReveal={{ direction: "right", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">PERCHÈ </span>
          <span class="accent">HANNO DECISO</span><br />
          <span class="accent">DI CANDIDARSI?</span>
        </div>
      </h2>
    </section>

    <section class="question question--left" style={`margin-left:var(--question-left-3)`}
      use:blurReveal={{ direction: "left", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="ghost">COSA FACEVANO </span><br />
          <span class="accent">CONCRETAMENTE?</span>
        </div>
      </h2>
    </section>

    <section class="question question--right" style={`margin-left:var(--question-left-4)`}
      use:blurReveal={{ direction: "right", variant: "letterspace", blur: 30, duration: 1100 }}>
      <h2>
        <div style="display:block; margin-bottom:80px;">
          <span class="accent">NE È VALSA LA PENA?</span><br />
          <span class="ghost">LO RIFAREBBERO?</span>
        </div>
      </h2>
    </section>

    <section class="story story--left story--summary"
      use:blurReveal={{ direction: "left", threshold: 0.3 }}>
      <p>
        Abbiamo chiesto ai volontari di raccontarsi. Le loro testimonianze sono raccolte in questo
        <span class="accent"> archivio</span>.
      </p>
    </section>

    <div class="scroll-cue"
      use:blurReveal={{ direction: "left", threshold: 0.5, blur: 10, translateX: 20, duration: 600 }}>
      <ScrollArrow />
    </div>

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
