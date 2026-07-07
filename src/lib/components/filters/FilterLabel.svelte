<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    onclick,
    active = false, // Prop booleana per attivare lo stato selezionato
    disabled = false, // Disattivato quando si è raggiunto il limite di filtri
  } = $props<{
    children: Snippet;
    onclick?: (event: MouseEvent) => void;
    active?: boolean;
    disabled?: boolean;
  }>();
</script>

<button
  type="button"
  class="filter-label"
  class:is-active={active}
  class:is-disabled={disabled}
  {disabled}
  {onclick}
>
  {@render children()}
</button>

<style>
  .filter-label {
    /* Bottone solo testo cliccabile */
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    display: block;
    will-change: transform;

    width: 100%;
    text-align: right;
    text-transform: uppercase;

    font-family: var(--font-display);
    font-size: var(--ts-cat-size, 32px);
    font-weight: var(--ts-cat-weight, 500);
    line-height: var(--ts-cat-line-height, 100%);
    letter-spacing: var(--ts-cat-letter-spacing, 4%);

    /* ── DEFAULT ── */
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
  /* Quando active è true, il colore fisso è l'accent  */
  .filter-label.is-active {
    color: var(--color-content-accent);
  }

  .filter-label:active {
    color: var(--color-content-accent);
  }

  /* ── STATO DISABILITATO (limite filtri raggiunto: 2 IMPOSTATI ADESSO PER EVITARE SOVRAPPOSIZIONI IN VERTICALE) ── */
  .filter-label.is-disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  @media (hover: hover) {
    .filter-label.is-disabled:hover {
      color: var(--color-content-body);
    }
  }

  @media (max-width: 700px) {
    .filter-label {
      /* Cambiano solo le variabili tipografiche */
      font-size: var(--ts-nav-link-size, 24px);
      font-weight: var(--ts-nav-link-weight, 500);
      line-height: var(--ts-nav-link-line-height, 26px);
      letter-spacing: var(--ts-nav-link-letter-spacing, 0em);
    }
  }
</style>
