<script lang="ts">
  let hovered = $state(false);
</script>

<button class="scroll-arrow" aria-label="Scorri verso il basso"
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
  onclick={() => window.scrollBy({ top: window.innerHeight, behavior: "smooth" })}
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
  }

  .drop {
    fill: currentColor;
    opacity: 0;
    transform-origin: center;
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
    animation: label-in 0.6s cubic-bezier(0.16,1,0.3,1) 1.8s forwards;
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
    to { opacity: 0.45; transform: translateY(0px); }
  }

  .scroll-arrow:hover .shaft {
    animation: shaft-draw 1.4s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .scroll-arrow:hover .drop--1,
  .scroll-arrow:hover .drop--2,
  .scroll-arrow:hover .drop--3 {
    animation-duration: 1.2s;
  }

  .scroll-arrow:hover .label {
    opacity: 0.8;
    transition: opacity 0.3s ease;
  }
</style>