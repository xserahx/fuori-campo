<div class="title-wrap" aria-label="FUORI CAMPO">
  <span class="fuori">FUORI</span>
  <span class="campo">CAMPO</span>
</div>

<style>
  .title-wrap {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(1083px, 94vw);
    max-width: 100vw;
    user-select: none;
    pointer-events: none;
    z-index: 10;
  }

  .fuori,
  .campo {
    display: block;
    font-family: var(--font-display);
    font-size:   clamp(120px, 20vw, 300px);
    line-height: clamp(100px, 16.7vw, 250px);
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    white-space: nowrap;
    text-align: center;
  }

  .fuori {
    color: var(--color-content-accent, #bdff5d);
  }

  .campo {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent, #bdff5d);
  }
</style>
