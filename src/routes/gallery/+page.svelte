<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';

  let activeToggle = $state<'photos' | 'names'>('photos');

  function setToggle(next: 'photos' | 'names') {
    activeToggle = next;
  }
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
</svelte:head>

<Navbar />

<main class="gallery-page">
  <section class="toggle" aria-label="Gallery view toggle">
    <div class="toggle-track" aria-hidden="true"></div>
    <div class:toggle-selected--names={activeToggle === 'names'} class="toggle-selected" aria-hidden="true"></div>
    <button
      class:toggle-label--active={activeToggle === 'photos'}
      class="toggle-label toggle-label--photos"
      type="button"
      aria-pressed={activeToggle === 'photos'}
      onclick={() => setToggle('photos')}
    >
      PHOTOS
    </button>
    <button
      class:toggle-label--active={activeToggle === 'names'}
      class="toggle-label toggle-label--names"
      type="button"
      aria-pressed={activeToggle === 'names'}
      onclick={() => setToggle('names')}
    >
      NAMES
    </button>
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
    border-radius: 53.5px;
    isolation: isolate;
  }

  .toggle-track,
  .toggle-selected {
    position: absolute;
    inset: 0;
    border-radius: 53.5px;
  }

  .toggle-track {
    background: var(--color-background-primary);
    box-shadow: inset 0 0 0 1px rgba(250, 250, 250, 0.08);
  }

  .toggle-selected {
    left: 4px;
    top: 4px;
    width: 89px;
    height: 27px;
    background: var(--color-link-selected);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.08),
      0 8px 18px rgba(189, 255, 93, 0.26),
      0 0 18px rgba(189, 255, 93, 0.2);
    transform: translateX(0);
    transition:
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .toggle-selected--names {
    transform: translateX(85px);
  }

  .toggle-label {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: 0.02em;
    cursor: pointer;
    z-index: 1;
    transition:
      color 220ms ease,
      opacity 220ms ease,
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .toggle-label--photos {
    left: 20px;
    color: var(--color-content-body);
  }

  .toggle-label--names {
    right: 18px;
    color: var(--color-content-body);
  }

  .toggle-label--active.toggle-label--photos {
    color: var(--color-content-primary);
    transform: translateY(-50%) scale(1.02);
  }

  .toggle-label--active.toggle-label--names {
    color: var(--color-content-primary);
    opacity: 0.92;
    transform: translateY(-50%) scale(1.02);
  }

  .toggle-label:not(.toggle-label--active) {
    opacity: 0.88;
  }

  .toggle:hover .toggle-selected {
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.08),
      0 10px 24px rgba(189, 255, 93, 0.3),
      0 0 22px rgba(189, 255, 93, 0.26);
  }
</style>
