<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { buildPeople, imagesRaw, slugify, volunteersNames } from '$lib/data/gallery';
  import { goto } from '$app/navigation';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';

  const ROW_HEIGHT = 120;

  let { activeFilter = null }: { activeFilter?: string | null } = $props();

  const initialContext = readGalleryContext(page.url.searchParams);

  type Person = { name: string; tags: string[]; source: 'image' | 'manual' };

  const peopleFromImages: Person[] = buildPeople(imagesRaw).map((person) => ({
    ...person,
    source: 'image'
  }));

  const manualPeople: Person[] = volunteersNames.map((n) => ({
    name: n,
    tags: [],
    source: 'manual'
  }));

  const peopleMap = new Map<string, Person>();
  for (const p of peopleFromImages) peopleMap.set(p.name, p);
  for (const p of manualPeople) if (!peopleMap.has(p.name)) peopleMap.set(p.name, p);

  function surnameKey(p: Person): string {
    const parts = p.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return p.name;
    return p.source === 'manual' ? parts[0] : parts.slice(1).join(' ');
  }

  const people: Person[] = Array.from(peopleMap.values()).sort((a, b) =>
    surnameKey(a).localeCompare(surnameKey(b), 'it', { sensitivity: 'base' })
  );

  let selectedIndex = $state<number>(0);
  let copied = $state(false);
  let bgScroll = $state<number>(initialContext.namesScroll);

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

  function formatDisplayName(person: Person) {
    const { name, source } = person;
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return '';
    if (parts.length === 1) return name.toUpperCase();

    return source === 'manual'
      ? name.toUpperCase()
      : `${parts.slice(1).join(' ')} ${parts[0]}`.toUpperCase();
  }

  function openVolunteer(person: Person) {
    const imageIndex = findImageIndexByName(person.name);
    const slug = slugify(person.name, imageIndex);
    const search = buildGallerySearchParams({
      view: 'names',
      filter: activeFilter,
      namesScroll: namesInteractionRef?.scrollTop ?? 0
    });

    const href = search ? `/volunteer/${slug}/profile?${search}` : `/volunteer/${slug}/profile`;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(window.location.origin + href)
        .then(() => {
          copied = true;
          setTimeout(() => (copied = false), 700);
        })
        .catch(() => {});
    }

    goto(href);
  }

  function updateSelectedFromScroll() {
    if (!namesInteractionRef) return;

    const visiblePeople = getVisiblePeople();

    if (!visiblePeople.length) {
      selectedIndex = -1;
      return;
    }

    const styles = getComputedStyle(namesInteractionRef);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;

    const viewportCenter = namesInteractionRef.scrollTop + namesInteractionRef.clientHeight / 2;
    const indexAtCenter = Math.round((viewportCenter - paddingTop - ROW_HEIGHT / 2) / ROW_HEIGHT);

    selectedIndex = Math.max(0, Math.min(indexAtCenter, visiblePeople.length - 1));
  }

  function restoreScroll(node: HTMLDivElement) {
    node.scrollTop = initialContext.namesScroll;

    requestAnimationFrame(() => {
      syncScroll();
    });

    return {};
  }

  async function syncScroll() {
    await tick();

    if (!namesInteractionRef || !bgContainerRef) return;

    bgScroll = namesInteractionRef.scrollTop;
    updateSelectedFromScroll();
  }
</script>

<div class="names-view">
  <div class="names-stage">
    <div class="names-bg" bind:this={bgContainerRef} aria-hidden="true">
      <div class="names-bg-inner" style={`transform: translateY(${-bgScroll}px)`}>
        {#each getVisiblePeople() as person, i}
          {@const distance = i - selectedIndex}
          {@const isActive = distance === 0}
          {@const absDistance = Math.abs(distance)}

          <div
            class="names-bg__item"
            class:selected={isActive}
            style={`
              top: calc(var(--names-center-padding) + ${i * ROW_HEIGHT}px);
              opacity: ${isActive ? 0 : Math.max(0.18, 1 - Math.min(0.72, absDistance * 0.18))};
              filter: blur(${Math.min(7, Math.pow(absDistance, 1.15) * 1.2)}px);
              transform: scale(${1 - Math.min(0.05, absDistance * 0.012)});
            `}
          >
            <div class="name-wrap">
              <span class="name-text">{formatDisplayName(person)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div
      bind:this={namesInteractionRef}
      use:restoreScroll
      class="names-interaction"
      role="listbox"
      aria-label="Names gallery"
      tabindex="0"
      onscroll={syncScroll}
    >
      {#each getVisiblePeople() as person, index}
        <button
          class="names-interaction__item"
          class:selected={selectedIndex === index}
          onclick={() => openVolunteer(person)}
          aria-label={`Open ${formatDisplayName(person)}`}
          type="button"
        >
          <span class="names-interaction__label">{formatDisplayName(person)}</span>
          <div class="item-underline" class:visible={selectedIndex === index} aria-hidden="true"></div>
        </button>
      {/each}
    </div>
  </div>

  <div class="names-veil" aria-hidden="true">
    <div class="names-veil__zone names-veil__zone--top"></div>
    <div class="names-veil__zone names-veil__zone--middle-a"></div>
    <div class="names-veil__zone names-veil__zone--middle-b"></div>
    <div class="names-veil__zone names-veil__zone--bottom"></div>
  </div>

  <div class="copy-toast" aria-hidden={!copied} class:visible={copied}>Link copied</div>
</div>

<style>
  .names-view {
    position: absolute;
    inset: 0;
    z-index: 6;
    overflow: hidden;
    background: var(--gallery-background);
    color: var(--color-content-body);
    font-family: var(--font-display);

    --names-active-shift: var(--spacing-7);
    --names-inline-end: var(--spacing-11);
    --names-underline-thickness: 2px;
  }

  .names-stage {
    --names-center-padding: calc((100vh - 120px) / 2);

    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .names-bg {
    position: absolute;
    left: clamp(16px, 22.8vw, 394px);
    right: var(--spacing-11);
    top: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 3;
    pointer-events: none;
  }

  .names-bg-inner {
    position: relative;
    width: 100%;
  }

  .names-bg__item {
    position: absolute;
    left: 0;
    right: 0;
    height: 120px;
    font-size: clamp(44px, 6vw, 90px);
    line-height: clamp(54px, 7vw, 120px);
    color: var(--color-content-body);
    text-transform: uppercase;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .names-bg__item.selected {
    opacity: 0;
    filter: none;
    transform: none;
  }

  .names-interaction {
    position: absolute;
    left: clamp(16px, 22.8vw, 394px);
    right: var(--spacing-11);
    top: 0;
    bottom: 0;
    z-index: 6;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;

    padding-top: var(--names-center-padding);
    padding-bottom: var(--names-center-padding);
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

    height: 120px;
    min-height: 120px;
    width: 100%;

    font-family: var(--font-display);
    font-size: clamp(44px, 6vw, 90px);
    line-height: clamp(54px, 7vw, 120px);

    padding: 0 var(--names-inline-end) 20px 0;
    margin: 0;

    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    display: block;
  }

  .names-interaction__item.selected {
    color: var(--gallery-accent, var(--color-content-accent));
    transform: translateX(var(--names-active-shift));
    line-height: clamp(47px, 5.8vw, 100px);
  }

  .names-interaction__label {
    display: inline-block;
    position: relative;
    z-index: 1;
    vertical-align: top;
  }

  .name-wrap {
    display: inline-block;
    position: relative;
  }

  .name-text {
    display: inline-block;
  }

  .item-underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;

    height: var(--names-underline-thickness);
    background: var(--gallery-accent, var(--color-content-accent));

    opacity: 0;
    transform: scaleX(0);
    transform-origin: left center;
  }

  .item-underline.visible {
    opacity: 1;
    transform: scaleX(1);
  }

  .names-veil {
    position: absolute;
    inset: 0;
    z-index: 30;
    pointer-events: none;

    display: grid;
    grid-template-rows: repeat(4, 1fr);
  }

  .names-veil__zone {
    min-height: 0;
    pointer-events: none;
  }

  .names-veil__zone--top {
    grid-row: 1;
    background: linear-gradient(
      to bottom,
      var(--gallery-background) 0%,
      color-mix(in srgb, var(--gallery-background) 72%, transparent) 38%,
      transparent 100%
    );

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    mask-image: linear-gradient(
      to bottom,
      black 0%,
      rgba(0, 0, 0, 0.72) 38%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      rgba(0, 0, 0, 0.72) 38%,
      transparent 100%
    );
  }

  .names-veil__zone--middle-a,
  .names-veil__zone--middle-b {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .names-veil__zone--bottom {
    grid-row: 4;
    background: linear-gradient(
      to top,
      var(--gallery-background) 0%,
      color-mix(in srgb, var(--gallery-background) 72%, transparent) 38%,
      transparent 100%
    );

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    mask-image: linear-gradient(
      to top,
      black 0%,
      rgba(0, 0, 0, 0.72) 38%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to top,
      black 0%,
      rgba(0, 0, 0, 0.72) 38%,
      transparent 100%
    );
  }

  @media (max-width: 1100px) {
    .names-bg,
    .names-interaction {
      left: clamp(16px, 10%, 120px);
      right: var(--spacing-5);
    }

    .names-view {
      --names-active-shift: var(--spacing-5);
      --names-inline-end: var(--spacing-5);
    }
  }

  .copy-toast {
    position: fixed;
    left: 50%;
    bottom: var(--spacing-4);
    transform: translateX(-50%) translateY(8px);

    background: rgba(0, 0, 0, 0.8);
    color: var(--color-content-body);

    padding: 8px 14px;
    border-radius: 999px;

    opacity: 0;
    pointer-events: none;
    z-index: 9999;
  }

  .copy-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
</style>