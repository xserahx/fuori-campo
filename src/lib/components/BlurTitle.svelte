<script lang="ts">
  import { onMount } from "svelte";

  let titleWrap: HTMLElement | null = null;
  let sharpLayer: HTMLElement | null = null;

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
    if (!sharpLayer) return;
    sharpLayer.style.webkitMaskImage = 'none';
    sharpLayer.style.maskImage = 'none';

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
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  width: min(1200px, 90vw);
  max-width: 100vw;
  cursor: none;
  user-select: none;
  pointer-events: none; /* allow interactions with topbar underneath */
  background: transparent;
  box-sizing: border-box;
  z-index: 9999; /* ensure title visually sits above the topbar */
  max-height: 100vh;
  overflow: visible;
}

.title-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.02em;

  font-family: var(--font-display);
  font-size: 300px;
  line-height: 0.95;
  font-weight: 800;
  letter-spacing: -0.02em;
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
  -webkit-text-stroke-width: 10px;
  -webkit-text-stroke-color: var(--color-content-title); /* #BDFF5D */
  text-align: center;
}

.layer-sharp {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-sharp {
  pointer-events: none;
  z-index: 1;
}

.spacer {
  visibility: hidden;
}
</style>