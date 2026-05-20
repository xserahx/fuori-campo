<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<Navbar />

<main class="gallery-page">
  <section class="toggle" aria-label="Gallery view toggle">
    <div class="toggle-track" aria-hidden="true"></div>
    <div class="toggle-selected" aria-hidden="true"></div>
    <span class="toggle-label toggle-label--photos">PHOTOS</span>
    <span class="toggle-label toggle-label--names">NAMES</span>
  </section>
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  .gallery-page {
    width: 100%;
    height: 100vh;
    background: var(--color-background-primary);
    position: relative;
    overflow: hidden;
  }

  .toggle {
    position: absolute;
    left: 54px;
    bottom: 24px;
    width: 180px;
    height: 35px;
  }

  .toggle-track,
  .toggle-selected {
    position: absolute;
    inset: 0;
    border-radius: 53.5px;
  }

  .toggle-track {
    background: var(--color-background-primary);
  }

  .toggle-selected {
    left: 4px;
    top: 4px;
    width: 89px;
    height: 27px;
    background: var(--color-link-selected);
  }

  .toggle-label {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1;
    white-space: nowrap;
  }

  .toggle-label--photos {
    left: 20px;
    color: var(--color-content-primary);
  }

  .toggle-label--names {
    right: 18px;
    color: var(--color-content-body);
  }
</style>
