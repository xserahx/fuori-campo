<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';

  let { params }: { params?: { slug?: string } } = $props();

  let title = $state('CATEGORY');
  let fromCarousel = $state(false);
  let heroEl: HTMLElement | null = null;

  onMount(() => {
    const p = get(page);
    fromCarousel = p.url.searchParams.get('from') === 'carousel';
    title = (params?.slug ?? 'category').replace(/-/g, ' ').toUpperCase();

    // If we came from the carousel, animate the hero title down into place
    if (fromCarousel && heroEl) {
      heroEl.classList.add('enter');
      // allow style to apply then animate to final position
      requestAnimationFrame(() => requestAnimationFrame(() => {
        heroEl?.classList.add('to');
      }));
      // cleanup after animation
      const onEnd = () => { heroEl?.classList.remove('enter', 'to'); heroEl?.removeEventListener('transitionend', onEnd); };
      heroEl.addEventListener('transitionend', onEnd);
    }
  });
</script>

<svelte:head>
  <title>{title} — Category</title>
</svelte:head>

<section class="category-page">
  <div class="hero" bind:this={heroEl} class:enter={false} class:to={false}>
    <h1 class="hero-title">{title}</h1>
  </div>

  <main class="container">
    <p class="lead">Dettagli sulla categoria "{title}" non disponibili al momento.</p>
    <p class="hint">(Navigated from carousel: {fromCarousel ? 'yes' : 'no'})</p>
  </main>
</section>

<style>
  .category-page{min-height:100vh;background:var(--color-background-primary);color:var(--color-content-body)}
  .hero{height:36vh;display:flex;align-items:center;justify-content:flex-start;padding-left:var(--spacing-11);box-sizing:border-box}
  .hero-title{font-family:var(--font-display);font-size:64px;line-height:1;text-transform:uppercase;color:var(--color-content-title);margin:0}

  /* entry animation: start high (enter), then transition to natural position (to) */
  .hero.enter{transform: translateY(-28vh);} /* referenced via class directive */
  .hero.enter.to{transition: transform 420ms cubic-bezier(0.22,1,0.36,1); transform: translateY(0);} /* referenced dynamically */

  .container{padding:40px var(--spacing-11)}
  .lead{font-size:20px;color:var(--color-content-body)}
  .hint{margin-top:12px;color:rgba(250,250,250,0.6);font-size:14px}
</style>
