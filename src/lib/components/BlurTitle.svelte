<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let reveal = $state(false);    
  let hovering = $state(false);    
  let x = $state(0);
  let y = $state(0);
  let mounted = $state(false);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const autoDelay = 3000;

  function startAutoReveal() {
    if (!mounted) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      reveal = true;
    }, autoDelay);
  }

  function stopAutoReveal() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function handleMove(e: PointerEvent) {
    if (!mounted) return;

    hovering = true;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;

    reveal = true; 
    stopAutoReveal();
  }

  function handleLeave() {
    hovering = false; 
    
  }

  function handleScroll() {
    if (!mounted) return;

    const el = document.querySelector(".blur-title-wrap");
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const outOfView =
      rect.bottom < window.innerHeight * 0.2 ||
      rect.top > window.innerHeight * 0.8;

    if (outOfView) {
      reveal = false;   
      hovering = false;
      stopAutoReveal();
    }
  }

  onMount(() => {
    mounted = true;
    startAutoReveal();
    window.addEventListener("scroll", handleScroll);
  });

  onDestroy(() => {
    if (mounted) window.removeEventListener("scroll", handleScroll);
    if (timer) clearTimeout(timer);
  });
</script>

<h1 class="blur-title-wrap" style="display:flex; justify-content:center; align-items:center; width:100%; position:relative;"
  onpointermove={handleMove}
  onpointerleave={handleLeave}
  onpointerenter={stopAutoReveal}
>
  <div class="blur-layer" style="filter: blur(18px); opacity: {reveal ? 0.0 : 1};
      transition: opacity 0.4s ease;
      position:absolute;
      top:0;
      left:50%;
      transform:translateX(-50%);
      text-align:center;
    "
  >
    <span class="word first">FUORI</span><br />
    <span class="word second">CAMPO</span>
  </div>

  <div class="clear-layer" style="position:relative; text-align:center; opacity: {reveal ? 1 : 0};
      transition: opacity 0.4s ease;

      mask-image: {mounted && hovering ? `radial-gradient(circle 180px at ${x}px ${y}px, white 0%, transparent 70%)`: 'none'};

      -webkit-mask-image: {mounted && hovering
        ? `radial-gradient(circle 180px at ${x}px ${y}px, white 0%, transparent 70%)`
        : 'none'};
    "
  >
    <span class="word first">FUORI</span><br />
    <span class="word second">CAMPO</span>
  </div>
</h1>
