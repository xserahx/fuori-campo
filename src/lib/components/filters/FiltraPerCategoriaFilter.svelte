<script lang="ts">
    import FilterLabel from './FilterLabel.svelte';
    // Verifica che questo percorso rispecchi la tua cartella
    import FiltraPerCategoriaButton from '../buttons/FiltraPerCategoriaButton.svelte';

    const categorie = [
        { id: 'servizi', label: 'AREA ORGANIZZATIVA <br /> E SERVIZI GENERALI' },
        { id: 'revenue', label: 'CERIMONIE <br /> E REVENUE' },
        { id: 'experience', label: 'GESTIONE OPERATIVA <br /> E FAN EXPERIENCE' },
        { id: 'territorio', label: 'LOGISTICA <br /> E TERRITORIO' },
        { id: 'comunicazione', label: 'RELAZIONI <br /> E COMUNICAZIONE' },
        { id: 'sport', label: 'SPORT <br /> E DISCIPLINE' }
    ];

    let isOpen = $state(false); 
    let filtroAttivo = $state<string | null>(null); 

    const bottoneVariant = $derived.by(() => {
        if (isOpen) return 'close-x';
        if (filtroAttivo !== null) return 'filter-selected';
        return 'default';
    });

    function gestisciClickBottone() {
        isOpen = !isOpen;
    }

    function selezionaCategoria(id: string) {
        filtroAttivo = filtroAttivo === id ? null : id;
    }
</script>

<div class="filter-panel" class:is-open={isOpen}>
    <div class="filter-panel__wrapper">
        
        <!-- Lista dei 6 link -->
        <div class="filter-panel__links">
            {#each categorie as cat}
                <FilterLabel 
                    active={filtroAttivo === cat.id} 
                    onclick={() => selezionaCategoria(cat.id)}
                >
                    {@html cat.label}
                </FilterLabel>
            {/each}
        </div>

        <!-- Zona di attivazione del bottone -->
        <div class="filter-panel__button-trigger">
            <FiltraPerCategoriaButton 
                variant={bottoneVariant} 
                onclick={gestisciClickBottone}
            />
        </div>

    </div>
</div>

<style>
    .filter-panel {
        position: fixed;
        bottom: 0;
        right: 0;
        width: 1000px;
        height: 100vh;
        
        /* ── INNALZAMENTO MASSIMO DELLO Z-INDEX ── */
        z-index: 99999; 
        
        box-sizing: border-box;
        background-color: transparent;
        pointer-events: none; 
        transition: background-color 350ms cubic-bezier(0.25, 1, 0.5, 1);
    }

    .filter-panel.is-open {
        background-color: var(--color-background-primary);
        pointer-events: auto;
    }

    .filter-panel__wrapper {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end; 
        align-items: flex-end;     
        padding-bottom: var(--spacing-8);
        padding-right: var(--spacing-11);
        box-sizing: border-box;
    }

    .filter-panel__links {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-7);
        width: 100%;
        margin-bottom: var(--spacing-12); 
        
        /* Gestione comparsa e azzeramento ingombro */
        opacity: 0;
        visibility: hidden;
        height: 0;          
        overflow: hidden;   
        transform: translateY(20px);
        pointer-events: none;
        
        transition: 
            opacity 300ms cubic-bezier(0.25, 1, 0.5, 1),
            height 320ms cubic-bezier(0.25, 1, 0.5, 1),
            visibility 300ms ease,
            transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
    }

    .filter-panel.is-open .filter-panel__links {
        opacity: 1;
        visibility: visible;
        height: auto; 
        overflow: visible;
        transform: translateY(0);
        pointer-events: auto;
    }

    .filter-panel__button-trigger {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        height: 60px; 
        
        /* ── TRUCCO PER PULIZIA CODICE ── */
        /* Dice al browser che l'area del bottone deve intercettare i click 
           anche se l'intero pannello ha pointer-events: none */
        pointer-events: auto; 
    }

    /* ── RESPONSIVE MOBILE (< 600PX) ── */
    @media (max-width: 599px) {
        .filter-panel {
            width: 100% !important;
        }

        .filter-panel__button-trigger {
            height: 50px; 
        }
    }
</style>