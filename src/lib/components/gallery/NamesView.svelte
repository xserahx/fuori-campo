<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import type { VolunteerSummary } from '$lib/data/volunteers';
  import { ruoloToTag } from '$lib/data/volunteers';
  import { goto } from '$app/navigation';
  import { buildGallerySearchParams, readGalleryContext } from '$lib/data/gallery-context';

  let isMobile = $state(false);

  $effect(() => {
    const check = () => { isMobile = window.innerWidth < 600; };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  });

  // 28px text line + 8px bottom padding (see CSS)
  const ROW_HEIGHT = $derived(isMobile ? 36 : 120);

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

  let selectedIndex = $state<number>(-1);
  let hoveredIndex = $state<number>(-1);
  let copied = $state(false);
  let bgScroll = $state<number>(initialContext.namesScroll);

  let bgContainerRef: HTMLDivElement;
  let namesInteractionRef: HTMLDivElement;

  // Measured actual heights for each visible item (index → px).
  // Svelte's bind:offsetHeight sets these synchronously after each render,
  // so bg absolute-positions always reflect actual DOM heights.
  let itemHeights = $state<number[]>([]);
    
  const LETTER_BREAK_HEIGHT = $derived(isMobile ? 66 : 0); // 46px gap + 20px label line-height

  function normalizeFirstLetter(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().charAt(0);
  }

  function formatDisplayName(person: Person): string {
    return person.displayName.toUpperCase().split(' ').map(word =>
      word.length >= 8 ? word.replace(/(.{7})/g, '$1­') : word
    ).join(' ');
  }

  /* ── Visible list with cumulative offsets accounting for letter breaks ── */
  type PersonWithOffset = Person & { topOffset: number; letterBreakBefore: boolean };

  const visibleWithOffsets = $derived.by((): PersonWithOffset[] => {
    const visible = activeFilter
      ? people.filter(p => p.tags.includes(activeFilter!))
      : people;
    let cumulative = 0;
    return visible.map((p, i) => {
      const letterBreakBefore = i === 0 ||
        normalizeFirstLetter(p.cognome) !== normalizeFirstLetter(visible[i - 1].cognome);
      if (letterBreakBefore) cumulative += LETTER_BREAK_HEIGHT;
      const topOffset = cumulative;
      cumulative += itemHeights[i] ?? ROW_HEIGHT;
      return { ...p, topOffset, letterBreakBefore };
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

    // Only highlight the restored name if the user had actually scrolled before.
    // At scroll = 0 (fresh open) no name should be pre-selected.
    if (initialContext.namesScroll > 0) {
      requestAnimationFrame(() => {
        syncScroll();
      });
    }

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
        {#if person.letterBreakBefore && isMobile}
          <div class="letter-spacer" aria-hidden="true">
          <span class="letter-label">{normalizeFirstLetter(person.cognome)}</span>
        </div>
        {/if}
        <button
          class="names-interaction__item"
          class:selected={selectedIndex === index}
          bind:offsetHeight={itemHeights[index]}
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

  <nav class="alpha-sidebar" aria-label="Navigazione alfabetica" style={`--_count: ${Math.max(availableLetters.length, 1)}`}>
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

  
</div>

<style>


  .names-stage {
    /* Center the active row in the space below the fixed navbar.
       --navbar-height is 125px on desktop; the active item is 120px tall. */
    --names-center-padding: calc((100dvh - var(--navbar-height, 0px) - 120px) / 2 + var(--navbar-height, 0px));

    position: absolute;
    inset: 0;
    z-index: 2;
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

    padding-top: var(--spacing-14, 200px);
    padding-bottom: var(--names-center-padding);
  }

  .names-interaction::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .letter-spacer {
    display: none; /* hidden on desktop: LETTER_BREAK_HEIGHT = 0 there */
  }


  .names-interaction__item {
    position: relative;
    border: 0;
    background: transparent;
    color: var(--color-content-body, #fafafa);

    min-height: 120px;

    font-family: var(--font-display);
    font-size: var(--ts-h2-size, 84px);
    font-weight: var(--ts-h2-weight, 500);
    line-height: var(--ts-h2-line-height, 80px);
    letter-spacing: var(--ts-h2-letter-spacing, 0em);

    margin: 0;

    cursor: pointer;
    text-align: left;
    overflow: hidden;
    hyphens: manual;
    display: block;
  }

  /* .names-interaction__item {
    transition:
      color     200ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .names-interaction__item.selected {
    color: var(--gallery-accent, var(--color-content-accent));
    transform: translateX(var(--names-active-shift));
  } */

  .names-interaction__label {
    display: inline-block;
    position: relative;
    z-index: 1;
    vertical-align: top;
  }


  .names-interaction__item:hover {
    color: var(--gallery-accent, var(--color-content-accent));
  }

  /* .names-veil {
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

    transform: translateZ(0);

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
  } */

  /* .names-veil__zone--middle-a,
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
    transform: translateZ(0);

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
  } */


  /* .copy-toast {
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
  } */

  /* ── Alphabet sidebar ─────────────────────────────────────────────── */
  /* Refs: Figma desktop 6197-17109 / mobile 6197-16829.
     --_* are component-private; breakpoints override only what changes.
     --_avail and --_gap are derived and update automatically.          */
  .alpha-sidebar {
    /* ── Configurable per breakpoint ── */
    --_top:     var(--navbar-height, 125px);   /* top anchor */
    --_right:   var(--spacing-11, 72px);       /* Figma paddingRight */
    --_w:       23px;                          /* item + track width */
    --_item-h:  var(--unit-24, 24px);          /* item height */
    --_font:    var(--unit-20, 20px);          /* letter font-size */
    --_lh:      var(--unit-24, 24px);          /* letter line-height */
    --_gap: var(--unit-16, 16px);          /* Figma itemSpacing */

    --_count:   19;                            /* fallback; set inline from availableLetters.length */
    /* clearance above filter-btn: max-bottom(48) + btn-height(~50) + room = 120px
       = var(--unit-80) + var(--spacing-7)                                         */
    --_reserve: calc(var(--unit-80, 80px) + var(--spacing-7, 40px));

    /* ── Derived — recalculate whenever any component var changes ──
       The gap distributes the ACTUAL number of letters across --_avail:
       N items + (N-1) gaps. Using the real --_count (not a hardcoded 19)
       keeps every letter on screen — the gap shrinks toward --_gap-min as
       letters are added so the column never overflows its max-height.     */
    --_avail: calc(100dvh - var(--_top) - var(--_reserve));
    /* Per-item height: the Figma size normally, but shrunk so N items always
       fit within --_avail when letters are many / the viewport is short.
       Guarantees count * item-fit <= avail, so nothing is ever clipped.   */
    --_item-fit: min(var(--_item-h), calc(var(--_avail) / var(--_count)));
    --_gap:   clamp(
                var(--_gap-min),
                calc((var(--_avail) - var(--_count) * var(--_item-fit)) / max(var(--_count) - 1, 1)),
                var(--_gap-max)
              );

    position:       absolute;
    right:          var(--_right);
    top:            var(--_top);
    z-index:        35;
    display:        flex;
    flex-direction: column;
    align-items:    center;
    gap:            var(--_gap);
    width:          var(--_w);
    max-height:     var(--_avail);
    overflow:       hidden;
    padding:        0;
    margin:         0;
    pointer-events: auto;
  }

  /* Size/font values all inherit from .alpha-sidebar custom vars above */
  .alpha-sidebar__btn {
    border:         0;
    background:     transparent;
    padding:        0;
    cursor:         pointer;
    flex-shrink:    0;
    font-family:    var(--font-display);
    font-size:      20px;
    font-weight:    500;
    font-style:     normal;
    text-align:     center;
    text-transform: uppercase;
    color:          var(--color-content-body, #fafafa);
    transition:     color 300ms ease-in-out, opacity 180ms ease;
  }

  .alpha-sidebar__btn.active, .alpha-sidebar__btn:hover {
    color: var(--color-content-accent, #bdff5d);
  }

  @media (max-width: 599px) {
    .names-bg,
    .names-interaction {
      left: 24px;
      right: 42px;
    }

    .names-view {
      --names-active-shift: 8px;
      --names-inline-end: 8px;
    }

    /* Match JS ROW_HEIGHT = 28 on mobile; navbar-height collapses to 0 on mobile */
    .names-stage {
      --names-center-padding: calc((100dvh - 28px) / 2);
    }

    .names-interaction__item {
      min-height: 28px;
      font-size: 24px;
      line-height: 28px;
      /* 8px bottom gap creates "little spacing" between names;
         included in offsetHeight so topOffsets stay in sync */
      padding: 0 var(--names-inline-end) 8px 0;
    }

    /* Match JS LETTER_BREAK_HEIGHT = 66 on mobile (46px gap + 20px label) */
    .letter-spacer {
      display: flex;
      flex-shrink: 0;
      width: 100%;
      pointer-events: none;
      align-items: flex-start;
      padding-top: 46px;
    }

    /* Figma 6197-16829: right 25px, top 96px (mobile TOP BAR), 17×19px, gap 10px
       --_top    = 96px = var(--unit-80) + var(--unit-16)
       --_reserve = 104px = var(--unit-80) + var(--unit-24)
                   (icon-btn: bottom 36px + height 48px + room 20px)
       --_gap-max: 10px (Figma value; between --unit-8 and --unit-12)
       .alpha-sidebar__btn picks up all values via inherited CSS vars          */
    .alpha-sidebar {
      --_top:     calc(var(--unit-80, 80px) + var(--unit-16, 16px));
      --_right:   var(--spacing-5, 24px);
      --_w:       17px;
      --_item-h:  19px;
      --_font:    var(--unit-16, 16px);
      --_lh:      19px;
      --_gap-max: 10px;
      --_gap-min: var(--unit-0, 0px);
      --_reserve: calc(var(--unit-80, 80px) + var(--unit-24, 24px));
    }
  }

  /* ── Focus visible ─────────────────────────────────────────────── */
  .names-interaction__item:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 4px;
    border-radius: 4px;
    color: var(--gallery-accent, var(--color-content-accent));
  }

  .alpha-sidebar__btn:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 4px;
    border-radius: 2px;
    color: var(--color-content-accent);
  }

  /* ── Touch target compensation for alphabet sidebar ─────────────── */
  @media (pointer: coarse) {
    .alpha-sidebar__btn {
      min-width:  max(23px, calc(32px / var(--page-zoom, 1)));
      min-height: max(18px, calc(32px / var(--page-zoom, 1)));
    }
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .names-interaction__item {
      transition: color 0.01ms;
    }
    
  }
</style>