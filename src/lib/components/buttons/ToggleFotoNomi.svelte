<script lang="ts">
    import ButtonLabel from './ButtonLabel.svelte';

    let {
        view = $bindable('photos'),
        onchange
    } = $props<{
        view?: 'photos' | 'names';
        onchange?: (selected: 'photos' | 'names') => void;
    }>();

    function setToggle(selected: 'photos' | 'names') {
        if (view === selected) return;
        view = selected;
        if (onchange) onchange(selected);
    }
</script>

<div class="toggle-container">
    <!-- 1. LA PILLOLA MOBILE ANIMATA -->
    <div class="toggle-pill" class:is-right={view === 'names'}></div>

    <!-- 2. I TESTI CLICCABILI -->
    <button
        class="toggle-option"
        type="button"
        class:is-active={view === 'photos'}
        onclick={() => setToggle('photos')}
    >
        <span class="toggle-text-wrapper">
            <ButtonLabel>FOTO</ButtonLabel>
        </span>
    </button>

    <button
        class="toggle-option"
        type="button"
        class:is-active={view === 'names'}
        onclick={() => setToggle('names')}
    >
        <span class="toggle-text-wrapper">
            <ButtonLabel>NOMI</ButtonLabel>
        </span>
    </button>
</div>

<style>
    .toggle-container {
        position: relative;
        display: inline-flex;
        align-items: center;
        
        background-color: var(--color-background-primary);
        border-radius: var(--radius-rounded-pill);
        
        height: 60px; /* Forza l'altezza coerente richiesta */
        padding-top: var(--spacing-3);
        padding-bottom: var(--spacing-3);
        
        padding-left: var(--spacing-4-2);
        padding-right: var(--spacing-4-2);
        gap: var(--spacing-6-2);
        
        box-sizing: border-box;
        overflow: visible;
    }

    .toggle-pill {
        position: absolute;
        top: 0;
        left: 0;
        
        width: calc(50% - (var(--spacing-6-2) / 2) + var(--spacing-4-2));
        height: 100%;
        
        border: var(--stroke-1) solid var(--color-content-accent);
        border-radius: var(--radius-rounded-pill);
        background-color: transparent;
        box-sizing: border-box;
        pointer-events: none;
        z-index: 1;
        
        transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
    }

    .toggle-pill.is-right {
        transform: translateX(calc(100% + var(--spacing-6-2) - (var(--spacing-4-2) * 2)));
    }

    .toggle-option {
        position: relative;
        z-index: 2;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 1; 
        height: 100%;
    }

    .toggle-text-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        pointer-events: none; /* Lascia che il click attraversi e venga preso dal bottone */
        color: var(--color-content-body);
        transition: color 150ms ease;
    }

    /* Gestione dello stato attivo */
    .toggle-option.is-active {
        cursor: default; 
    }

    .toggle-option.is-active .toggle-text-wrapper {
        color: var(--color-content-body); /* Mantiene il colore base */
    }

    /* HOVER SELETTIVO CORRETTO */
    /* Penetriamo nel wrapper del testo solo se il bottone padre non è attivo */
    @media (hover: hover) {
        .toggle-option:not(.is-active):hover .toggle-text-wrapper {
            color: var(--color-content-accent) !important;
        }
    }
</style>