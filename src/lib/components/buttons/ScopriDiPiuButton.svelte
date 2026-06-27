<!-- Bottone da usare nella pagina delle categorie (solo mobile)
 e nella galleria foto (versione solo desktop) quando si clicca su una foto -->
 
<script lang="ts">
    import ButtonLabel from './ButtonLabel.svelte';

    let {
        href,
        onclick,
        ariaLabel,
        target,
        rel,
        type = 'button'
    } = $props<{
        href?: string;
        onclick?: (event: MouseEvent) => void;
        ariaLabel?: string;
        target?: '_blank' | '_self' | '_parent' | '_top' | (string & {});
        rel?: string;
        type?: 'button' | 'submit' | 'reset';
    }>();

    const computedAriaLabel = $derived(ariaLabel ?? 'Scopri di più');
</script>

{#snippet content()}
    <ButtonLabel>SCOPRI DI PIÙ</ButtonLabel>
{/snippet}

{#if href}
    <a
        class="scopri-button"
        href={href}
        aria-label={computedAriaLabel}
        onclick={onclick}
        target={target}
        rel={rel}
    >
        {@render content()}
    </a>
{:else}
    <button
        class="scopri-button"
        type={type}
        aria-label={computedAriaLabel}
        onclick={onclick}
    >
        {@render content()}
    </button>
{/if}

<style>
    .scopri-button {
        /* ── CONFIGURAZIONE DESKTOP ── */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        
        /* Padding simmetrici richiesti per desktop */
        padding: var(--spacing-3) var(--spacing-4-2);
        
        border: var(--stroke-1) solid var(--color-content-accent);
        border-radius: var(--radius-rounded-pill);
        background: transparent;
        
        /* Il colore base del testo è bianco, ereditato da ButtonLabel */
        color: var(--color-content-body); 
        text-decoration: none;
        cursor: pointer;
        box-sizing: border-box;
        transition: color 150ms ease, background-color 150ms ease;
    }

    /* Hover solo su desktop (dispositivi con mouse) */
    @media (hover: hover) {
        .scopri-button:hover {
            color: var(--color-content-accent);
        }
    }

    /* Active su desktop (diventa giallo temporaneamente al click) */
    @media (hover: hover) {
        .scopri-button:active {
            color: var(--color-content-accent);
        }
    }

    /* ── CONFIGURAZIONE RESPONSIVE MOBILE (< 600PX) ── */
    @media (max-width: 599px) {
        .scopri-button {
            display: flex; 
            
            /* Si allarga al 100% dello spazio disponibile nel genitore */
            width: 100%; 
            margin: 0; /* Rimosso il margine interno dal componente! */
            
            padding: var(--spacing-4) 0; 
            background-color: var(--color-background-primary);
        }

        .scopri-button:active {
            background-color: var(--color-content-accent) !important;
            color: var(--color-content-body-black) !important;
        }
    }
</style>