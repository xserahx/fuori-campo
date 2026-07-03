<script lang="ts">
    import { gsap } from 'gsap';
    import FilterLabel from './FilterLabel.svelte';
    import FiltraPerCategoriaButton from '../buttons/FiltraPerCategoriaButton.svelte';
    import Icon from '../buttons/Icon.svelte';

    let {
        activeFilters = $bindable([])
    } = $props<{
        activeFilters?: string[];
    }>();

    const categorie = [
        { id: 'organizzativa', label: 'AREA ORGANIZZATIVA<br>E SERVIZI GENERALI' },
        { id: 'cerimonie',     label: 'CERIMONIE<br>E REVENUE'                   },
        { id: 'gestione',      label: 'GESTIONE OPERATIVA<br>E FAN EXPERIENCE'   },
        { id: 'logistica',     label: 'LOGISTICA<br>E TERRITORIO'                },
        { id: 'relazioni',     label: 'RELAZIONI<br>E COMUNICAZIONE'             },
        { id: 'sport',         label: 'SPORT<br>E DISCIPLINE'                    }
    ];

    /* Selected categories, in the panel's display order, for the chip row. */
    const selectedCategorie = $derived(
        categorie.filter((cat) => activeFilters.includes(cat.id))
    );

    /* Chip text — the category name on one line (drop the layout <br>). */
    const chipName = (label: string) => label.replace(/<br\s*\/?>/gi, ' ');

    let isOpen     = $state(false);
    let linksEl    = $state<HTMLElement | null>(null);
    let backdropEl = $state<HTMLElement | null>(null);

    /* Track whether GSAP has been initialised on this instance. */
    let initialized = false;

    /* Keep references so we can kill timelines on rapid open/close. */
    let openTl:  gsap.core.Timeline | null = null;
    let closeTl: gsap.core.Timeline | null = null;

    const bottoneVariant = $derived.by(() => {
        if (isOpen)                    return 'close-x';
        if (activeFilters.length > 0)  return 'filter-selected';
        return 'default';
    });

    function togglePanel() { isOpen = !isOpen; }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) isOpen = false;
    }

    /* Maximum number of categories that can be active at once. */
    const MAX_FILTERS = 3;
    const filtersFull = $derived(activeFilters.length >= MAX_FILTERS);

    /* Toggle a category in/out of the active set. The panel stays open so
       several categories can be picked in one pass. Adding is capped at
       MAX_FILTERS; removing (or toggling an already-active one off) always works. */
    function selezionaCategoria(id: string) {
        if (activeFilters.includes(id)) {
            activeFilters = activeFilters.filter((f: string) => f !== id);
        } else if (!filtersFull) {
            activeFilters = [...activeFilters, id];
        }
    }

    /* Remove a single filter via its chip's X — updates badge + results live. */
    function removeFilter(id: string) {
        activeFilters = activeFilters.filter((f: string) => f !== id);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * OPEN
     * force3D:false keeps labels in CPU-rendered 2D transforms so there is
     * no GPU compositing layer to demote when the animation ends.
     * onComplete clears the inline translateY(0%) entirely, returning labels
     * to their natural CSS position with no GSAP residue.
     * ───────────────────────────────────────────────────────────────────── */
    function playOpen() {
        if (!linksEl || !backdropEl) return;
        closeTl?.kill();
        openTl?.kill();

        const labels = Array.from(
            linksEl.querySelectorAll<HTMLElement>('.filter-label')
        );

        openTl = gsap.timeline()
            .to(backdropEl, {
                opacity:  1,
                duration: 0.45,
                ease:     'power2.out'
            }, 0)
            .to(labels, {
                yPercent: 0,
                duration: 0.9,
                ease:     'power4.out',
                force3D:  false,
                stagger:  { each: 0.08, from: 'start' }
            }, 0.1);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * CLOSE
     * ───────────────────────────────────────────────────────────────────── */
    function playClose() {
        if (!linksEl || !backdropEl) return;
        openTl?.kill();
        closeTl?.kill();

        const labels = Array.from(
            linksEl.querySelectorAll<HTMLElement>('.filter-label')
        );

        closeTl = gsap.timeline()
            .to(labels, {
                yPercent: 140,
                duration: 0.32,
                ease:     'power4.in',
                force3D:  false,
                stagger:  { each: 0.035, from: 'end' }
            }, 0)
            .to(backdropEl, {
                opacity:  0,
                duration: 0.35,
                ease:     'power2.in'
            }, 0.08);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * REACTIVE EFFECT
     * isOpen is read first so Svelte tracks it as a dependency even on the
     * first run (where we only set the hidden initial positions and return).
     * ───────────────────────────────────────────────────────────────────── */
    $effect(() => {
        if (!linksEl || !backdropEl) return;
        const open = isOpen;

        const labels = Array.from(
            linksEl.querySelectorAll<HTMLElement>('.filter-label')
        );

        if (!initialized) {
            gsap.set(backdropEl, { opacity: 0 });
            gsap.set(labels, { yPercent: 140 });
            /* Labels are now below the overflow:hidden clip — safe to reveal the
               container. CSS visibility:hidden stays until this inline override. */
            linksEl.style.visibility = 'visible';
            initialized = true;
            return;
        }

        if (open) playOpen();
        else      playClose();

        return () => { openTl?.kill(); closeTl?.kill(); };
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
    class="filter-panel"
    class:is-open={isOpen}
    onclick={() => { if (isOpen) isOpen = false; }}
    role="presentation"
>
    <div class="filter-panel__backdrop" bind:this={backdropEl}></div>

    <!-- stopPropagation prevents the backdrop onclick from firing when clicking within the content column -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="filter-panel__content" onclick={(e) => e.stopPropagation()}>

        <div
            class="filter-panel__links"
            bind:this={linksEl}
            aria-hidden={!isOpen || undefined}
        >
            {#each categorie as cat}
                <!--
                  overflow:hidden is the mask that makes labels appear to emerge
                  from beneath each row instead of fading in mid-air.
                  Mirrors .sm-panel-itemWrap from the ReactBits StaggeredMenu.
                -->
                <div class="filter-item-wrap">
                    <FilterLabel
                        active={activeFilters.includes(cat.id)}
                        disabled={filtersFull && !activeFilters.includes(cat.id)}
                        onclick={() => selezionaCategoria(cat.id)}
                    >
                        {@html cat.label}
                    </FilterLabel>
                </div>
            {/each}
        </div>

        <div class="filter-panel__trigger">
            {#if selectedCategorie.length > 0 && !isOpen}
                <div class="filter-chips">
                    {#each selectedCategorie as cat (cat.id)}
                        <button
                            type="button"
                            class="filter-chip"
                            aria-label={`Rimuovi filtro ${chipName(cat.label)}`}
                            onclick={() => removeFilter(cat.id)}
                        >
                            <span class="filter-chip__label">{chipName(cat.label)}</span>
                            <span class="filter-chip__x"><Icon name="x" /></span>
                        </button>
                    {/each}
                </div>
            {/if}

            <FiltraPerCategoriaButton
                variant={bottoneVariant}
                badge={activeFilters.length}
                onclick={togglePanel}
            />
        </div>

    </div>
</div>

<style>
    /* ── Shell ─────────────────────────────────────────────────────────
       Sibling of gallery-page → root stacking context.
       z-index:200 puts it above the navbar (z-index:40 in base.css).   */
    .filter-panel {
        position: fixed;
        inset: 0;
        z-index: 200;
        box-sizing: border-box;
        pointer-events: none;

        /*
         * Scale category text so the filter occupies the same visual footprint
         * as on the 16-inch reference (1728 × 1117 px).
         * 32px ÷ 1728px = 1.852vw → at 1728px this resolves to exactly 32px.
         * On smaller desktops it shrinks proportionally; 20px is the floor.
         * Mobile (< 600px) uses --ts-nav-link-size in FilterLabel.svelte,
         * so this override only affects desktop.
         */
        --ts-cat-size: clamp(20px, 1.852vw, 32px);
    }

    .filter-panel.is-open {
        /* Clicking anywhere outside the content column closes the panel. */
        pointer-events: auto;
    }

    /* ── Backdrop ──────────────────────────────────────────────────────
       Figma gradient: solid at right edge, fully transparent at left.
       GSAP drives clip-path to create the panel wipe animation.         */
    .filter-panel__backdrop {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            to left,
            var(--color-background-primary)     0%,
            var(--color-background-transparent) 100%
        );
        opacity: 0;
        pointer-events: none;
    }

    /* ── Content column ────────────────────────────────────────────────
       position:relative so it stacks above the backdrop.                */
    .filter-panel__content {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
        padding-top:    calc(var(--navbar-height) + var(--spacing-5));
        padding-right:  var(--spacing-11);
        padding-bottom: var(--spacing-8);
        box-sizing: border-box;
    }

    /* ── Category links ────────────────────────────────────────────────
       No CSS transitions — GSAP owns every entrance/exit frame.         */
    .filter-panel__links {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: clamp(var(--spacing-3), 4vh, var(--spacing-8));
        width: 100%;
        margin-bottom: clamp(var(--spacing-7), 6vh, var(--spacing-11));
        pointer-events: none;
        /* Hidden from first paint until GSAP parks labels below the clip.
           JS sets visibility:visible inline after gsap.set() runs. */
        visibility: hidden;
    }

    .filter-panel.is-open .filter-panel__links {
        pointer-events: auto;
    }

    /* ── Per-item clip mask ────────────────────────────────────────────
       overflow:hidden clips each label so the yPercent slide-up makes
       it appear to emerge from beneath the row (ReactBits pattern).     */
    .filter-item-wrap {
        overflow: hidden;
        line-height: 1;
    }

    /* ── Trigger button ────────────────────────────────────────────────
       pointer-events:auto always — button must work even when the
       panel is closed (parent has pointer-events:none).                 */
    .filter-panel__trigger {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--spacing-3);
        width: 100%;
        box-sizing: border-box;
        pointer-events: auto;

        /* Reserve the bottom-left zone occupied by the fixed FOTO/NOMI toggle
           (.toggle → left: --spacing-11, ~188px wide) plus a gap, so the chip
           row can never slide under or collide with it. Chips are right-aligned
           and wrap, so overflow stacks upward into free space instead. */
        padding-left: calc(var(--spacing-11) + var(--unit-200) + var(--spacing-6));
    }

    /* ── Selected-filter chips ─────────────────────────────────────────
       Sit to the left of the trigger button. Same height / radius / border
       as .filtra-button so they read as one family; wrap onto multiple rows
       when several categories are active. */
    .filter-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: var(--spacing-2);
        min-width: 0;
    }

    .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        height: var(--spacing-9);
        padding: var(--spacing-3) var(--spacing-4-2);
        box-sizing: border-box;
        /* Never let one long-labelled chip exceed the reserved chip area and
           reach the toggle: cap it to the container and ellipsise the label. */
        max-width: 100%;
        min-width: 0;
        border-radius: var(--radius-rounded-pill);
        border: var(--stroke-1) solid var(--color-content-accent);
        background-color: var(--color-background-primary);
        color: var(--color-content-body);
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 200ms ease, color 200ms ease;
    }

    .filter-chip__label {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        font-family: var(--font-display);
        /* Match the filter button label exactly (ButtonLabel → --ts-nav-link). */
        font-size: var(--ts-nav-link-size, 24px);
        font-weight: var(--ts-nav-link-weight, 500);
        letter-spacing: var(--ts-nav-link-letter-spacing, 0em);
        text-transform: uppercase;

        /* Same optical-centering trick as ButtonLabel / .filtra-button-label:
           trim the line box to the cap height so the glyphs sit dead-centre. */
        text-box-trim: both;
        text-box-edge: cap alphabetic;
        line-height: 1;
        transform: translateY(0.3px);
    }

    /* Keep the × from being squeezed when the label ellipsises. */
    .filter-chip__x { flex: 0 0 auto; }

    .filter-chip__x {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        line-height: 1;
    }

    @media (hover: hover) {
        .filter-chip:hover {
            background-color: var(--color-content-accent);
            color: var(--color-content-body-black);
        }
    }

    .filter-chip:active {
        opacity: 0.85;
    }

    /* ── Tablet ─────────────────────────────────────────────────────── */
    @media (max-width: 1024px) {
        .filter-panel__content {
            padding-right: var(--spacing-8);
        }
    }

    /* ── Mobile (< 600px) ───────────────────────────────────────────── */
    @media (max-width: 599px) {
        .filter-panel__backdrop {
            /* Nearly opaque on the left on narrow screens so text
               stays readable across the full width of the viewport */
            background: linear-gradient(
                to left,
                var(--color-background-primary) 0%,
                var(--primitive-black-alpha-15)  100%
            );
        }

        .filter-panel__content {
            padding-right:  var(--spacing-5);
            padding-bottom: var(--spacing-6-2);
            padding-top:    calc(var(--navbar-height) + var(--spacing-4));
        }

        /* The trigger collapses to a 50px icon here — chips would overflow the
           narrow viewport, so the count badge alone conveys the selection. */
        .filter-chips {
            display: none;
        }

        /* No chips on mobile, so drop the toggle safe-area reservation. */
        .filter-panel__trigger {
            padding-left: 0;
        }

        .filter-panel__links {
            gap:           clamp(var(--spacing-2), 3.5vh, var(--spacing-6));
            margin-bottom: clamp(var(--spacing-6), 5vh,   var(--spacing-9));
        }
    }

    /* ── Very short viewports ───────────────────────────────────────── */
    @media (max-height: 620px) {
        .filter-panel__links {
            gap:           clamp(var(--spacing-2), 2vh, var(--spacing-4));
            margin-bottom: clamp(var(--spacing-5), 4vh, var(--spacing-7));
        }
    }
</style>
