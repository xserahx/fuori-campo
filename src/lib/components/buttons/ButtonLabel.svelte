<!-- Regola i comportamento del testo dentro ai bottoni -->
 
<script lang="ts">
    import type { Snippet } from 'svelte';
    
    let { children } = $props<{ children: Snippet }>();
</script>

<span class="button-label">
    {@render children()}
</span>

<style>
    .button-label {
        display: inline-flex;
        align-items: center;
        
        /* ── TIPOGRAFIA DESKTOP ── */
        font-size: var(--ts-nav-link-size, 24px);
        font-weight: var(--ts-nav-link-weight, 500);
        line-height: var(--ts-nav-link-line-height, 26px);
        letter-spacing: var(--ts-nav-link-letter-spacing, 0em);
        
        /* Eredita il colore dal bottone padre (così quando il bottone fa l'hover, anche il testo cambia) */
        color: inherit; 
        transition: color 150ms ease;
    }

    /* ── TIPOGRAFIA MOBILE ── */
    @media (max-width: 599px) {
        .button-label {
            font-size: var(--ts-navigation-size, 16px);
            font-weight: var(--ts-navigation-weight, 700);
            line-height: var(--ts-navigation-line-height, 19.2px);
            letter-spacing: var(--ts-navigation-letter-spacing, 0em);
        }
    }
</style>