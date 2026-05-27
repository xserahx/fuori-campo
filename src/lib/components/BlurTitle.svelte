<script lang="ts">
  import { onMount } from "svelte";

  let titleWrap:   HTMLElement | null = null;
  let layerBlur:   HTMLElement | null = null;
  let animId:      number | null = null;

  const rng = (a: number, b: number) => a + Math.random() * (b - a);

  function sNoise(x: number, y: number, t: number): number {
    return (
      Math.sin(x*1.7 + t*0.7) * Math.cos(y*1.3 - t*0.5) +
      Math.sin(x*0.8 - y*1.1 + t*0.4) * 0.5
    ) / 1.5;
  }

  class Blob {
    ox: number; oy: number;
    x:  number; y:  number;
    baseR: number; r: number;
    ph: number;
    dA: number; dF: number;
    bA: number; bF: number;
    aB: number; aPh: number; aF: number; al: number;
    sX: number; sY: number;
    rot: number; rS: number;

    constructor(i: number, total: number) {
      const ring = Math.floor(i / 4);
      const slot = i % 4;
      const ang  = (slot / 4) * Math.PI * 2 + rng(-0.4, 0.4) + ring * 0.5;
      const d    = ring === 0 ? rng(0.0, 0.10) : rng(0.10, 0.28);
      this.ox = 0.5 + Math.cos(ang) * d;
      this.oy = 0.5 + Math.sin(ang) * d * 0.48;
      this.x = this.ox; this.y = this.oy;
      this.baseR = ring === 0 ? rng(130, 220) : rng(75, 155);
      this.r   = this.baseR;
      this.ph  = rng(0, Math.PI * 2);
      this.dA  = rng(0.025, 0.08);  this.dF = rng(0.001, 0.0028);
      this.bA  = rng(0.07, 0.22);   this.bF = rng(0.0014, 0.006);
      this.aB  = ring === 0 ? rng(0.72, 0.95) : rng(0.50, 0.78);
      this.aPh = rng(0, Math.PI * 2); this.aF = rng(0.0008, 0.003);
      this.al  = this.aB;
      this.sX  = rng(0.75, 1.55); this.sY = rng(0.46, 0.95);
      this.rot = rng(0, Math.PI * 2); this.rS = rng(-0.00028, 0.00028);
    }

    update(t: number) {
      const nx = sNoise(this.ox*3,   this.oy*3,   t*0.00042);
      const ny = sNoise(this.ox*3+5, this.oy*3+5, t*0.00042);
      this.x  = this.ox + Math.sin(t*this.dF + this.ph)*this.dA + nx*0.04;
      this.y  = this.oy + Math.cos(t*this.dF*0.65 + this.ph+1)*this.dA*0.5 + ny*0.025;
      this.r  = this.baseR * (1 + Math.sin(t*this.bF + this.ph)*this.bA);
      this.al = this.aB * (0.68 + 0.32*Math.sin(t*this.aF + this.aPh));
      this.rot += this.rS;
    }

    draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const cx = this.x * W, cy = this.y * H;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.rot);
      ctx.scale(this.sX, this.sY);
      for (let l = 0; l < 9; l++) {
        const f  = (l + 1) / 9;
        const lr = this.r * Math.pow(f, 0.72);
        const a  = this.al * (1 - Math.pow(f, 1.8));
        const g  = ctx.createRadialGradient(0, 0, 0, 0, 0, lr);
        g.addColorStop(0,    `rgba(255,255,255,${a.toFixed(3)})`);
        g.addColorStop(0.30, `rgba(255,255,255,${(a*0.78).toFixed(3)})`);
        g.addColorStop(0.62, `rgba(255,255,255,${(a*0.26).toFixed(3)})`);
        g.addColorStop(0.86, `rgba(255,255,255,${(a*0.05).toFixed(3)})`);
        g.addColorStop(1,    `rgba(255,255,255,0)`);
        ctx.beginPath();
        ctx.arc(0, 0, lr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  const NUM_BLOBS = 13;
  let blobs: Blob[] = [];
  let tick = 0;

  onMount(() => {
    if (!layerBlur || !titleWrap) return;

    let W = 0, H = 0;
    const off  = document.createElement('canvas');
    const offCtx = off.getContext('2d')!;

    function resize() {
      W = titleWrap!.offsetWidth;
      H = titleWrap!.offsetHeight;
    }

    blobs = Array.from({ length: NUM_BLOBS }, (_, i) => new Blob(i, NUM_BLOBS));
    resize();
    blobs.forEach(b => b.update(0));

    const ro = new ResizeObserver(resize);
    ro.observe(titleWrap);

    function frame() {
      tick++;
      const dpr = window.devicePixelRatio || 1;
      // size the backing canvas for HiDPI displays and keep CSS size stable
      off.width = Math.max(1, Math.round(W * dpr));
      off.height = Math.max(1, Math.round(H * dpr));
      off.style.width = W + 'px';
      off.style.height = H + 'px';
      // scale drawing operations to device pixels
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.clearRect(0, 0, W, H);

      for (let i = NUM_BLOBS - 1; i >= 0; i--) {
        blobs[i].update(tick);
        blobs[i].draw(offCtx, W, H);
      }

      // Throttle expensive toDataURL calls to every other frame for smoother framerate
      if ((tick & 1) === 0) {
        const url = off.toDataURL();
        layerBlur!.style.webkitMaskImage = `url('${url}')`;
        layerBlur!.style.maskImage       = `url('${url}')`;
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    // subtle parallax: move the blurred layer slightly with pointer movement
    function onPointer(e: PointerEvent) {
      if (!titleWrap || !layerBlur) return;
      const rect = titleWrap.getBoundingClientRect();
      const mx = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const my = (e.clientY - rect.top - rect.height / 2) / rect.height;
      const tx = (mx * 6).toFixed(2);
      const ty = (my * 6).toFixed(2);
      layerBlur.style.transform = `translate(${tx}px, ${ty}px) scale(1.02)`;
    }

    titleWrap.addEventListener('pointermove', onPointer);
    titleWrap.addEventListener('pointerleave', () => {
      if (layerBlur) layerBlur.style.transform = 'translateZ(0)';
    });

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      ro.disconnect();
    };
  });
</script>

<h1
  class="title-wrap"
  bind:this={titleWrap}
  aria-label="FUORI CAMPO"
>
  <!-- layer 1: sharp, always fully visible -->
  <div class="title-text layer-sharp" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>

  <!-- layer 2: ambient glow — full-area blur matching Figma FOREGROUND_BLUR r:25 -->
  <div class="title-text layer-ambient" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>

  <!-- layer 3: blurred copy, masked by cloud shape → covers sharp only in cloud zones -->
  <div
    class="title-text layer-blurred"
    bind:this={layerBlur}
    aria-hidden="true"
  >
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
  </div>

  <!-- spacer for natural h1 height -->
  <div class="title-text spacer" aria-hidden="true">
    <span class="fuori">FUORI</span>
    <span class="campo">CAMPO</span>
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
    width: min(1083px, 90vw);
    max-width: 100vw;
    cursor: auto;
    user-select: none;
    pointer-events: auto;
    background: transparent;
    box-sizing: border-box;
    z-index: 9999;
    max-height: 100vh;
    overflow: visible;
  }

  .title-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    font-family: var(--font-display);
    font-size: 300px;
    line-height: 250px;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
  }

  .spacer {
    position: relative;
    visibility: hidden;
  }

  .layer-sharp {
    z-index: 1;
  }

  .layer-blurred {
    z-index: 2;
    /* stronger, more visible blur + a bit more color pop */
    filter: blur(44px) saturate(140%) contrast(110%);
    opacity: 0.96;
    will-change: filter, opacity;
    transform: translateZ(0);
    transition: transform 420ms cubic-bezier(.22,.98,.3,1), opacity 420ms ease;
  }

  /* Make the blurred layer render as a filled, glowing version of the text
     (keep the sharp layer as the outlined/sharp text). */
  .layer-blurred .fuori,
  .layer-blurred .campo {
    color: var(--color-content-title);
    -webkit-text-fill-color: var(--color-content-title);
    -webkit-text-stroke-width: 0;
  }

  /* extra soft glow behind the blurred layer */
  .layer-blurred::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12), transparent 25%);
    filter: blur(80px) saturate(140%);
    opacity: 0.45;
    mix-blend-mode: screen;
  }

  .fuori {
    color: var(--color-content-title);
    text-align: center;
  }

  .campo {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-width: 10px;
    -webkit-text-stroke-color: var(--color-content-title);
    text-align: center;
  }
</style>