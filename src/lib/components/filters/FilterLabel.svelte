<script lang="ts">
    import type { Snippet } from 'svelte';

    let { 
        children, 
        onclick, 
        active = false // Prop booleana per attivare lo stato selezionato
    } = $props<{ 
        children: Snippet; 
        onclick?: (event: MouseEvent) => void;
        active?: boolean;
    }>();
</script>

<button 
    type="button" 
    class="filter-label" 
    class:is-active={active}
    {onclick}
>
    {@render children()}
</button>

<style>
    .filter-label {
        /* Azzeriamo lo stile di default del bottone per renderlo solo testo cliccabile */
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        display: block;
        will-change: transform;
        
        /* Allineamento orizzontale a destra richiesto */
        width: 100%;
        text-align: right;
        text-transform: uppercase; /* Sempre in maiuscolo */
        
        /* ── TIPOGRAFIA DESKTOP (H3) ── */
        font-family: var(--font-display);
        font-size: var(--ts-cat-size, 32px);
        font-weight: var(--ts-cat-weight, 500);
        line-height: var(--ts-cat-line-height, 100%);
        letter-spacing: var(--ts-cat-letter-spacing, 4%);
        
        /* ── STATO DEFAULT ── */
        color: var(--color-content-body);
        transition: color 150ms ease;
    }

    /* ── STATO HOVER (Solo Desktop) ── */
    @media (hover: hover) {
        .filter-label:hover {
            color: var(--color-content-accent);
        }
    }

    /* ── STATO FILTER-LABEL-SELECTED ── */
    /* Quando active è true, il colore fisso è l'accent (giallo) */
    .filter-label.is-active {
        color: var(--color-content-accent);
    }

    /* Feedback visivo istantaneo al tocco/click (active nativo) */
    .filter-label:active {
        color: var(--color-content-accent);
    }

    /* ── RESPONSIVE MOBILE (< 600PX) ── */
    @media (max-width: 599px) {
        .filter-label {
            /* Cambiano solo le variabili tipografiche secondo le tue specifiche */
            font-size: var(--ts-nav-link-size, 24px);
            font-weight: var(--ts-nav-link-weight, 500);
            line-height: var(--ts-nav-link-line-height, 26px);
            letter-spacing: var(--ts-nav-link-letter-spacing, 0em);
        }
    }
</style>