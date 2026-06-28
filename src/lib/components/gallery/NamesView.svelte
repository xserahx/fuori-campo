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

  // 28px text line + 8px bottom padding su mobile, 120px su desktop
  const ROW_HEIGHT = $derived(isMobile ? 36 : 120);
  
  // 100px di stacco su desktop, 66px su mobile
  const LETTER_BREAK_HEIGHT = $derived(isMobile ? 66 : 100); 

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

  let namesInteractionRef: HTMLDivElement;
  let itemHeights = $state<number[]>([]);

  function normalizeFirstLetter(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().charAt(0);
  }

  function formatDisplayName(person: Person): string {
    return person.displayName.toUpperCase().split(' ').map(word =>
      word.length >= 8 ? word.replace(/(.{7})/g, '$1­') : word
    ).join(' ');
  }

  /* ── Lista Visibile con calcolo altezze e stacchi ── */
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

  /* ── Sidebar Alfabetica ── */
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
    
    // Cerchiamo l'elemento del distanziatore corrispondente alla lettera cliccata
    const targetElement = namesInteractionRef.querySelector(`#letter-${letter}`) as HTMLElement;
    if (!targetElement) return;

    // Calcoliamo la distanza reale dell'elemento rispetto al contenitore di scroll
    const elementTopRelativeToContainer = targetElement.offsetTop;

    // Vogliamo che l'elemento si fermi a 140px dal top dello schermo.
    const targetScrollTop = elementTopRelativeToContainer - 140;

    namesInteractionRef.scrollTo({ 
      top: Math.max(0, targetScrollTop), 
      behavior: 'smooth' 
    });
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
    if (initialContext.namesScroll > 0) {
      requestAnimationFrame(() => {
        syncScroll();
      });
    }
    return {};
  }

  async function syncScroll() {
    await tick();
    if (!namesInteractionRef) return;
    updateSelectedFromScroll();
  }
</script>

<div class="names-view">
  <div class="names-stage">
    
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
        
        <!-- Il distanziatore viene stampato sempre per garantire l'ingombro fisico -->
        {#if person.letterBreakBefore}
          <div 
            id={`letter-${normalizeFirstLetter(person.cognome)}`} 
            class="letter-spacer" 
            aria-hidden="true"
          >
            {#if isMobile}
              <span class="letter-label">{normalizeFirstLetter(person.cognome)}</span>
            {/if}
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
</div>

<style>
  .names-stage {
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

  /* Distanziatore gruppi di lettere (100px su desktop) */
  .letter-spacer {
    display: flex;
    flex-shrink: 0;
    pointer-events: none;
    align-items: flex-start;
    height: var(--spacing-9, 60px);
  }

  .names-interaction__item {
    position: relative;
    border: 0;
    background: transparent;
    color: var(--color-content-body, #fafafa);

    /* Sostituito min-height rigido con padding verticale responsive */
    padding-top: var(--spacing-4, 32px);
    padding-bottom: var(--spacing-4, 32px);

    font-family: var(--font-display);
    font-size: var(--ts-h2-size, 84px);
    font-weight: var(--ts-h2-weight, 500);
    line-height: var(--ts-h2-line-height, 80px);
    letter-spacing: var(--ts-h2-letter-spacing, 0em);

    margin: 0;

    cursor: pointer;
    text-align: left;
    
    /* RIMOSSO overflow: hidden per evitare il taglio del testo */
    display: block;
    hyphens: manual; /* Mantiene la sillabazione intelligente del tuo script JS */
    word-break: break-word; /* Sicurezza: se una parola è troppo lunga, va a capo anziché spaccare il layout */
    
    transition: color 200ms ease;
  }

  .names-interaction__label {
    display: inline-block;
    position: relative;
    z-index: 1;
    vertical-align: top;
  }

  .names-interaction__item:hover {
    color: var(--color-content-accent, #bdff5d);
  }

  /* ── Sidebar Alfabetica (Semplificata con GAP Fisso) ── */
  .alpha-sidebar {
    position: absolute;
    right: var(--spacing-11, 72px);
    top: var(--navbar-height, 125px);
    z-index: 35;
    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 16px; /* Gap fisso per desktop */
    
    /* Previene che su schermi bassi esca dalla pagina, abilitando lo scroll interno */
    max-height: calc(100dvh - var(--navbar-height, 125px) - var(--spacing-10, 64px));
    overflow-y: auto;
    scrollbar-width: none;
    
    padding: 0;
    margin: 0;
    pointer-events: auto;
  }

  .alpha-sidebar::-webkit-scrollbar {
    display: none;
  }

  .alpha-sidebar__btn {
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    height:auto;
    width:100%;
    
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 500;
    font-style: normal;
    text-align: right;
    text-transform: uppercase;
    color: var(--color-content-body, #fafafa);
    transition: color 150ms ease-in-out;
  }

  .alpha-sidebar__btn.active, .alpha-sidebar__btn:hover {
    color: var(--color-content-accent, #bdff5d);
  }

  /* ── Responsive Mobile (< 600px) ── */
  @media (max-width: 599px) {
    .names-interaction {
      left: 24px;
      right: 42px;
    }

    .names-stage {
      --names-center-padding: calc((100dvh - 28px) / 2);
    }

    .names-interaction__item {
      min-height: 28px;
      font-size: 24px;
      line-height: 28px;
      padding: 0 8px 8px 0;
    }

    /* Distanziatore per mobile: 66px di altezza totale + visualizzazione testo */
    .letter-spacer {
      height: 66px;
      padding-top: 46px; 
    }
    
    .letter-label {
      font-family: var(--font-display);
      font-size: 20px;
      color: var(--color-content-accent, #bdff5d);
      font-weight: 500;
    }

    /* Sidebar alfabetica su mobile */
    .alpha-sidebar {
      top: 96px;
      right: 24px;
      width: 17px;
      gap: 10px; /* Gap fisso per mobile */
      max-height: calc(100dvh - 200px);
    }

    .alpha-sidebar__btn {
      font-size: 16px;
    }
  }

  /* ── Accessibilità ── */
  .names-interaction__item:focus-visible,
  .alpha-sidebar__btn:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 4px;
    border-radius: 4px;
    color: var(--color-content-accent);
  }

  @media (pointer: coarse) {
    .alpha-sidebar__btn {
      min-width: max(24px, calc(32px / var(--page-zoom, 1)));
      min-height: max(18px, calc(32px / var(--page-zoom, 1)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .names-interaction__item {
      transition: none;
    }
  }
</style>