<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import type { VolunteerSummary } from '$lib/supabase';
  import { ruoloToTag } from '$lib/supabase';
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

  const people = $derived<Person[]>(
    volunteers
      .map(vol => {
        const tag = ruoloToTag(vol.ruolo_generale);
        return {
          slug: vol.slug,
          displayName: `${vol.cognome} ${vol.nome}`,
          cognome: vol.cognome,
          tags: tag ? [tag] : []
        };
      })
      .sort((a, b) => a.cognome.localeCompare(b.cognome, 'it', { sensitivity: 'base' }))
  );

  let selectedIndex = $state<number>(0);
  let hoveredIndex = $state<number>(-1);
  let copied = $state(false);
  let bgScroll = $state<number>(initialContext.namesScroll);

  let bgContainerRef: HTMLDivElement;
  let namesInteractionRef: HTMLDivElement;

  const LETTER_BREAK_HEIGHT = 86;

  function normalizeFirstLetter(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().charAt(0);
  }

  function formatDisplayName(person: Person) {
    return person.displayName.toUpperCase();
  }

  /* ── Visible list with cumulative offsets accounting for letter breaks ── */
  type PersonWithOffset = Person & { topOffset: number; letterBreakBefore: boolean };

  const visibleWithOffsets = $derived.by((): PersonWithOffset[] => {
    const visible = activeFilter
      ? people.filter(p => p.tags.includes(activeFilter!))
      : people;
    let cumulative = 0;
    return visible.map((p, i) => {
      const letterBreakBefore = i > 0 &&
        normalizeFirstLetter(p.cognome) !== normalizeFirstLetter(visible[i - 1].cognome);
      if (letterBreakBefore) cumulative += LETTER_BREAK_HEIGHT;
      return { ...p, topOffset: cumulative + i * ROW_HEIGHT, letterBreakBefore };
    });
  });

  /* ── Alphabet sidebar ──────────────────────────────────────────── */
  const availableLetters = $derived.by(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of visibleWithOffsets) {
      const l = normalizeFirstLetter(p.cognome);
      if (l && !seen.has(l)) { seen.add(l); result.push(l); }
    }
    return result;
  });

  const activeLetter = $derived.by(() => {
    const person = visibleWithOffsets[selectedIndex];
    return person ? normalizeFirstLetter(person.cognome) : '';
  });

  function jumpToLetter(letter: string) {
    if (!namesInteractionRef) return;
    const target = visibleWithOffsets.find(p => normalizeFirstLetter(p.cognome) === letter);
    if (!target) return;
    namesInteractionRef.scrollTo({ top: target.topOffset, behavior: 'smooth' });
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

    const visible = visibleWithOffsets;
    if (!visible.length) { selectedIndex = -1; return; }

    const styles = getComputedStyle(namesInteractionRef);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const viewportCenter = namesInteractionRef.scrollTop + namesInteractionRef.clientHeight / 2;
    const targetOffset = viewportCenter - paddingTop - ROW_HEIGHT / 2;

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < visible.length; i++) {
      const dist = Math.abs(visible[i].topOffset - targetOffset);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    selectedIndex = bestIdx;
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
        {#each visibleWithOffsets as person, i}
          {@const distance = i - selectedIndex}
          {@const isActive = distance === 0}
          {@const absDistance = Math.abs(distance)}

          <div
            class="names-bg__item"
            class:selected={isActive}
            class:hovered={i === hoveredIndex}
            style={`
              top: calc(var(--names-center-padding) + ${person.topOffset}px);
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
      {#each visibleWithOffsets as person, index}
        {#if person.letterBreakBefore}
          <div class="letter-spacer" aria-hidden="true"></div>
        {/if}
        <button
          class="names-interaction__item"
          class:selected={selectedIndex === index}
          onclick={() => openVolunteer(person)}
          onmouseenter={() => (hoveredIndex = index)}
          onmouseleave={() => (hoveredIndex = -1)}
          aria-label={`Open ${formatDisplayName(person)}`}
          type="button"
        >
          <span class="names-interaction__label">{formatDisplayName(person)}</span>
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
    font-size: 90px;
    font-weight: 500;
    font-style: normal;
    line-height: normal;
    color: var(--color-content-body, #fafafa);
    text-transform: uppercase;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .names-bg__item.selected,
  .names-bg__item.hovered {
    opacity: 0 !important;
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

  .letter-spacer {
    height: 86px;
    flex-shrink: 0;
    width: 100%;
    pointer-events: none;
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
    font-size: 90px;
    font-weight: 500;
    font-style: normal;
    line-height: normal;

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

  .names-interaction__item:hover {
    color: var(--gallery-accent, var(--color-content-accent));
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