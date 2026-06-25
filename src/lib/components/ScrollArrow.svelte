<script lang="ts">
  // Optional click override — if provided, replaces the default scroll-down.
  let { onclick: handleClick = () => window.scrollBy({ top: window.innerHeight, behavior: "smooth" }) }:
    { onclick?: () => void } = $props();

  let hovered = $state(false);
</script>

<button class="scroll-arrow" aria-label="Scorri verso il basso"
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
  onclick={handleClick}
>
  <span class="label">Continua a scorrere per accedere alla galleria</span>

  <svg class="arrow-svg" viewBox="0 0 40 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line class="shaft" x1="20" y1="0" x2="20" y2="44" />
    <polyline class="head" points="8,34 20,50 32,34" />
    <circle class="drop drop--1" cx="20" cy="62" r="3.5" />
    <circle class="drop drop--2" cx="20" cy="74" r="2" />
    <circle class="drop drop--3" cx="20" cy="80" r="1" />
  </svg>
</button>

<style>
  .scroll-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: currentColor;
    transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .scroll-arrow:hover {
    transform: translateY(-4px);
  }

  .arrow-svg {
    width: 40px;
    height: 80px;
    overflow: visible;
  }

  .shaft {
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 44;
    stroke-dashoffset: 44;
    animation: shaft-draw 1.4s cubic-bezier(0.16,1,0.3,1) forwards;
    transition: stroke 280ms ease, filter 280ms ease;
  }

  .head {
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: head-draw 0.5s cubic-bezier(0.16,1,0.3,1) 1s forwards;
    transition: stroke 280ms ease, filter 280ms ease;
  }

  .drop {
    fill: currentColor;
    opacity: 0;
    transform-origin: center;
    transition: fill 280ms ease, filter 280ms ease;
  }

  .scroll-arrow:hover .shaft,
  .scroll-arrow:hover .head {
    stroke: var(--color-content-accent, #bdff5d);
    filter: drop-shadow(0 0 5px rgba(189, 255, 93, 0.7));
  }

  .scroll-arrow:hover .drop {
    fill: var(--color-content-accent, #bdff5d);
    filter: drop-shadow(0 0 6px rgba(189, 255, 93, 0.8));
  }

  .drop--1 { animation: drop-fall 2.8s cubic-bezier(0.4,0,1,1) 1.6s infinite; }
  .drop--2 { animation: drop-fall 2.8s cubic-bezier(0.4,0,1,1) 1.85s infinite; }
  .drop--3 { animation: drop-fall 2.8s cubic-bezier(0.4,0,1,1) 2.05s infinite; }

  .label {
    font-size: 36px;
    letter-spacing: 0.72px;
    font-family: "Forma DJR Display", sans-serif;
    text-transform: none;
    color: var(--color-content-title);
    opacity: 0;
    animation: label-in 0.9s cubic-bezier(0.16,1,0.3,1) 1.8s forwards;
    transition: opacity 240ms ease;
  }

  .scroll-arrow:hover .label {
    opacity: 0.85;
  }

  @keyframes shaft-draw {
    to { stroke-dashoffset: 0; }
  }

  @keyframes head-draw {
    to { stroke-dashoffset: 0; }
  }

  @keyframes drop-fall {
    0%   { opacity: 0; transform: translateY(0px)   scale(1); }
    15%  { opacity: 1; }
    70%  { opacity: 0.6; transform: translateY(14px) scale(0.85); }
    100% { opacity: 0;   transform: translateY(22px) scale(0.5); }
  }

  @keyframes label-in {
    from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
    to   { opacity: 0.45; transform: translateY(0px); filter: blur(0px); }
  }

  .scroll-arrow:hover .shaft {
    animation: shaft-draw 1.4s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .scroll-arrow:hover .drop--1,
  .scroll-arrow:hover .drop--2,
  .scroll-arrow:hover .drop--3 {
    animation-duration: 1.2s;
  }

  /* hover label handled via transition on .label above */
</style>