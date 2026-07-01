<!-- Bottone da usare nella pagina di dettaglio delle categorie (in alto a sinistra) 
 e nella pagina del singolo volontario-->

<script lang="ts">
    import Icon from './Icon.svelte';
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

    const computedAriaLabel = $derived(ariaLabel ?? 'Indietro');
</script>

{#snippet content()}
    <span class="back-button__icon" aria-hidden="true">
        <Icon name="ph ph-plus" />
    </span>
    <ButtonLabel>ESPLORA FOTO</ButtonLabel> 
{/snippet}

{#if href}
    <a class="back-button" href={href} aria-label={computedAriaLabel} onclick={onclick} target={target} rel={rel}>
        {@render content()}
    </a>
{:else}
    <button class="back-button" type={type} aria-label={computedAriaLabel} onclick={onclick}>
        {@render content()}
    </button>
{/if}

<style>
    .back-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-3);
        height: var(--spacing-9);
        padding: var(--spacing-3);
        padding-right: var(--spacing-4-2);
        border: var(--stroke-1) solid var(--color-content-accent);
        border-radius: var(--radius-rounded-pill);
        background: var(--color-background-primary);
        color: var(--color-content-body);
        text-decoration: none;
        cursor: pointer;
        box-sizing: border-box;
        transition: color 150ms ease;
    }

    .back-button__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        font-size: 30px;
        line-height: 1;
        transition: color 150ms ease;
    }

    @media (hover: hover) {
        .back-button:hover {
            color: var(--color-content-accent);
        }
    }

    .back-button:active {
        color: var(--color-content-accent);
    }

    @media (max-width: 599px) {
        .back-button {
            padding: var(--spacing-4);
            padding-right: var(--spacing-4-2);
            height: 50px;
        }
    }
</style>