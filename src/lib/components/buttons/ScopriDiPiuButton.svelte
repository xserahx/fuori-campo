<!-- Bottone da usare nella pagina delle categorie (solo mobile) per accedere alle pagine di dettaglio delle categorie 
 e nell'about per accedere alle pagine dei membri del team che erano volontari-->

<script lang="ts">
  import ButtonLabel from "./ButtonLabel.svelte";

  let {
    href,
    onclick,
    onpointerdown,
    class: className = "",
    ariaLabel,
    target,
    rel,
    type = "button",
    dark = false,
  } = $props<{
    href?: string;
    onclick?: (event: MouseEvent) => void;
    onpointerdown?: (event: PointerEvent) => void;
    class?: string;
    ariaLabel?: string;
    target?: "_blank" | "_self" | "_parent" | "_top" | (string & {});
    rel?: string;
    type?: "button" | "submit" | "reset";
    dark?: boolean;
  }>();

  const computedAriaLabel = $derived(ariaLabel ?? "Scopri di più");
</script>

{#snippet content()}
  <ButtonLabel>SCOPRI DI PIÙ</ButtonLabel>
{/snippet}

{#if href}
  <a
    class={`scopri-button ${className}`}
    class:scopri-button--dark={dark}
    {href}
    aria-label={computedAriaLabel}
    {onpointerdown}
    {onclick}
    {target}
    {rel}
  >
    {@render content()}
  </a>
{:else}
  <button
    class={`scopri-button ${className}`}
    class:scopri-button--dark={dark}
    {type}
    aria-label={computedAriaLabel}
    {onpointerdown}
    {onclick}
  >
    {@render content()}
  </button>
{/if}

<style>
  .scopri-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    height: var(--spacing-9);
    padding: var(--spacing-3) var(--spacing-4-2);

    border: var(--stroke-1) solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill);
    background: var(--color-background-primary);

    /* Il colore base del testo è bianco, ereditato da ButtonLabel */
    color: var(--color-content-body);
    text-decoration: none;
    cursor: pointer;
    box-sizing: border-box;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }

  /* Hover solo su desktop (dispositivi con mouse) */
  @media (hover: hover) {
    .scopri-button:hover {
      color: var(--color-content-accent);
    }
  }

  /* Active su desktop */
  @media (hover: hover) {
    .scopri-button:active {
      color: var(--color-content-accent);
    }
  }

  /* Dark variant — dark fill + green border pill (used on-card in about/carousel) */
  .scopri-button--dark {
    background: var(--color-background-primary, #0e0e0e);
    padding: var(--spacing-3, 12px) var(--spacing-5, 20px);
  }

  @media (hover: hover) {
    .scopri-button--dark:hover {
      background: var(--color-content-accent);
      color: var(--color-content-body-black, #0e0e0e);
    }
  }

  @media (max-width: 700px) {
    .scopri-button {
      display: flex;

      /* Si allarga al 100% dello spazio disponibile nel genitore */
      width: 100%;
      margin: 0;

      height: 50px;
      padding: var(--spacing-4) 0;
      background-color: var(--color-background-primary);
      border: var(--stroke-mobile) solid var(--color-content-accent);
    }

    .scopri-button:active {
      background-color: var(--color-content-accent) !important;
      color: var(--color-content-body-black) !important;
    }

    /* Dark variant on mobile: full-width (fills wrapper)*/
    .scopri-button--dark {
      height: auto;
      border: var(--stroke-mobile) solid var(--color-content-accent);
    }
  }
</style>
