<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import * as THREE from 'three';
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import '$lib/styles/tokens.css';

  type Category = {
    id: number;
    label: string;
    image: string;
    mobileFillLh?: number;
    mobileOutlineLh?: number;
  };

  const IMG_RELAZIONI = '/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.png';
  const IMG_CERIMONIE = '/volunteer_images/carosello_categorie/Cerimonia_e_revenue.png';
  const IMG_SPORT = '/volunteer_images/carosello_categorie/Sport.png';
  const IMG_AREAORGANIZZATIVA = '/volunteer_images/carosello_categorie/Area_organizzativa.png';
  const IMG_LOGISTICA = '/volunteer_images/carosello_categorie/Logistica_e_territorio.png';
  const IMG_GESTIONE = '/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.png';
  const defaultCategories: Category[] = [
    { id: 1, label: 'RELAZIONI E COMUNICAZIONE',             image: IMG_RELAZIONI },
    { id: 2, label: 'CERIMONIE E REVENUE',                   image: IMG_CERIMONIE },
    { id: 3, label: 'SPORT E DISCIPLINE',                    image: IMG_SPORT },
    { id: 4, label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: IMG_AREAORGANIZZATIVA, mobileFillLh: 40 },
    { id: 5, label: 'LOGISTICA E TERRITORIO',                image: IMG_LOGISTICA,  mobileFillLh: 40, mobileOutlineLh: 40 },
    { id: 6, label: 'GESTIONE OPERATIVA E FAN EXPERIENCE',   image: IMG_GESTIONE },
  ];

  let { categories = defaultCategories }: { categories?: Category[] } = $props();

  let canvasEl: HTMLCanvasElement | null = $state(null);
  let containerEl: HTMLElement | null   = $state(null);
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
  let visualPos = $state(0);
  let position  = $state(0); 
  let isMobile  = $state(false);

  // Touch state (mobile)
  let touchStartY = 0;

  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragLive   = 0;  // live fractional drag offset (0 when settled)

  // ─── arc geometry constants ──────────────────────────────────────
  const ARC_R     = 4.1;   // cylinder radius — smaller = deeper curve
  const ARC_THETA = 0.25;  // angular step between card centres (radians)
  const CARD_W    = 3.2;   // world-units — card width
  const CARD_H    = 3.2;

  const SIDE_W    = 3.7;
  const SIDE_H    = 3.7;

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
  
  const LERP_K = 0.025; 

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

      // Feather all four edges so the centre card has no hard rectangular
      // border — it dissolves softly into the blurred layer behind it,
      // killing the boxy seam / double-exposure look during drag.
      float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x)
                 * smoothstep(0.0, 0.16, vUv.y) * smoothstep(0.0, 0.16, 1.0 - vUv.y);

      gl_FragColor = vec4(c.rgb, uFade * edge);
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
    visualPos = visual;

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
      // keep a small minimum fade so side items never fully disappear,
      // but low enough that stacked side panels don't haze through the centre
      slot.sMat.uniforms.uFade.value    = Math.max(sf, 0.12);
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

  function onArrowClick(dir: number, e: MouseEvent) {
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

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) navigate(dy > 0 ? 1 : -1);
  }

  // ─── wheel navigation (desktop) ──────────────────────────────────
  // The page itself is fixed; a scroll gesture advances the carousel one
  // category. Delta is accumulated to a threshold (so trackpad micro-events
  // don't trigger), then locked briefly so one gesture = one step.
  let wheelAccum = 0;
  let wheelLocked = false;
  let wheelStepTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  const WHEEL_STEP    = 30;   // delta needed to commit a step
  const WHEEL_LOCK_MS = 480;  // min time between steps

  function onWheel(e: WheelEvent) {
    e.preventDefault();           // keep the page pinned, no rubber-banding
    if (wheelLocked) return;

    wheelAccum += e.deltaX;

    // Drop the accumulator if the user pauses between gestures.
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => { wheelAccum = 0; }, 140);

    if (Math.abs(wheelAccum) >= WHEEL_STEP) {
      navigate(wheelAccum > 0 ? 1 : -1);
      wheelAccum  = 0;
      wheelLocked = true;
      clearTimeout(wheelStepTimer);
      wheelStepTimer = setTimeout(() => { wheelLocked = false; }, WHEEL_LOCK_MS);
    }
  }

  async function handleTitleClick() {
    const idx = mod(Math.round(animPos || 0), N());
    const label = categories?.[idx]?.label ?? '';
    const slug = categorySlug(label || '');
    if (slug) await goto(`/category/${slug}`);
  }

  /* Restore overflow the moment navigation away starts — prevents the
     homepage scroll engine from initialising with body.overflow='hidden'. */
  beforeNavigate(() => {
    document.body.style.overflow   = '';
    document.body.style.paddingTop = '';
    sessionStorage.setItem('category-pos', String(targetPos));
  });

  onMount(() => {
    const saved = sessionStorage.getItem('category-pos'); // ← aggiungi da qui
    if (saved !== null) {
     targetPos = Number(saved);
     animPos   = Number(saved);
     visualPos = Number(saved);
     position  = mod(Number(saved), N());
     sessionStorage.removeItem('category-pos');
    } 

    const checkMobile = () => { isMobile = window.innerWidth < 600; };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Override layout's padding-top and prevent scroll for the full-bleed carousel
    const prev = { pt: document.body.style.paddingTop, ov: document.body.style.overflow };
    document.body.style.paddingTop = '0';
    document.body.style.overflow   = 'hidden';

    if (!isMobile) {
      buildScene();
      window.addEventListener('resize', onResize);
      window.addEventListener('wheel', onWheel, { passive: false });
    }

    return () => {
      document.body.style.paddingTop = prev.pt;
      document.body.style.overflow   = prev.ov;
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(wheelStepTimer);
      clearTimeout(wheelIdleTimer);
    };
  });
  onDestroy(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(animFrameId);
    try { renderer?.dispose(); } catch (e) {}
    if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
  });

  // ─── reactive labels ─────────────────────────────────────────────
  let currentIndex = $derived(mod(Math.round(position), N()));
  let visualCenterIndex = $derived(mod(Math.round(visualPos), N()));
  let transitionDirection = $derived.by(() => {
    if (isDragging) {
      if (dragLive > 0.001) return 1;
      if (dragLive < -0.001) return -1;
      return 0;
    }

    const delta = targetPos - visualPos;
    if (delta > 0.001) return 1;
    if (delta < -0.001) return -1;
    return 0;
  });

  let edgeBlend = $derived.by(() => {
    if (transitionDirection === 0) return 0;

    const rawProgress = isDragging
      ? Math.min(1, Math.abs(dragLive) / 0.35)
      : Math.min(1, Math.abs(targetPos - visualPos));

    return smoothstep(rawProgress);
  });

  let incomingCenterIndex = $derived(mod(visualCenterIndex + transitionDirection, N()));

  let leftOutgoingImage = $derived(categories[mod(visualCenterIndex - 1, N())]?.image ?? '');
  let leftIncomingImage = $derived(categories[mod(incomingCenterIndex - 1, N())]?.image ?? leftOutgoingImage);
  let rightOutgoingImage = $derived(categories[mod(visualCenterIndex + 1, N())]?.image ?? '');
  let rightIncomingImage = $derived(categories[mod(incomingCenterIndex + 1, N())]?.image ?? rightOutgoingImage);

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

  // Hard breaks: always split at this exact point (Figma uses a literal "-\n").
  // Outline span uses white-space:pre-line so the \n is honoured.
  const HARD_BREAK: Record<string, string> = {
    COMUNICAZIONE: 'COMUNICA-\nZIONE',
  };

  // Soft hyphens: U+00AD — only visible when the word overflows its container.
  const SHY = '­';
  const SOFT_HYPHENATE: Record<string, string> = {
    DISCIPLINE: 'DISCI' + SHY + 'PLINE',
    TERRITORIO: 'TERRI' + SHY + 'TORIO',
  };

  function processFill(text: string) {
    return text.replace(/[\p{L}]+/gu, (w) => SOFT_HYPHENATE[w.toUpperCase()] ?? w);
  }
  function processOutline(text: string) {
    return text.replace(/[\p{L}]+/gu, (w) => {
      const u = w.toUpperCase();
      return HARD_BREAK[u] ?? SOFT_HYPHENATE[u] ?? w;
    });
  }

  let mobileTitleLines = $derived.by(() => {
    const match = currentLabel.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (!match) return titleLines.map(processFill).filter(Boolean);

    const beforeE = match[1].trim();
    const afterE  = match[2].trim();

    // Figma rule: if afterE is a single word > 12 chars it overflows 352px alone,
    // so "E" stays on the fill line and the long word occupies the outline (RELAZIONI E / COMUNICAZIONE).
    // All other cases: "E" prefixes the outline (CERIMONIE / E REVENUE, etc.).
    const isSingleLongWord = !afterE.includes(' ') && afterE.length > 12;

    return isSingleLongWord
      ? [processFill(`${beforeE} E`), processOutline(afterE)]
      : [processFill(beforeE), processOutline(`E ${afterE}`)];
  });

  let currentCat     = $derived(categories[mod(Math.round(position), N())]);
  let mobileFillLh   = $derived(currentCat?.mobileFillLh    ?? 36);
  let mobileOutlineLh = $derived(currentCat?.mobileOutlineLh ?? 36);

</script>

{#if isMobile}
<section class="mobile-carousel" id="main-content"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
  aria-label="Category carousel"
>
  {#key currentIndex}
    <div
      class="mobile-bg"
      style="background-image: url('{categories[currentIndex]?.image}')"
      in:fade={{ duration: 500, delay: 80 }}
      out:fade={{ duration: 400 }}
    ></div>
  {/key}

  <!-- Figma "BLUR EFFECT" — 6px backdrop blur + dark gradient, top & bottom -->
  <div class="mobile-blur mobile-blur--top" aria-hidden="true"></div>
  <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

  <!-- Title (full width, above the controls) -->
  <div class="mobile-title" aria-live="polite" lang="it">
    {#each mobileTitleLines as line, i}
      {#if i === 0}
        <span class="title-fill" style="line-height: {mobileFillLh}px">{line}</span>
      {:else}
        <span class="title-outline" style="line-height: {mobileOutlineLh}px">{line}</span>
      {/if}
    {/each}
  </div>

  <!-- Scopri di più (bottom-left) -->
  <a class="scopri-btn" href="/category/{categorySlug(currentLabel)}">SCOPRI DI PIÙ</a>

  <!-- Vertical arrows (bottom-right) -->
  <div class="mobile-nav-circles">
    <ArrowButton direction="up" onclick={() => navigate(-1)} />
    <ArrowButton direction="down" onclick={() => navigate(1)} />
  </div>
</section>
{:else}
<section class="carousel" id="main-content" bind:this={containerEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
  aria-label="Category carousel"
>
  <canvas bind:this={canvasEl}></canvas>

  <!-- Thin blurred strips of adjacent images at the very edges -->
  <div class="edge-panel edge-panel--left" aria-hidden="true">
    <div
      class="edge-panel__layer"
      style={`background-image: url('${leftOutgoingImage}'); opacity:${1 - edgeBlend};`}
    ></div>
    <div
      class="edge-panel__layer"
      style={`background-image: url('${leftIncomingImage}'); opacity:${edgeBlend};`}
    ></div>
  </div>
  <div class="edge-panel edge-panel--right" aria-hidden="true">
    <div
      class="edge-panel__layer"
      style={`background-image: url('${rightOutgoingImage}'); opacity:${1 - edgeBlend};`}
    ></div>
    <div
      class="edge-panel__layer"
      style={`background-image: url('${rightIncomingImage}'); opacity:${edgeBlend};`}
    ></div>
  </div>

  <div class="arrow-left" onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="left" onclick={(e) => onArrowClick(-1, e)} />
  </div>
  <div class="arrow-right" onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="right" onclick={(e) => onArrowClick(1, e)} />
  </div>

  <div class="curve-frame" aria-hidden="true">
    <svg class="curve curve-top" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
    </svg>
    <svg class="curve curve-bottom" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
    </svg>
  </div>

  <div class="bottom-bar">
    <div class="title" aria-live="polite" role="button" tabindex="0"
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
{/if}

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  .carousel {
    position: fixed;
    /* inset: 0 pins all four edges to the viewport — no dvh/vw unit needed */
    inset: 0;
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

   .arrow-left {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: var(--spacing-5);
    z-index: 12;
  }
  .arrow-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: var(--spacing-5);
    z-index: 12;
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
    /* Wide enough to fully overlap the sharp side-image junctions and
       dissolve into the centre with no visible seam */
    width: min(30vw, 460px);
    pointer-events: none;
    z-index: 2;
    overflow: hidden;
  }

  .edge-panel__layer {
    position: absolute;
    /* Extend well beyond the panel boundary so the blur radius never
       reaches the element edge and leaves a dark seam at any zoom level. */
    inset: -8% -6%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(20px) saturate(1.08);
    -webkit-filter: blur(20px) saturate(1.08);
    will-change: opacity;
  }

  .edge-panel--left {
    left: 0;
    border-radius: 0 32px 32px 0;
    transform-origin: left center;
    transform: scaleX(1.22);
    /* Solid blur at the outer edge, then a long gradual feather so the
       blur melts into the sharp centre image without a perceptible line */
    mask-image: linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 42%, rgba(0, 0, 0, 0.9) 60%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0.2) 92%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 42%, rgba(0, 0, 0, 0.9) 60%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0.2) 92%, rgba(0, 0, 0, 0) 100%);
  }

  .edge-panel--right {
    right: 0;
    border-radius: 32px 0 0 32px;
    transform-origin: right center;
    transform: scaleX(1.22);
    mask-image: linear-gradient(to left, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 42%, rgba(0, 0, 0, 0.9) 60%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0.2) 92%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(to left, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 42%, rgba(0, 0, 0, 0.9) 60%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0.2) 92%, rgba(0, 0, 0, 0) 100%);
  }

  .edge-panel::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
  }

  .edge-panel--left::after {
    left: 0;
    width: 100%;
    background: linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.36) 24%, rgba(0,0,0,0.14) 52%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.42) 88%, rgba(0,0,0,0.75) 100%);
  }

  .edge-panel--right::after {
    right: 0;
    width: 100%;
    background: linear-gradient(270deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.36) 24%, rgba(0,0,0,0.14) 52%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.42) 88%, rgba(0,0,0,0.75) 100%);
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
    /* py-[spacing/4-2, 20px] from Figma — no horizontal padding, rows handle their own indent */
    padding: var(--spacing-4-2) 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    z-index: 10;
    pointer-events: none;
  }

  .title {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(48px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px);
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
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    display: block;
    white-space: nowrap;
    /* Figma: Outline row px-[spacing/17, 340px] — 340px at 1728px viewport */
    margin-left: clamp(var(--spacing-11), calc(var(--spacing-17) / max(var(--page-zoom, 1), 0.65)), 580px);
  }

  /* SPORT: shorter first word, keep distinct stagger */
  .title.category-sport .title-fill {
    margin-left: clamp(var(--spacing-4), 5vw, var(--spacing-11));
  }
  .title.category-sport .title-outline {
    margin-left: clamp(var(--spacing-8), 24.5vw, 340px);
  }

  /* ── Prevent title text overflow on very narrow viewports ───────── */
  @media (max-width: 700px) {
    .title-fill,
    .title-outline {
      white-space: normal;
      word-break: break-word;
    }
    .title-outline {
      margin-left: var(--spacing-11);
    }
    .title.category-sport .title-outline {
      margin-left: var(--spacing-8);
    }
    /* Mobile title lives inside .mobile-title, not .title — reset stagger */
    .mobile-title .title-fill,
    .mobile-title .title-outline {
      margin-left: 0;
    }
  }

  /* ── Arrow safe-area positioning ───────────────────────────────── */
  @media (min-width: 768px) {
    .arrow-left  { left:  var(--spacing-8); }
    .arrow-right { right: var(--spacing-8); }
  }
  @media (min-width: 1024px) {
    .arrow-left  { left:  var(--spacing-11); }
    .arrow-right { right: var(--spacing-11); }
  }


  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .title-fill,
    .title-outline {
      transition: none;
    }
  }

  /* ================================================================
   * MOBILE CAROUSEL  (≤ 599px)
   * ================================================================ */

  .mobile-carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary);
    overflow: hidden;
  }

  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* ── Figma "BLUR EFFECT": 6px backdrop blur + dark gradient ──────
     Top band darkens behind the navbar; bottom band fades the image
     into solid #0e0e0e so the title/controls stay legible. The mask
     feathers the blur so it dissolves toward the sharp middle. */
  .mobile-blur {
    position: absolute;
    left: 0;
    right: 0;
    height: 44%;            /* 388 / 874 from Figma */
    pointer-events: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mobile-blur--top {
    top: 0;
    background: linear-gradient(180deg, rgba(14, 14, 14, 0.35) 0%, rgba(14, 14, 14, 0) 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
            mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0) 100%);
  }

  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(
      0deg,
      rgba(14, 14, 14, 1)    0%,
      rgba(14, 14, 14, 1)    28%,
      rgba(14, 14, 14, 0.7) 50%,
      rgba(14, 14, 14, 0)    100%
    );
    -webkit-mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
            mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0, 0, 0, 0) 100%);
  }

  /* ── Title — Figma "Title Container": bottom 87, py 32, px 24 ──── */
  .mobile-title {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 87px;
    padding: var(--spacing-6) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: none;
    z-index: 3;
  }

  /* Figma: Forma DJR Display ExtraBold · 43px · line-height 36px · w 352 */
  .mobile-title .title-fill {
    font-family: var(--font-display);
    font-size: 43px;
    font-style: normal;
    font-weight: 800;
    line-height: 36px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: normal;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  /* Figma: -webkit-text-stroke 2px #bdff5d */
  .mobile-title .title-outline {
    font-family: var(--font-display);
    font-size: 43px;
    font-style: normal;
    font-weight: 800;
    line-height: 36px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    width: 352px;
    max-width: 100%;
    white-space: pre-line;
    hyphens: manual;
    -webkit-hyphens: manual;
    margin: 0;
  }

  /* ── Scopri di più — Figma: bottom 36, left 24, width 238 ─────── */
  .scopri-btn {
    position: absolute;
    left: var(--spacing-5);
    bottom: var(--unit-36);
    width: 238px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4) 0;
    border: 2px solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill, 999px);
    background: var(--color-background-primary);
    color: var(--color-link-default);
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    z-index: 4;
    transition: background 220ms ease, box-shadow 220ms ease;
  }

  .scopri-btn:hover,
  .scopri-btn:focus-visible {
    background: rgba(189, 255, 93, 0.08);
  }

  /* ── Vertical arrows — Figma: bottom 36, right 24, gap 24 ──────── */
  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5);
    bottom: var(--unit-36);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    z-index: 4;
  }


</style>
