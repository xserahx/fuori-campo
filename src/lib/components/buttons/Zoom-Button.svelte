<!-- Bottone da usare nella pagina galleria quando clicchi sulla singola foto -->
 
<script lang="ts">
    import Icon from "./Icon.svelte";

    let {
        href,
        onclick,
        ariaLabel = 'Zoom',
        target,
        rel,
        disabled = false,
        type = 'button'
    } = $props<{
        href?: string;
        onclick?: (event: MouseEvent) => void;
        ariaLabel?: string;
        target?: '_blank' | '_self' | '_parent' | '_top' | (string & {});
        rel?: string;
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
    }>();
</script>

{#if href}
    <a class="x-button" {href} aria-label={ariaLabel} {onclick} {target} {rel}>
        <span class="x-icon-wrapper"><Icon name="minus" /></span>
    </a>
{:else}
    <button class="x-button" {type} aria-label={ariaLabel} {onclick} {disabled}>
        <span class="x-icon-wrapper"><Icon name="minus" /></span>
    </button>
{/if}

<style>
    .x-button {
        width: 60px;
        height: 60px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: var(--stroke-1) solid var(--color-content-accent);
        border-radius: var(--radius-rounded-pill);
        background: var(--color-background);
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        box-sizing: border-box;
        transition: color 150ms ease;
    }

    .x-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .x-icon-wrapper {
        display: inline-flex;
        font-size: 30px; 
        color: var(--color-content-body);
        transition: color 150ms ease;
    }

    /* Hover solo su desktop */
    @media (hover: hover) {
        .x-button:hover .x-icon-wrapper {
            color: var(--color-content-accent);
        }
    }

    /* Click ovunque */
    .x-button:active .x-icon-wrapper {
        color: var(--color-content-accent);
    }
</style>