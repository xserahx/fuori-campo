<!-- Round icon control used across the gallery / zoom view: zoom-in (+),
     zoom-out (−) and close (×). One component, picked via `variant`. -->

<!-- The component takes the following props:
     - `variant`: one of 'zoom-in', 'zoom-out' or 'close'. Default is 'close'.
     - `href`: optional. If provided, renders an `<a>` instead of a `<button>`.
     - `onclick`: optional. Click handler.
     - `ariaLabel`: optional. If not provided, defaults to a label based on the variant.
     - `target` and `rel`: optional. Only used if `href` is provided.
     - `disabled`: optional. Only used if rendering a `<button>`.
     - `type`: optional. Only used if rendering a `<button>`. Default is 'button'. -->

<script lang="ts">
  import Icon from "./Icon.svelte";

  type Variant = "zoom-in" | "zoom-out" | "close";

  const ICONS: Record<Variant, string> = {
    "zoom-in": "plus",
    "zoom-out": "minus",
    close: "x",
  };
  const LABELS: Record<Variant, string> = {
    "zoom-in": "Aumenta zoom",
    "zoom-out": "Riduci zoom",
    close: "Chiudi",
  };

  let {
    variant = "close",
    href,
    onclick,
    ariaLabel,
    target,
    rel,
    disabled = false,
    type = "button",
  } = $props<{
    variant?: Variant;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    ariaLabel?: string;
    target?: "_blank" | "_self" | "_parent" | "_top" | (string & {});
    rel?: string;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>();

  const icon = $derived(ICONS[variant as Variant] ?? "x");
  const label = $derived(ariaLabel ?? LABELS[variant as Variant] ?? "Chiudi");
</script>

{#if href}
  <a class="x-button" {href} aria-label={label} {onclick} {target} {rel}>
    <span class="x-icon-wrapper"><Icon name={icon} /></span>
  </a>
{:else}
  <button class="x-button" {type} aria-label={label} {onclick} {disabled}>
    <span class="x-icon-wrapper"><Icon name={icon} /></span>
  </button>
{/if}

<style>
  .x-button {
    width: var(--spacing-9); /*60px*/
    height: var(--spacing-9);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: var(--stroke-1) solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill);
    background: var(--color-background-primary);
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

  @media (max-width: 700px) {
    .x-button {
      padding: var(--spacing-4);
      height: 50px;
      width: 50px;
      border: var(--stroke-mobile) solid var(--color-content-accent);
    }
  }
</style>
