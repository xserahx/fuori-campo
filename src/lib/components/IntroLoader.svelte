<script lang="ts">
 
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { getImageUrl, getCachedVolunteers } from '$lib/data/volunteers';

  let {
    showIntro      = true,
    introExiting   = false,
    loaderProgress = 0,
  } = $props<{
    showIntro?: boolean;
    introExiting?: boolean;
    loaderProgress?: number;
  }>();

  const IMAGES = (() => {
    const vols = getCachedVolunteers().filter(
      (v) => v.ha_immagini && ((v.image_paths?.length ?? 0) > 0 || v.image_path)
    );
    const out: string[] = [];
    const step = Math.max(1, Math.floor(vols.length / 16));
    for (let i = 0; out.length < 16 && i < vols.length; i += step) {
      const u = getImageUrl(vols[i].image_paths?.[0] ?? vols[i].image_path);
      if (u) out.push(u);
    }
    return out;
  })();

  const pct = $derived(Math.round(Math.max(0, Math.min(100, loaderProgress))));

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let shellEl  = $state<HTMLElement | null>(null);
  let screenEl = $state<HTMLElement | null>(null);
  let exitStarted = false;

  onMount(() => {
    if (!shellEl) return;
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.timeline()
        .from('.title', { duration: 0.5, opacity: 0, y: 12, stagger: 0.06 })
        .from('.bracket', { duration: 0.3, scale: 0 }, '-=0.1')
        .from('.loader', { duration: 0.25, scale: 0 }, '-=0.1')
        .from('.img-strip img', { duration: 0.8, y: 150, opacity: 0, stagger: { amount: 1 } }, '-=0.1')
        .from('.bottom-line', { duration: 0.5, y: 50, opacity: 0, stagger: 0.1 }, '-=0.5');
    }, shellEl);
    return () => ctx.revert();
  });

  /* Exit — slide the whole screen up, revealing the homepage. */
  $effect(() => {
    if (!introExiting || exitStarted || !shellEl || !screenEl) return;
    exitStarted = true;
    gsap.context(() => {
      const tl = gsap.timeline();
      if (reduced) {
        tl.to(screenEl, { autoAlpha: 0, duration: 0.4 });
        return;
      }
      tl
        // loader content eases away
        .to('.loading-section, .images', { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0)
        // black screen fades out → homepage revealed underneath
        .to(screenEl, { opacity: 0, duration: 0.85, ease: 'power2.inOut' }, 0.4);
    }, shellEl);
  });
</script>

{#if showIntro}
  <div class="intro-loader" bind:this={shellEl}>
    <div class="loading-screen" bind:this={screenEl}>

      <div class="loading-section">
        <h1 class="title-row">
          <span class="title">CTRL</span>
          <span class="bracket">(</span>
          <span class="loader">{pct}%</span>
          <span class="bracket">)</span>
          <span class="title">+ Z</span>
        </h1>
      </div>

      <div class="images">
        <div class="img-strip" aria-hidden="true">
          {#each IMAGES as src}
            <img src={src} alt="" draggable="false" />
          {/each}
          {#each IMAGES as src}
            <img src={src} alt="" draggable="false" />
          {/each}
        </div>
        <div class="bottom-section">
          <span class="bottom-line">Le Olimpiadi degli Invisibili · Milano Cortina 2026</span>
          <span class="bottom-line">2026 ©</span>
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  .intro-loader {
    position: fixed;
    inset: 0;
    z-index: 2000;
    pointer-events: none;
  }

  .loading-screen {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
    color: var(--color-content-body);
  }

  /* ── Centre title: CTRL ( 00% ) +Z ── */
  .loading-section {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .title-row {
    display: flex;
    align-items: center;
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700; /* bold */
    text-transform: uppercase;
    line-height: 1;
  }
  .title,
  .bracket,
  .loader {
    display: block;
    font-size: clamp(26px, 4vw, 56px);
  }
  .title {
    margin: 0 clamp(10px, 1vw, 18px);
    letter-spacing: 0.02em;
    color: var(--color-content-body);
  }
  .bracket {
    margin: 0 clamp(12px, 1.4vw, 26px);
    font-weight: 400;
    color: var(--color-content-accent);
  }
  .loader {
    min-width: 3.4ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-weight: 400; /* counter is not bold */
    color: var(--color-content-accent);
  }

  /* ── Bottom marquee of volunteer photos ── */
  .images {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .img-strip {
    display: flex;
    width: max-content;
    animation: marquee 40s linear infinite;
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); } 
  }
  .img-strip img {
    height: clamp(72px, 9vh, 118px);
    width: auto;
    margin: 10px clamp(10px, 1.4vw, 24px);
    object-fit: cover;
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    user-select: none;
    -webkit-user-drag: none;
  }

  .bottom-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 0 22px;
  }
  .bottom-line {
    display: block;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(250, 250, 250, 0.5);
  }

  @media (prefers-reduced-motion: reduce) {
    .img-strip { animation: none; }
  }
</style>
