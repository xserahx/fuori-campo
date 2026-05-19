<script lang="ts">
  import { onMount } from "svelte";

  let titleWrap: HTMLElement | null = null;
  let sharpLayer: HTMLElement | null = null;
  let blurredLayer: HTMLElement | null = null;

  const SPOT_RADIUS = 120;
  const FADE_DURATION = 600;
  const RESET_DELAY = 2200;

  interface Spot { x: number; y: number; radius: number }
  let spots: Spot[] = [];
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  let animFrame: number | null = null;

  function buildMask(): string {
    if (spots.length === 0)
      return "radial-gradient(circle 0px at 50% 50%, black 0%, transparent 0%)";
    return spots
      .map(s => `radial-gradient(circle ${s.radius}px at ${s.x}% ${s.y}%, black 0%, black 55%, transparent 100%)`)
      .join(", ");
  }

  function applyMask() {
    if (!sharpLayer || !blurredLayer) return;
    const mask = buildMask();
    sharpLayer.style.webkitMaskImage = mask;
    sharpLayer.style.maskImage = mask;

    const coverage = Math.min(spots.length / 6, 1);
    blurredLayer.style.opacity = String((0.35 * (1 - coverage * 0.7)).toFixed(3));

    animFrame = null;
  }

  function scheduleUpdate() {
    if (!animFrame) animFrame = requestAnimationFrame(applyMask);
  }

  function addSpot(xPct: number, yPct: number) {
    if (spots.some(s => Math.hypot(s.x - xPct, s.y - yPct) < 8)) return;

    const spot: Spot = { x: xPct, y: yPct, radius: 0 };
    spots = [...spots, spot];

    let start: number | null = null;
    function grow(ts: number) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 700, 1);
      spot.radius = SPOT_RADIUS * (1 - Math.pow(1 - t, 3));
      scheduleUpdate();
      if (t < 1) requestAnimationFrame(grow);
    }
    requestAnimationFrame(grow);
  }

  function doReset() {
    const snapshots = spots.map(s => ({ ...s }));
    let start: number | null = null;

    function shrink(ts: number) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / FADE_DURATION, 1);
      const ease = Math.pow(1 - t, 2);

      for (let i = 0; i < spots.length; i++)
        spots[i].radius = snapshots[i].radius * ease;

      scheduleUpdate();

      if (t < 1) requestAnimationFrame(shrink);
      else { spots = []; scheduleUpdate(); }
    }

    requestAnimationFrame(shrink);
    resetTimer = null;
  }

  function onPointerMove(e: PointerEvent) {
    if (!titleWrap) return;

    const rect = titleWrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    if (!spots.some(s => Math.hypot(s.x - x, s.y - y) < 14))
      addSpot(x, y);
  }

  function onPointerLeave() {
    resetTimer = setTimeout(doReset, RESET_DELAY);
  }

  function onPointerEnter() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function handleScroll() {
    if (!titleWrap) return;

    const rect = titleWrap.getBoundingClientRect();
    const visible = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
    );

    if (rect.height > 0 && visible / rect.height < 0.5)
      doReset();
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });
</script>

<h1
  class="title-wrap"
  bind:this={titleWrap}
  onpointermove={onPointerMove}
  onpointerleave={onPointerLeave}
  onpointerenter={onPointerEnter}
>
  <!-- BLURRED -->
  <div class="title-text layer-blurred" bind:this={blurredLayer} aria-hidden="true">
    <span class="fuori">FUORI</span><span class="campo">CAMPO</span>
  </div>

  <!-- SHARP -->
  <div class="title-text layer-sharp" bind:this={sharpLayer} aria-hidden="true">
    <span class="fuori">FUORI</span><span class="campo">CAMPO</span>
  </div>

  <!-- SPACER -->
  <div class="title-text spacer" aria-label="FUORI CAMPO">
    <span class="fuori">FUORI</span><span class="campo">CAMPO</span>
  </div>
</h1>

<style>
.title-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: auto;
  cursor: none;
  user-select: none;
  background: var(--color-background-primary);
}

.title-text {
  display: flex;
  flex-direction: column; 
  align-items: center;
  justify-content: center;
  gap: 0.05em;

  font-family: var(--font-display);
  font-size: var(--figma-title-size);        
  line-height: var(--figma-title-lineheight); 
  font-weight: 800;
  letter-spacing: -0.025em;
  text-transform: uppercase;
  white-space: nowrap;
}

.fuori {
  color: var(--color-content-title); /* #BDFF5D */
  text-align: center;
}

.campo {
  color: transparent;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: var(--color-content-title); /* #BDFF5D */
  text-align: center;
}

.layer-blurred,
.layer-sharp {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-blurred {
  filter: blur(14px);
  opacity: 0.35;
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.layer-sharp {
  pointer-events: none;
  transition:
    mask-image 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    -webkit-mask-image 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.spacer {
  visibility: hidden;
}
</style>