<script lang="ts">
  import { buildPeople, imagesRaw, slugify } from '$lib/data/gallery';
  import { goto } from '$app/navigation';

  const ROW_HEIGHT = 112;

  let { activeFilter = null }: { activeFilter?: string | null } = $props();

  type Person = { name: string; tags: string[] };

  const people: Person[] = buildPeople(imagesRaw);

  let selectedIndex = $state<number>(-1);
  let copied = $state(false);
  let bgScroll = $state<number>(0);

  let bgContainerRef: HTMLDivElement;
  let namesInteractionRef: HTMLDivElement;

  function getVisiblePeople() {
    return activeFilter
      ? people.filter((p) => p.tags.includes(activeFilter as string))
      : people;
  }

  function findImageIndexByName(name: string | undefined) {
    if (!name) return 0;
    return imagesRaw.findIndex((img) => img.name === name) || 0;
  }

  async function copyAndOpen(person: Person, idx: number) {
    const imageIndex = findImageIndexByName(person.name);
    const slug = slugify(person.name, imageIndex);
    const href = `/volunteer/${slug}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.origin + href);
        copied = true;
        setTimeout(() => (copied = false), 700);
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, 250));
    goto(href);
  }

  function syncScroll() {
    if (!namesInteractionRef || !bgContainerRef) return;
    bgScroll = namesInteractionRef.scrollTop;
  }
</script>

<div class="names-view">
  <div class="names-fade names-fade--top" aria-hidden="true"></div>
  <div class="names-fade names-fade--bottom" aria-hidden="true"></div>

  <div class="names-stage">
    <div class="names-bg" bind:this={bgContainerRef} aria-hidden="true">
      <div class="names-bg-inner" style={`transform: translateY(${-bgScroll}px)`}>
        {#each getVisiblePeople() as person, i}
          {@const distance = i - selectedIndex}
            {@const isActive = distance === 0}

          <div
            class="names-bg__item"
              class:selected={isActive}
            style={`
              top: ${i * ROW_HEIGHT}px;
                opacity: ${isActive ? 0.09 : 1 - Math.min(0.78, Math.abs(distance) * 0.16)};
              filter: blur(${Math.min(14, Math.pow(Math.abs(distance), 1.35) * 2.4)}px);
              transform: scale(${1 - Math.min(0.08, Math.abs(distance) * 0.02)});
            `}
          >
            <div class="name-wrap">
              <span class="name-text">{person.name.toUpperCase()}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div
      bind:this={namesInteractionRef}
      class="names-interaction"
      role="listbox"
      aria-label="Names gallery"
      tabindex="0"
      onscroll={syncScroll}
      onmouseleave={() => (selectedIndex = -1)}
    >
      {#each getVisiblePeople() as person, index}
        <button
          class="names-interaction__item"
          class:selected={selectedIndex === index}
          onmouseenter={() => (selectedIndex = index)}
          onfocus={() => (selectedIndex = index)}
          onblur={() => (selectedIndex = -1)}
          onclick={() => copyAndOpen(person, index)}
          aria-label={`Open ${person.name}`}
          type="button"
        >
          <span class="names-interaction__label">{person.name.toUpperCase()}</span>
          <div class="item-underline" class:visible={selectedIndex === index} aria-hidden="true"></div>
        </button>
      {/each}
    </div>
  </div>

  <div class="copy-toast" aria-hidden={!copied} class:visible={copied}>Link copied</div>
</div>

<style>
  .names-view {
    position: absolute;
    inset: var(--gallery-navbar-offset) 0 0 0;
    z-index: 6;
    overflow: hidden;
    background: var(--gallery-background);
    color: #fff;
    font-family: 'Forma DJR Display', sans-serif;
  }

  .names-fade {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 5;
  }

  .names-fade--top {
    top: 0;
    height: 214px;
    background: linear-gradient(to bottom, var(--gallery-background) 0%, rgba(26, 26, 26, 0) 100%);
    backdrop-filter: blur(6px);
  }

  .names-fade--bottom {
    bottom: 0;
    height: 233px;
    background: linear-gradient(to top, var(--gallery-background) 0%, rgba(26, 26, 26, 0) 100%);
    backdrop-filter: blur(6px);
  }

  .names-stage {
    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .names-bg {
    position: absolute;
    left: calc(25% + 42px);
    right: 72px;
    top: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 3;
  }

  .names-bg-inner {
    position: relative;
    width: 100%;
  }

  .names-bg__item {
    position: absolute;
    left: 0;
    right: 0;
    height: 112px;
    font-size: 90px;
    line-height: 100px;
    color: rgba(255, 255, 255, 0.24);
    text-transform: uppercase;
    letter-spacing: 0;
    transition:
      transform 260ms cubic-bezier(.22, 1, .36, 1),
      opacity 260ms ease,
      filter 260ms ease,
      color 260ms ease;
    white-space: nowrap;
  }

  .names-bg__item.selected {
    color: rgba(255, 255, 255, 0.24);
    opacity: 0.12;
    filter: blur(12px);
    transform: none;
  }

  .names-interaction {
    position: absolute;
    left: calc(25% + 42px);
    right: 72px;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: auto;
    z-index: 6;
    padding-top: 0;
    scrollbar-width: none;
  }

  .names-interaction::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .names-interaction__item {
    position: relative;
    border: 0;
    background: transparent;
    color: transparent;
    height: 112px;
    font-size: 90px;
    line-height: 100px;
    padding: 0 0 12px 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    display: block;
  }

  .names-interaction__item:hover,
  .names-interaction__item.selected {
    color: var(--gallery-accent, #bdff5d);
    transform: translateX(44px);
  }

  .names-interaction__label {
    display: inline-block;
    position: relative;
    z-index: 1;
  }

  .name-wrap {
    display: inline-block;
    position: relative;
    padding-bottom: 12px;
  }

  .name-text {
    display: inline-block;
  }

  .item-underline {
    position: absolute;
    left: 0;
    bottom: -2px;
    height: 2px;
    background: var(--gallery-accent, #bdff5d);
    width: 0;
    opacity: 0;
    transition: width 220ms cubic-bezier(.22, 1, .36, 1), opacity 160ms ease;
  }

  .item-underline.visible {
    width: 100%;
    opacity: 1;
  }

  .copy-toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%) translateY(8px);
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 8px 14px;
    border-radius: 999px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease, transform 220ms cubic-bezier(.22, 1, .36, 1);
    z-index: 9999;
  }

  .copy-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
</style>
