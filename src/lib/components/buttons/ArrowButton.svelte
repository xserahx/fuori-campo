<!-- Bottone da usare nella galleria foto, nella pagine delle categorie (da una foto all'altra), 
 nella pagina delle categorie  (carosello) e nella pagina di dettaglio in relazione alla dot navigation -->
 
<script lang="ts">
    import Icon from "./Icon.svelte";

    type Direction = 'left' | 'right' | 'up' | 'down';

    let {
        direction = 'left',
        href,
        onclick,
        ariaLabel,
        target,
        rel,
        disabled = false,
        type = 'button'
    } = $props<{
        direction?: Direction;
        href?: string;
        onclick?: (event: MouseEvent) => void;
        ariaLabel?: string;
        target?: '_blank' | '_self' | '_parent' | '_top' | (string & {});
        rel?: string;
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
    }>();

    const directionConfig = $derived.by(() => {
        switch (direction) {
            case 'right': return { icon: 'caret-right', label: 'Freccia destra' };
            case 'up':    return { icon: 'caret-up',    label: 'Freccia su' };
            case 'down':  return { icon: 'caret-down',  label: 'Freccia giù' };
            case 'left':
            default:      return { icon: 'caret-left',  label: 'Freccia sinistra' };
        }
    });

    const computedAriaLabel = $derived(ariaLabel ?? directionConfig.label);
</script>

{#if href}
    <a
        class="arrow-button"
        href={href}
        aria-label={computedAriaLabel}
        onclick={onclick}
        target={target}
        rel={rel}
    >
        <span class="arrow-icon-wrapper">
            <Icon name={directionConfig.icon} />
        </span>
    </a>
{:else}
    <button
        class="arrow-button"
        type={type}
        aria-label={computedAriaLabel}
        onclick={onclick}
        disabled={disabled}
    >
        <span class="arrow-icon-wrapper">
            <Icon name={directionConfig.icon} />
        </span>
    </button>
{/if}

<style>
    .arrow-button {
        /* ── DESKTOP SIZE ── */
        width: 60px;
        height: 60px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-4);
        border: var(--stroke-1) solid var(--color-content-accent);
        border-radius: var(--radius-rounded-pill);
        background: transparent;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        box-sizing: border-box;
    }

    .arrow-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .arrow-icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 30px; 
        color: var(--color-content-body); /* Di base bianca */
        transition: color 150ms ease;
    }

    :global(.arrow-icon-wrapper i) {
        stroke-width: var(--stroke-1);
    }

    /* Questo blocco si attiva solo su computer desktop quando passi il mouse sopra il bottone */
    @media (hover: hover) {
        .arrow-button:hover .arrow-icon-wrapper {
            color: var(--color-content-accent);
        }
    }

    /* Questo si attiva sia su desktop che su mobile nell'esatto istante in cui clicchi/premi */
    .arrow-button:active .arrow-icon-wrapper {
        color: var(--color-content-accent);
    }

    /* ── RESPONSIVE MOBILE (< 600PX) ── */
    @media (max-width: 599px) {
        .arrow-button {
            width: 50px;
            height: 50px;
            padding: 0; 
        }
    }
</style>