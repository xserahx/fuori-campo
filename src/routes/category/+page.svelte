<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import * as THREE from 'three';
  import Navbar from '$lib/components/Navbar.svelte';
  import '$lib/styles/tokens.css';

  type Category = { id: number; label: string; image: string };

  const IMG_FIGMA_204 = '/figma/cat-1.jpg';
  const IMG_FIGMA_58  = '/figma/cat-5.jpg';
  const IMG_FIGMA_232 = '/figma/cat-8.jpg';

  const defaultCategories: Category[] = [
    { id: 1, label: 'RELAZIONI E COMUNICAZIONE', image: IMG_FIGMA_204 },
    { id: 2, label: 'CERIMONIE E REVENUE',       image: IMG_FIGMA_58 },
    { id: 3, label: 'SPORT E DISCIPLINE',        image: IMG_FIGMA_232 },
    { id: 4, label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: IMG_FIGMA_204 },
    { id: 5, label: 'LOGISTICA E TERRITORIO',    image: IMG_FIGMA_58 },
    { id: 6, label: 'GESTIONE OPERATIVA E FAN EXPERIENCE', image: IMG_FIGMA_232 },
  ];

  let { categories = defaultCategories }: { categories?: Category[] } = $props();

  let canvasEl: HTMLCanvasElement | null = null;
  let containerEl: HTMLElement | null   = null;
  let titleEl: HTMLElement | null = null;
  let renderer: any = null;
  let scene: any    = null;
  let camera: any   = null;
  let clock: any    = null;
  let animFrameId   = 0;

  // ─── infinite slot system ─────
  const N_SLOTS = 11; 
  const HALF    = (N_SLOTS - 1) / 2; // 5

  type Slot = {
    cMesh: any; sMesh: any;
    cMat: any;  sMat: any;
    texIdx: number;
  };
  let slots: Slot[]          = [];
  let textures: THREE.Texture[] = [];

  // Continuous scroll position (unbounded integer target, float animation)
  let targetPos = 0;   
  let animPos   = 0;  
  let position  = $state(0); 

  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragLive   = 0;  // live fractional drag offset (0 when settled)

  // ─── arc geometry constants ──────────────────────────────────────
  const ARC_R     = 4.1;   // cylinder radius — smaller = deeper curve
  const ARC_THETA = 0.25;  // angular step between card centres (radians)
  const CARD_W    = 4.25;  // world-units — card width
  const CARD_H    = 4.25;

  const SIDE_W    = 4.9;
  const SIDE_H    = 4.9;

  // ─── helpers ─────────────────────────────────────────────────────
  const N = () => categories.length;
  function mod(n: number, m: number) { return ((n % m) + m) % m; }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
 
  function smoothstep(x: number) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function slugifyLabel(label: string) {
    return label
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  function categorySlug(label: string) {
    switch (slugifyLabel(label)) {
      case 'relazioni-e-comunicazione':
        return 'relazioni';
      case 'cerimonie-e-revenue':
        return 'cerimonie';
      case 'sport-e-discipline':
        return 'sport';
      case 'area-organizzativa-e-servizi-generali':
        return 'organizzativa';
      case 'logistica-e-territorio':
        return 'logistica';
      case 'gestione-operativa-e-fan-experience':
        return 'gestione';
      default:
        return slugifyLabel(label);
    }
  }
  
  const LERP_K = 0.072; 

  const C_VERT = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;

  const C_FRAG = /* glsl */`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uFade;   // 0..1 alpha driven by distance
    uniform float     uBlend;  // 0=sharp  1=fully side-like (used during transition)
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float grain(vec2 uv, float t){
      return (hash(uv + fract(t*0.017)) - 0.5) * 0.038;
    }

    void main(){
      vec4 c = texture2D(uTex, vUv);
      c.rgb  += grain(vUv, uTime);
      gl_FragColor = vec4(c.rgb, uFade);
    }`;

  // ─── GLSL: side card — zoom-blur + barrel + grain + vignette ─────
  // This shader creates the "image peeling away from center" look.
  const S_VERT = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;

  const S_FRAG = /* glsl */`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uSide;   // -1=left  +1=right
    uniform float     uFade;
    uniform float     uDist;   // abs distance from center (0=neighbour, 1=far)
    varying vec2 vUv;

    // Zoom-blur from inner edge — streaks outward.
    vec4 zoomBlur(sampler2D t, vec2 uv, float side, float str){
      vec2 focus = vec2(side > 0.0 ? 0.0 : 1.0, 0.5);
      vec4 acc = vec4(0.0);
      const int S = 30;
      for(int i=0;i<S;i++){
        float f   = float(i)/float(S-1);
        float w   = f * f;
        vec2  off = (uv - focus) * f * str * 0.36;
        acc += texture2D(t, clamp(uv - off, 0.001, 0.999)) * w;
      }
      return acc / (float(S) * 0.33);
    }

    vec2 barrel(vec2 uv, float k, float side){
      vec2 c = uv - 0.5;
      float outer = side > 0.0 ? vUv.x : 1.0 - vUv.x;
      float kk    = k * (0.5 + outer * 1.2);
      float r2    = c.x*c.x*1.2 + c.y*c.y;
      c *= 1.0 + kk * r2 * 2.8;
      c.x += c.x * k * (-0.18 * side);
      return c + 0.5;
    }

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float grain(vec2 uv, float t){
      return (hash(uv + fract(t*0.013)) - 0.5) * 0.18;
    }

    void main(){
      float k   = 0.34 + uDist * 0.56;
      float blr = 1.55 + uDist * 2.05;

      vec2  wuv = barrel(vUv, k, uSide);
      wuv = clamp(wuv, 0.001, 0.999);

      vec4 col  = zoomBlur(uTex, wuv, uSide, blr);
      col.rgb  += grain(vUv, uTime);

      col.rgb *= vec3(0.84, 0.93, 1.05);
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 0.88);

      float innerX = uSide > 0.0 ? (1.0 - vUv.x) : vUv.x;
      float topB   = smoothstep(0.0, 0.22, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
      float sideV  = smoothstep(0.0, 0.58, innerX) * (1.0 - smoothstep(0.55, 1.0, innerX)*0.3);
      float vig    = topB * sideV;
      col.rgb     *= vig * 0.72 + 0.015;

      col.rgb *= 0.64 - uDist * 0.12;

      gl_FragColor = vec4(col.rgb, uFade);
    }`;

  // ─── Three.js scene ─────────────────────────────────────────
  function buildScene() {
    if (!canvasEl || !containerEl) return;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;

    // Camera positioned at cylinder axis, looking down -Z
    camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100);
    camera.position.set(0, 0, ARC_R * 0.98); 

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    // Load textures
    const loader = new THREE.TextureLoader();
    textures = categories.map(cat => {
      const t = loader.load(cat.image, undefined as any, undefined as any, undefined as any);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });

    // Create slots
    for (let s = 0; s < N_SLOTS; s++) {
      const initIdx = mod(s - HALF, N());

      const cMat = new THREE.ShaderMaterial({
        uniforms: {
          uTex:   { value: textures[initIdx] },
          uTime:  { value: 0 },
          uFade:  { value: 0 },
          uBlend: { value: 0 },
        },
        vertexShader: C_VERT, fragmentShader: C_FRAG,
        transparent: true, depthWrite: false,
      });

      const sMat = new THREE.ShaderMaterial({
        uniforms: {
          uTex:  { value: textures[initIdx] },
          uTime: { value: 0 },
          uSide: { value: 1 },
          uFade: { value: 0 },
          uDist: { value: 0 },
        },
        vertexShader: S_VERT, fragmentShader: S_FRAG,
        transparent: true, depthWrite: false,
      });

      const cMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1),
        cMat
      );
      const sMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(SIDE_W, SIDE_H, 1, 1),
        sMat
      );

      scene.add(cMesh);
      scene.add(sMesh);
      slots.push({ cMesh, sMesh, cMat, sMat, texIdx: initIdx });
    }

    animate();
  }

  // ─── animation loop ──────────────────────────────────────────────
  function animate() {
    if (!renderer || !scene || !camera || !clock) return;
    animFrameId = requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    // Smooth lerp — feels like inertia
    animPos = lerp(animPos, targetPos, LERP_K);
    const visual = animPos + dragLive;

    slots.forEach((slot, s) => {
      const slotOffset = s - HALF;  // −5 .. +5

      // ── texture assignment (infinite wrap) ──────────────────────
      const catIdx = mod(Math.round(visual) + slotOffset, N());
      if (slot.texIdx !== catIdx) {
        slot.texIdx                  = catIdx;
        slot.cMat.uniforms.uTex.value = textures[catIdx];
        slot.sMat.uniforms.uTex.value = textures[catIdx];
      }

      // ── fractional position on the arc ──────────────────────────
      // displayRel = how many "steps" this slot is from the visual centre
      const fracOffset = visual - Math.round(visual); 
      const displayRel  = slotOffset - fracOffset;     
      const absD        = Math.abs(displayRel);
      const signD       = displayRel >= 0 ? 1 : -1;

      // ── arc placement ───────────────────────────────────────────
      const theta = displayRel * ARC_THETA;
      const px    = ARC_R * Math.sin(theta);         // X on the cylinder
      const pz    = ARC_R * Math.cos(theta) - ARC_R; // Z relative to camera
      // Card faces inward (toward axis), so rotateY by −theta
      const ry    = -theta * 1.2;

      // ── fade curves — smooth, no hard edges ─────────────────────
      // Center mesh: gaussian-like fade, peak at centre
      const cfRaw  = Math.exp(-absD * absD * 2.9);
      const cf     = cfRaw;

      // Side mesh: complementary to center — fills the space the center vacates
       const sfRaw  = smoothstep(Math.max(0, absD - 0.02) * 2.1)
         * (1 - smoothstep(Math.max(0, absD - 2.15) * 1.5));
      const sf     = sfRaw;

      const normDist = Math.min(1, Math.max(0, (absD - 0.18) / 1.2));

  slot.cMesh.position.set(px, 0, pz + 0.03);
      slot.cMesh.rotation.set(0, ry, 0);
      slot.cMesh.visible               = cf > 0.003;
      slot.cMat.uniforms.uFade.value    = cf;
      slot.cMat.uniforms.uTime.value    = t;

      slot.sMesh.position.set(px, 0, pz - 0.03);
      slot.sMesh.rotation.set(0, ry, 0);
      // Ensure side meshes remain visible as blurred previews at the edges
      slot.sMesh.visible               = true;
      // keep a minimum fade so side items never fully disappear
      slot.sMat.uniforms.uFade.value    = Math.max(sf, 0.24);
      slot.sMat.uniforms.uTime.value    = t;
      slot.sMat.uniforms.uSide.value    = signD;
      slot.sMat.uniforms.uDist.value    = normDist;
    });

    renderer.render(scene, camera);
  }

  // ─── navigation ──────────────────────────────────────────────────
  function navigate(dir: number) {
    targetPos += dir;
    position   = mod(targetPos, N());
  }

  function onArrowPointerDown(dir: number, e: PointerEvent) {
    e.stopPropagation();
    navigate(dir);
  }

  // ─── pointer / drag ──────────────────────────────────────────────
  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragLive   = 0;
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!isDragging || !containerEl) return;
    dragLive = (dragStartX - e.clientX) / (containerEl.clientWidth * 0.38);
  }
  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;

    // Detect a tap/click on the center image (minimal drag, pointer near screen centre)
    if (Math.abs(dragLive) < 0.08 && containerEl) {
      const ratio = Math.abs(dragStartX - containerEl.clientWidth / 2) / containerEl.clientWidth;
      if (ratio < 0.22) {
        dragLive = 0;
        handleTitleClick();
        return;
      }
    }

    if      (dragLive >  0.35) { targetPos++; }
    else if (dragLive < -0.35) { targetPos--; }
    position = mod(targetPos, N());
    dragLive = 0;
  }

  function onResize() {
    if (!renderer || !containerEl || !camera) return;
    const w = containerEl.clientWidth, h = containerEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  async function handleTitleClick() {
    const idx = mod(Math.round(animPos || 0), N());
    const label = categories?.[idx]?.label ?? '';
    const slug = categorySlug(label || '');
    if (slug) await goto(`/category/${slug}`);
  }

  onMount(() => { buildScene(); window.addEventListener('resize', onResize); });
  onDestroy(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(animFrameId);
    try {
      renderer?.dispose();
    } catch (e) {
    }
    if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
  });

  // ─── reactive labels ─────────────────────────────────────────────
  let currentIndex = $derived(mod(Math.round(position), N()));
  let currentLabel = $derived(categories[mod(Math.round(position), N())]?.label ?? '');
  let previousCategory = $derived(categories[mod(currentIndex - 1, N())]);
  let nextCategory    = $derived(categories[mod(currentIndex + 1, N())]);
  let nextLabel    = $derived(nextCategory?.label ?? '');
  let titleLines   = $derived((() => {
    const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (match) {
      return [match[1].trim(), `E ${match[2].trim()}`].filter(Boolean);
    }

    const words = currentLabel.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return [currentLabel];

    const splitAt = Math.max(1, Math.ceil(words.length / 2));
    return [
      words.slice(0, splitAt).join(' '),
      words.slice(splitAt).join(' '),
    ].filter(Boolean);
  })());

</script>

<Navbar pinned />

<section class="carousel" bind:this={containerEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
  aria-label="Category carousel"
>
  <canvas bind:this={canvasEl}></canvas>

  <!-- Thin blurred strips of adjacent images at the very edges -->
  <div class="edge-panel edge-panel--left" aria-hidden="true"
    style={`background-image: url('${previousCategory?.image ?? ''}')`}
  ></div>
  <div class="edge-panel edge-panel--right" aria-hidden="true"
    style={`background-image: url('${nextCategory?.image ?? ''}')`}
  ></div>

  <button class="arrow arrow-left" type="button" aria-label="Previous category"
    onpointerdown={(e) => onArrowPointerDown(-1, e)}
  >
    <span aria-hidden="true">‹</span>
  </button>

  <button
    class="arrow arrow-right"
    type="button"
    aria-label="Next category"
    onpointerdown={(e) => onArrowPointerDown(1, e)}
  >
    <span aria-hidden="true">›</span>
  </button>

  <div class="curve-frame" aria-hidden="true">
    <svg class="curve curve-top" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
    </svg>
    <svg class="curve curve-bottom" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
    </svg>
  </div>

  <div class="bottom-bar">
    <div class="title" aria-live="polite" bind:this={titleEl} role="button" tabindex="0"
      class:category-sport={categorySlug(currentLabel) === 'sport'}
      onclick={handleTitleClick}
      onkeydown={(e) => { if (e.key === 'Enter') handleTitleClick(); }}>
      {#each titleLines as line, index}
        {#if index === 0}
          <span class="title-fill">{line}</span>
        {:else}
          <span class="title-outline">{line}</span>
        {/if}
      {/each}
    </div>
  </div>
</section>

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  .carousel {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    background: var(--color-background-primary);
    overflow: hidden;
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  .carousel:active { cursor: grabbing; }

  .carousel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 5%, rgba(0, 0, 0, 0) 18%, rgba(0, 0, 0, 0.18) 100%);
    pointer-events: none;
    z-index: 1;
  }

  .arrow {
    position: absolute;
    /* Center vertically in the carousel area */
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 50px;
    background: transparent;
    color: #ffffff; /* default white */
    display: grid;
    place-items: center;
    font-size: 44px;
    line-height: 1;
    padding: 0;
    z-index: 12;
    cursor: pointer;
    border: none;
    box-shadow: none;
  }

  .arrow:hover {
    color: var(--color-content-title);
  }

  .arrow:focus-visible {
    outline: 2px solid rgba(186, 255, 68, 0.9);
    outline-offset: 4px;
  }

  .arrow-left {
    left: 8px;
  }

  .arrow-right {
    right: 8px;
  }

  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .edge-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    width: min(22vw, 340px);
    pointer-events: none;
    z-index: 2;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(12px) saturate(1.06);
    -webkit-filter: blur(12px) saturate(1.06);
    opacity: 1;
  }

  .edge-panel--left {
    left: 0;
    border-radius: 0 32px 32px 0;
    transform-origin: left center;
    transform: scaleX(1.18);
  }

  .edge-panel--right {
    right: 0;
    border-radius: 32px 0 0 32px;
    transform-origin: right center;
    transform: scaleX(1.18);
  }

  .edge-panel--left::after {
    left: 0;
    width: 24%;
    background: linear-gradient(90deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.32) 18%,rgba(0,0,0,0.12) 38%,rgba(0,0,0,0) 58%,rgba(0,0,0,0.35) 78%,rgba(0,0,0,0.82) 100%);
  }

  .edge-panel--right::after {
    right: 0;
    width: 24%;
    background: linear-gradient(270deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.32) 18%,rgba(0,0,0,0.12) 38%,rgba(0,0,0,0) 58%,rgba(0,0,0,0.35) 78%,rgba(0,0,0,0.82) 100%);
  }

  .curve-frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }

  .curve {
    position: absolute;
    left: 0;
    width: 100%;
    fill: var(--color-background-primary);
  }

  .curve-top {
    top: 0;
    height: clamp(120px, 30vh, 260px);
  }

  .curve-bottom {
    bottom: 0;
    height: clamp(110px, 28vh, 240px);
  }

  /* ── bottom UI ───────────────────────────────────────── */
  .bottom-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    /* py-[20px] from Figma — no horizontal padding, rows handle their own indent */
    padding: 20px 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none;
  }

  .title {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(48px, 7.5vw, 116px);
    font-weight: 800;
    font-style: normal;
    text-transform: uppercase;
    /* Figma h1 style: letterSpacing: 0 */
    letter-spacing: 0;
    /* Figma: leading-[unit/116] = 1:1 with font size */
    line-height: 1;
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: auto;
    cursor: pointer;
    overflow: visible;
  }

  .title-fill {
    color: var(--color-content-accent);
    display: block;
    white-space: nowrap;
    /* Figma: Filled row px-[spacing/11, 72px] */
    margin-left: var(--spacing-11);
    /* Figma: mb-[-8px] on filled row creates overlap with outline */
    margin-bottom: -8px;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) var(--color-content-accent);
    display: block;
    white-space: nowrap;
    /* Figma: Outline row px-[spacing/17, 340px] — 340px at 1728px viewport */
    margin-left: clamp(var(--spacing-11), 19.7vw, 340px);
  }

  /* SPORT: shorter first word, keep distinct stagger */
  .title.category-sport .title-fill {
    margin-left: clamp(var(--spacing-4), 5vw, var(--spacing-11));
  }
  .title.category-sport .title-outline {
    margin-left: clamp(var(--spacing-8), 24.5vw, 340px);
  }

</style>