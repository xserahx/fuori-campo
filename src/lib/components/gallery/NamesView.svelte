<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { imagesRaw, slugify } from '$lib/data/gallery';
  import type { VolunteerSummary } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';

  const ROW_HEIGHT = 120;

  let {
    activeFilter = null,
    volunteers = []
  }: {
    activeFilter?: string | null;
    volunteers?: VolunteerSummary[];
  } = $props();

  const initialContext = readGalleryContext(page.url.searchParams);

  type Person = { slug: string; displayName: string; cognome: string; tags: string[] };

  // Build slug → tags[] from Figma image data for the category filter
  const imageTagsBySlug = new Map<string, string[]>();
  for (const img of imagesRaw) {
    if (!img.name) continue;
    const s = slugify(img.name, 0);
    const existing = imageTagsBySlug.get(s) ?? [];
    for (const tag of img.tags ?? []) {
      if (!existing.includes(tag)) existing.push(tag);
    }
    imageTagsBySlug.set(s, existing);
  }

  const people = $derived<Person[]>(
    volunteers
      .map(vol => ({
        slug: vol.slug,
        displayName: `${vol.cognome} ${vol.nome}`,
        cognome: vol.cognome,
        tags: imageTagsBySlug.get(vol.slug) ?? []
      }))
      .sort((a, b) => a.cognome.localeCompare(b.cognome, 'it', { sensitivity: 'base' }))
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

  function formatDisplayName(person: Person) {
    return person.displayName.toUpperCase();
  }

  /* ── Alphabet sidebar ──────────────────────────────────────────── */
  function normalizeFirstLetter(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().charAt(0);
  }

  const availableLetters = $derived.by(() => {
    const visible = activeFilter ? people.filter(p => p.tags.includes(activeFilter!)) : people;
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of visible) {
      const l = normalizeFirstLetter(p.cognome);
      if (l && !seen.has(l)) { seen.add(l); result.push(l); }
    }
    return result;
  });

  const activeLetter = $derived.by(() => {
    const visible = activeFilter ? people.filter(p => p.tags.includes(activeFilter!)) : people;
    const person = visible[selectedIndex];
    return person ? normalizeFirstLetter(person.cognome) : '';
  });

  function jumpToLetter(letter: string) {
    if (!namesInteractionRef) return;
    const visible = activeFilter ? people.filter(p => p.tags.includes(activeFilter!)) : people;
    const idx = visible.findIndex(p => normalizeFirstLetter(p.cognome) === letter);
    if (idx === -1) return;
    namesInteractionRef.scrollTo({ top: idx * ROW_HEIGHT, behavior: 'smooth' });
  }

  function openVolunteer(person: Person) {
    const search = buildGallerySearchParams({
      view: 'names',
      filter: activeFilter,
      namesScroll: namesInteractionRef?.scrollTop ?? 0
    });

    const href = search
      ? `/volunteer/${person.slug}/profile?${search}`
      : `/volunteer/${person.slug}/profile`;

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

  <nav class="alpha-sidebar" aria-label="Navigazione alfabetica">
    {#each availableLetters as letter}
      <button
        class="alpha-sidebar__btn"
        class:active={activeLetter === letter}
        type="button"
        aria-label={`Vai alla lettera ${letter}`}
        onclick={() => jumpToLetter(letter)}
      >
        {letter}
      </button>
    {/each}
  </nav>

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
    --names-center-padding: calc((100dvh - 120px) / 2);

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

  .names-interaction__item {
    transition:
      color     200ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
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
    /* Stop before the sidebar: sidebar is at right:72px and 23px wide.
       With the active shift (+~56px), right:92px keeps a clear gap. */
    right: calc(var(--names-inline-end, 72px) + 20px);
    bottom: 0;

    height: var(--names-underline-thickness);
    background: var(--gallery-accent, var(--color-content-accent));
    box-shadow: 0 0 8px rgba(189, 255, 93, 0.4);

    opacity: 0;
    transform: scaleX(0);
    transform-origin: left center;
    transition:
      opacity   300ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 480ms ease;
  }

  .item-underline.visible {
    opacity: 1;
    transform: scaleX(1);
    box-shadow: 0 0 14px rgba(189, 255, 93, 0.55);
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
    transform: translateX(-50%) translateY(12px);

    background: rgba(14, 14, 14, 0.88);
    color: var(--color-content-body);
    border: 1px solid rgba(189, 255, 93, 0.22);
    backdrop-filter: blur(8px);

    padding: 8px 18px;
    border-radius: 999px;

    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition:
      opacity   280ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 360ms ease;
  }

  .copy-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    box-shadow: 0 0 16px rgba(189, 255, 93, 0.18);
  }

  /* ── Alphabet sidebar ─────────────────────────────────────────────── */
  .alpha-sidebar {
    position: absolute;
    right: var(--spacing-11, 72px);
    /* Anchor near the top of the view (not centered) so it never
       overlaps the "FILTRA PER CATEGORIA" button at the bottom.
       Font/gap scale with vh so the full list always fits. */
    top: clamp(24px, 6vh, 120px);
    z-index: 35;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(5px, 1.4vh, 13.5px);

    width: 23px;
    padding: 0;
    margin: 0;
    pointer-events: auto;
  }

  .alpha-sidebar__btn {
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;

    font-family: var(--font-display);
    font-size: clamp(13px, 2vh, 21.647px);
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
    color: var(--color-content-body, #fafafa);
    width: 23px;

    transition: color 180ms ease, opacity 180ms ease;
  }

  .alpha-sidebar__btn.active {
    color: var(--color-content-accent, #bdff5d);
  }

  .alpha-sidebar__btn:hover:not(.active) {
    opacity: 0.55;
  }

  @media (max-width: 1100px) {
    .alpha-sidebar {
      right: var(--spacing-5, 24px);
      width: 18px;
    }
  }
</style>