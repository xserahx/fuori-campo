<script lang="ts">
    import ButtonLabel from '../buttons/ButtonLabel.svelte';
    import Icon from '../buttons/Icon.svelte';

    type ButtonVariant = 'default' | 'filter-selected' | 'close-x';

    let {
        variant = 'default',
        onclick,
        ariaLabel
    } = $props<{
        variant?: ButtonVariant;
        onclick?: (event: MouseEvent) => void;
        ariaLabel?: string;
    }>();

    const computedAriaLabel = $derived(
        ariaLabel ?? (variant === 'close-x' ? 'Chiudi menu filtri' : variant === 'filter-selected' ? 'Filtro applicato. Cambia categoria' : 'Filtra per categoria')
    );
</script>

<button
    class="filtra-button"
    class:is-default={variant === 'default'}
    class:is-selected={variant === 'filter-selected'}
    class:is-x={variant === 'close-x'}
    type="button"
    aria-label={computedAriaLabel}
    onclick={onclick}
>
    <div class="filtra-button__content">
        <span class="desktop-only">
            {#if variant === 'close-x'}
                <span class="filtra-button__icon"><Icon name="x" /></span>
            {:else}
                <ButtonLabel>FILTRA PER CATEGORIA</ButtonLabel>
            {/if}
        </span>

        <span class="mobile-only">
            <span class="filtra-button__icon">
                <Icon name={variant === 'close-x' ? 'x' : 'faders-horizontal'} />
            </span>
        </span>
    </div>
</button>

<style>
    .desktop-only { display: inline-flex; }
    .mobile-only { display: none; }

    .filtra-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 60px;
        border-radius: var(--radius-rounded-pill);
        box-sizing: border-box;
        cursor: pointer;
        background-color: var(--color-background-primary);
        border: var(--stroke-1) solid var(--color-content-accent);
        
        /* Animazione fluida nativa */
        transition: 
            width 300ms cubic-bezier(0.25, 1, 0.5, 1),
            padding 300ms cubic-bezier(0.25, 1, 0.5, 1),
            background-color 200ms ease,
            color 200ms ease;
    }

    .filtra-button__content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
    }

    .filtra-button__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        line-height: 1;
    }

    /* ── STATI DESKTOP ── */
    .filtra-button.is-default {
        padding: var(--spacing-3) var(--spacing-4-2);
        color: var(--color-content-body);
    }

    @media (hover: hover) {
        .filtra-button.is-default:hover {
            color: var(--color-content-accent);
        }
    }

    .filtra-button.is-selected {
        padding: var(--spacing-3) var(--spacing-4-2);
        background-color: var(--color-content-accent);
        color: var(--color-content-body-black);
    }
    
    .filtra-button.is-selected :global(.button-label) {
        color: var(--color-content-body-black) !important;
    }

    .filtra-button.is-x {
        width: 60px;
        padding: 0;
        background-color: var(--color-content-accent);
        color: var(--color-content-body-black);
    }

    /* ── RESPONSIVE MOBILE (< 600PX) ── */
    @media (max-width: 599px) {
        .desktop-only { display: none; }
        .mobile-only { display: inline-flex; }

        .filtra-button {
            width: 50px !important;
            height: 50px !important;
            padding: 0 !important;
        }

        .filtra-button__icon {
            font-size: 24px;
        }

        .filtra-button.is-default {
            color: var(--color-content-body);
        }

        .filtra-button.is-selected,
        .filtra-button.is-x {
            background-color: var(--color-content-accent);
            color: var(--color-content-body-black);
        }

        .filtra-button:active {
            opacity: 0.8;
        }
    }
</style>