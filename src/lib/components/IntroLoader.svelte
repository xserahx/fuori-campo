<script lang="ts">
  let {
    showIntro = true,
    introExiting = false,
    loaderPhotoSrc = "",
    loaderBlockLayouts = [],
    activeLoaderSet = 0,
    loaderProgress = 0,
  } = $props<{
    showIntro?: boolean;
    introExiting?: boolean;
    loaderPhotoSrc?: string;
    loaderBlockLayouts?: Array<
      { left: number; top: number; width: number; height: number }[]
    >;
    activeLoaderSet?: number;
    loaderProgress?: number;
  }>();
</script>

{#if showIntro}
  <div class={`intro-loader${introExiting ? " intro-loader--exit" : ""}`}>
    
    <!-- FOTO AL CENTRO -->
    <div class="intro-loader__stage">
      <img class="intro-loader__photo" src={loaderPhotoSrc} alt="" />

      <!-- BLOCCHI CHE COPRONO LA FOTO -->
      {#each loaderBlockLayouts[activeLoaderSet] as block}
        <div
          class="intro-loader__block"
          style="
            left: {block.left}%;
            top: {block.top}%;
            width: {block.width}%;
            height: {block.height}%;
          "
        ></div>
      {/each}
    </div>

    <!-- PERCENTUALE -->
    <p class="intro-loader__percent">{Math.round(loaderProgress)}%</p>
  </div>
{/if}

<style>
  .intro-loader {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    background: var(--color-background-primary);
    opacity: 1;
    transform: scale(1);
    transition: opacity 0.6s ease, transform 0.6s ease;
    pointer-events: none;
    overflow: hidden;
  }

  .intro-loader--exit {
    opacity: 0;
    transform: scale(0.985);
  }

  .intro-loader__stage {
    position: relative;
    width: min(48vw, 588px);
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 20px;
    background: var(--color-background-primary);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }

  .intro-loader__photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .intro-loader__block {
    position: absolute;
    background: var(--color-background-primary);
    z-index: 1;
    transition:
      left 0.95s cubic-bezier(0.16, 1, 0.3, 1),
      top 0.95s cubic-bezier(0.16, 1, 0.3, 1),
      width 0.95s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.95s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .intro-loader__percent {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(22px, 2.8vw, 34px);
    line-height: 1;
    letter-spacing: 0.04em;
    color: var(--color-content-body);
  }
</style>
