<!-- Icon component for rendering Phosphor Icons -->

<!-- The component takes two props: `name` (the name of the icon) 
 and `variant` (the style of the icon, either "regular" or "fill"). -->

<script>
  const { name, variant = "regular" } = $props();

  let pack = $derived.by(() => {
    switch (variant) {
      case "regular":
        return "ph";
      case "fill":
        return "ph-fill";
      default:
        return "ph";
    }
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css"
  />

  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css"
  />
</svelte:head>

<i class="{pack} ph-{name}"></i>
