<script lang="ts">
    import { gsap } from 'gsap';
    import FilterLabel from './FilterLabel.svelte';
    import FiltraPerCategoriaButton from '../buttons/FiltraPerCategoriaButton.svelte';

    let {
        activeFilter = $bindable(null)
    } = $props<{
        activeFilter?: string | null;
    }>();

    const categorie = [
        { id: 'organizzativa', label: 'AREA ORGANIZZATIVA<br>E SERVIZI GENERALI' },
        { id: 'cerimonie',     label: 'CERIMONIE<br>E REVENUE'                   },
        { id: 'gestione',      label: 'GESTIONE OPERATIVA<br>E FAN EXPERIENCE'   },
        { id: 'logistica',     label: 'LOGISTICA<br>E TERRITORIO'                },
        { id: 'relazioni',     label: 'RELAZIONI<br>E COMUNICAZIONE'             },
        { id: 'sport',         label: 'SPORT<br>E DISCIPLINE'                    }
    ];

    let isOpen     = $state(false);
    let linksEl    = $state<HTMLElement | null>(null);
    let backdropEl = $state<HTMLElement | null>(null);

    /* Track whether GSAP has been initialised on this instance. */
    let initialized = false;

    /* Keep references so we can kill timelines on rapid open/close. */
    let openTl:  gsap.core.Timeline | null = null;
    let closeTl: gsap.core.Timeline | null = null;

    const bottoneVariant = $derived.by(() => {
        if (isOpen)            return 'close-x';
        if (activeFilter !== null) return 'filter-selected';
        return 'default';
    });

    function togglePanel() { isOpen = !isOpen; }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) isOpen = false;
    }

    function selezionaCategoria(id: string) {
        activeFilter = activeFilter === id ? null : id;
        isOpen = false;
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
            /* First DOM mount: park everything in the hidden starting state. */
            gsap.set(backdropEl, { opacity: 0 });
            gsap.set(labels, { yPercent: 140 });
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
                        active={activeFilter === cat.id}
                        onclick={() => selezionaCategoria(cat.id)}
                    >
                        {@html cat.label}
                    </FilterLabel>
                </div>
            {/each}
        </div>

        <div class="filter-panel__trigger">
            <FiltraPerCategoriaButton
                variant={bottoneVariant}
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
        width: 100%;
        pointer-events: auto;
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
