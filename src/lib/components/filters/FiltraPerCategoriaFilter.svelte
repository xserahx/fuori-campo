<script lang="ts">
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

    let isOpen = $state(false);

    const bottoneVariant = $derived.by(() => {
        if (isOpen) return 'close-x';
        if (activeFilter !== null) return 'filter-selected';
        return 'default';
    });

    function togglePanel() {
        isOpen = !isOpen;
    }

    function selezionaCategoria(id: string) {
        activeFilter = activeFilter === id ? null : id;
        isOpen = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
    class="filter-panel"
    class:is-open={isOpen}
    onclick={() => { if (isOpen) isOpen = false; }}
    role="presentation"
>
    <div class="filter-panel__content" onclick={(e) => e.stopPropagation()}>

        <div class="filter-panel__links" aria-hidden={!isOpen || undefined}>
            {#each categorie as cat}
                <FilterLabel
                    active={activeFilter === cat.id}
                    onclick={() => selezionaCategoria(cat.id)}
                >
                    {@html cat.label}
                </FilterLabel>
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
    /* ── Shell: full viewport, above EVERYTHING including the navbar ─── */
    /* Must be a sibling of gallery-page (not a child) so it lives in the
       root stacking context. z-index:200 > navbar (z-index:40 in base.css). */
    .filter-panel {
        position: fixed;
        inset: 0;           /* 100vw × 100vh full viewport coverage        */
        z-index: 200;       /* above navbar (40) and gallery content        */
        box-sizing: border-box;
        background: transparent;
        pointer-events: none;
        transition: background var(--dur-mid) var(--ease-cinema);
    }

    /* When open: Figma gradient — solid background-primary on the right,
       fading to fully transparent on the left, full viewport width. */
    .filter-panel.is-open {
        background: linear-gradient(
            to left,
            var(--color-background-primary)    0%,
            var(--color-background-transparent) 100%
        );
        pointer-events: auto;
    }

    /* ── Content column — right-aligned, bottom-anchored ────────────── */
    .filter-panel__content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
        /* Top clearance so categories never hide under the fixed navbar */
        padding-top: calc(var(--navbar-height) + var(--spacing-5));
        padding-right: var(--spacing-11);
        padding-bottom: var(--spacing-8);
        box-sizing: border-box;
    }

    /* ── Category links ─────────────────────────────────────────────── */
    .filter-panel__links {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        /* Height-adaptive gap: roomy on tall screens, compact on short ones */
        gap: clamp(var(--spacing-3), 4vh, var(--spacing-8));
        width: 100%;
        /* Space between last category and the trigger button */
        margin-bottom: clamp(var(--spacing-7), 6vh, var(--spacing-11));

        /* Hidden state */
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transform: translateX(var(--spacing-6-2));
        pointer-events: none;

        transition:
            max-height var(--dur-mid)  var(--ease-cinema),
            opacity    var(--dur-fast) var(--ease-cinema),
            transform  var(--dur-mid)  var(--ease-cinema);
    }

    .filter-panel.is-open .filter-panel__links {
        /* large enough to fit all six categories at any font size */
        max-height: 1200px;
        overflow: visible;
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
    }

    /* ── Trigger button ─────────────────────────────────────────────── */
    .filter-panel__trigger {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        /* Always intercept clicks so the button works even when panel is closed */
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
        .filter-panel.is-open {
            /* Same Figma gradient; left stop is semi-opaque on narrow screens
               so category text stays readable across the full width */
            background: linear-gradient(
                to left,
                var(--color-background-primary) 0%,
                var(--primitive-black-alpha-15)  100%
            );
        }

        .filter-panel__content {
            padding-right: var(--spacing-5);
            padding-bottom: var(--spacing-6-2);
            /* Mobile navbar is shorter */
            padding-top: calc(var(--navbar-height) + var(--spacing-4));
        }

        .filter-panel__links {
            gap: clamp(var(--spacing-2), 3.5vh, var(--spacing-6));
            margin-bottom: clamp(var(--spacing-6), 5vh, var(--spacing-9));
        }
    }

    /* ── Very short viewports ───────────────────────────────────────── */
    @media (max-height: 620px) {
        .filter-panel__links {
            gap: clamp(var(--spacing-2), 2vh, var(--spacing-4));
            margin-bottom: clamp(var(--spacing-5), 4vh, var(--spacing-7));
        }
    }
</style>
