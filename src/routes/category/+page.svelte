<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import Navbar from '$lib/components/Navbar.svelte';
  import '$lib/styles/tokens.css';

  type Category = { id: number; label: string; image: string };

  // Local cached copies of Figma assets
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
  const CARD_W    = 4.25;  // world-units — card width (square)
  const CARD_H    = 4.25;

  // Side-mesh keeps the same footprint so the center image does not shrink
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

    // Zoom-blur from inner edge — streaks outward (stronger/more samples for pronounced blur)
    vec4 zoomBlur(sampler2D t, vec2 uv, float side, float str){
      // focal = inner edge centre
      vec2 focus = vec2(side > 0.0 ? 0.0 : 1.0, 0.5);
      vec4 acc = vec4(0.0);
      const int S = 24; // increased samples for smoother, stronger blur
      for(int i=0;i<S;i++){
        float f   = float(i)/float(S-1);       // 0..1
        float w   = f * f;                      // weight: bias more to far samples for longer streaks
        vec2  off = (uv - focus) * f * str * 0.36; // slightly stronger offset
        acc += texture2D(t, clamp(uv - off, 0.001, 0.999)) * w;
      }
      // normalize by sum of weights (approx S * 0.33)
      return acc / (float(S) * 0.33);
    }

    // Barrel distortion — curls Y away from center
    vec2 barrel(vec2 uv, float k, float side){
      vec2 c = uv - 0.5;
      // stronger barrel on the outer half (away from center)
      float outer = side > 0.0 ? vUv.x : 1.0 - vUv.x;
      float kk    = k * (0.5 + outer * 1.2);
      float r2    = c.x*c.x*1.2 + c.y*c.y;
      c *= 1.0 + kk * r2 * 2.8;
      // slight X warp: inner edge pulled, outer edge stretched
      c.x += c.x * k * (-0.18 * side);
      return c + 0.5;
    }

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float grain(vec2 uv, float t){
      return (hash(uv + fract(t*0.013)) - 0.5) * 0.18;
    }

    void main(){
      float k   = 0.32 + uDist * 0.52;   // barrel strength grows with distance (slightly stronger)
      float blr = 1.2 + uDist * 1.6;     // stronger zoom-blur for outer images

      vec2  wuv = barrel(vUv, k, uSide);
      wuv = clamp(wuv, 0.001, 0.999);

      vec4 col  = zoomBlur(uTex, wuv, uSide, blr);
      col.rgb  += grain(vUv, uTime);

      // Cooler cinematic tone for the outer images
      col.rgb *= vec3(0.88, 0.96, 1.10);
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 0.88);

      // ── vignette ──────────────────────────────────────────────────
      // Very dark at outer edge, lighter at inner edge
      // Also dark at top/bottom → "letterbox" feel matching reference
      float innerX = uSide > 0.0 ? (1.0 - vUv.x) : vUv.x;
      float topB   = smoothstep(0.0, 0.22, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
      float sideV  = smoothstep(0.0, 0.58, innerX) * (1.0 - smoothstep(0.55, 1.0, innerX)*0.3);
      float vig    = topB * sideV;
      col.rgb     *= vig * 0.78 + 0.02;

      // distance-based darkening
      col.rgb *= 0.72 - uDist * 0.18;

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
      slot.sMat.uniforms.uFade.value    = Math.max(sf, 0.16);
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
  let currentLabel = $derived(categories[mod(Math.round(position), N())]?.label ?? '');
  let nextLabel    = $derived(categories[mod(Math.round(position) + 1, N())]?.label ?? '');
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

  // Map of images (left, center, right) per category index — taken from Figma exports
  const FIGMA_CATEGORY_IMAGES: string[][] = [
    // Relazioni e comunicazione
    [ '/figma/cat-1.jpg', '/figma/cat-2.jpg', '/figma/cat-3.jpg' ],
    // Cerimonie e revenue
    [ '/figma/cat-4.jpg', '/figma/cat-5.jpg', '/figma/cat-6.jpg' ],
    // Sport e discipline
    [ '/figma/cat-7.jpg', '/figma/cat-8.jpg', '/figma/cat-9.jpg' ],
    // Area organizzativa e servizi generali (node 4018:8276)
    [ '/figma/cat-17.jpg', '/figma/cat-18.jpg', '/figma/cat-19.jpg' ],
    // Logistica e territorio (node 4018:8333)
    [ '/figma/cat-10.jpg', '/figma/cat-11.jpg', '/figma/cat-12.jpg' ],
    // Gestione operativa e fan experience (node 4018:7981)
    [ '/figma/cat-13.jpg', '/figma/cat-14.jpg', '/figma/cat-15.jpg' ]
  ];

  function getCurrentFigmaImages() {
    const idx = Math.abs(Math.round(position)) % N();
    return FIGMA_CATEGORY_IMAGES[idx] ?? [categories[idx]?.image ?? '', categories[idx]?.image ?? '', categories[idx]?.image ?? ''];
  }

  let currentFigmaImages = $state(getCurrentFigmaImages());

  $effect(() => {
    currentFigmaImages = getCurrentFigmaImages();
  });
</script>

<Navbar pinned />

<section
  class="carousel"
  bind:this={containerEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
  aria-label="Category carousel"
>
  <canvas bind:this={canvasEl}></canvas>

  <!-- Figma image overlay: three columns (left blurred, center crisp, right blurred) -->
  <div class="figma-hero" aria-hidden="true">
    <div class="figma-images">
      <div class="figma-img figma-img--left" style={`background-image:url(${currentFigmaImages[0]});`}></div>
      <div class="figma-img figma-img--center">
        <img src={currentFigmaImages[1]} alt="" />
      </div>
      <div class="figma-img figma-img--right" style={`background-image:url(${currentFigmaImages[2]});`}></div>
    </div>
  </div>

  <button
    class="arrow arrow-left"
    type="button"
    aria-label="Previous category"
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
    <p class="title" aria-live="polite">
      {#each titleLines as line, index}
        {#if index === 0}
          <span class="title-fill">{line}</span>
        {:else}
          <span class="title-outline">{line}</span>
        {/if}
      {/each}
    </p>
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
    top: 50%;
    transform: translateY(-50%);
    width: 64px;
    height: 64px;
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
    left: 20px;
  }

  .arrow-right {
    right: 20px;
  }

  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .curve-frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }

  .curve {
    position: absolute;
    left: 0;
    width: 100%;
    fill: var(--color-background-primary);
  }

  .curve-top {
    top: 0;
    height: 34vh;
    min-height: 170px;
  }

  .curve-bottom {
    bottom: 0;
    height: 31vh;
    min-height: 160px;
  }

  /* Figma hero overlay */
  .figma-hero {
    position: absolute;
    inset: 0; /* fill the carousel container so overflow:hidden clips anything outside */
    pointer-events: none;
    z-index: 1; /* place under the curve overlay (curve-frame is z-index:2) */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .figma-images{
    position: relative;
    width: 100%;
    max-width: 2200px;
    margin: 0 auto;
    height: calc(100% - 160px); /* leave room for top/bottom curves so they visually crop the images */
    box-sizing: border-box;
  }

  .figma-img{
    position: absolute;
    top: 0;
    bottom: 0;
    overflow: hidden;
    border-radius: 0;
    height: 100%;
    transform: translateZ(0);
  }
  .figma-img--left,
  .figma-img--right{
    width: 36%;
    background-size:cover;
    background-position:center top;
    filter: blur(26px) saturate(118%);
    opacity:0.96;
    z-index: 1;
  }

  .figma-img--left{
    left: 0;
  }

  .figma-img--right{
    right: 0;
  }

  .figma-img--center{
    left: 50%;
    width: 42%;
    display:flex;
    align-items:flex-start;
    justify-content:center;
    transform: translateX(-50%);
    z-index: 2;
  }

  .figma-img--center img{
    height: calc(100% + 30px);
    width: auto;
    display: block;
    object-fit: cover;
    transform: translateY(-10px);
    position: relative;
    z-index: 2;
  }

  @media (max-width:1100px){
    .figma-hero{ display:none; }
  }

  /* ── bottom UI ───────────────────────────────────────── */
  .bottom-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 0 20px 18px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none;
  }

  .title {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 116px;
    font-weight: 800;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: -0.025em;
    line-height: 0.9;
    margin: 0;
    max-width: 72%;
    display: flex;
    flex-direction: column;
    gap: 0.05em;
  }

  .title-fill {
    color: #baff44;
    display: block;
    white-space: nowrap;
    margin-left: 74.2px;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: 2px #baff44;
    display: block;
    white-space: nowrap;
    margin-left: 438px;
    margin-right: 228px;
  }

  @media (max-width: 640px) {
    .title { font-size: 52px; max-width: 78%; }
    .title-fill { margin-left: 74.2px; }
    .title-outline { margin-left: 438px; margin-right: 228px; }
    .title-outline { -webkit-text-stroke: 1.5px #baff44; }
  }
</style>