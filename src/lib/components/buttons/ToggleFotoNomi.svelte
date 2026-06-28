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
    <!-- 1. LA PILLOLA MOBILE (Il finto bottone con il solo bordo giallo) -->
    <div class="toggle-pill" class:is-right={view === 'names'}></div>

    <!-- 2. I TESTI CLICCABILI -->
    <button
        class="toggle-option"
        type="button"
        class:is-active={view === 'photos'}
        onclick={() => setToggle('photos')}
    >
        <ButtonLabel>FOTO</ButtonLabel>
    </button>

    <button
        class="toggle-option"
        type="button"
        class:is-active={view === 'names'}
        onclick={() => setToggle('names')}
    >
        <ButtonLabel>NOMI</ButtonLabel>
    </button>
</div>

<style>
    .toggle-container {
        position: relative;
        display: inline-flex;
        align-items: center;
        
        background-color: var(--color-background-primary);
        border-radius: var(--radius-rounded-pill);
        
        height: var(--spacing-9);
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
        
        color: var(--color-content-body);
        transition: color 150ms ease;
    }

    /* Modifichiamo il cursore per far capire visivamente che l'elemento attivo non è cliccabile */
    .toggle-option.is-active {
        color: var(--color-content-body);
        cursor: default; 
    }

    /* ── HOVER SELETTIVO ── */
    /* L'effetto hover (testo giallo) si attiva SOLO se il bottone NON ha la classe .is-active */
    @media (hover: hover) {
        .toggle-option:not(.is-active):hover {
            color: var(--color-content-accent);
        }
    }
</style>