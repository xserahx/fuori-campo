<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import * as THREE from 'three';
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import '$lib/styles/tokens.css';
  import SiteFooter from '$lib/components/SiteFooter.svelte';

  type Volunteer = {
    id: number;
    name: string;
    role: string;
    subtitle: string;
    image: string;
  };

  const VOLUNTEER_1 = '/volunteer_images/foto_team/claudia.png';
  const VOLUNTEER_2 = '/volunteer_images/foto_team/serena.png';
  const VOLUNTEER_3 = '/volunteer_images/foto_team/greta.png';
  const VOLUNTEER_4 = '/volunteer_images/foto_team/matilde.png';
  const VOLUNTEER_5 = '/volunteer_images/foto_team/viola.png';
  const VOLUNTEER_6 = '/volunteer_images/foto_team/laura.png';

  const defaultVolunteers: Volunteer[] = [
    {
      id: 1,
      name: 'SOLIDORO CLAUDIA IRENE',
      role: 'UX – UI DESIGNER E CODE REVIEWER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_1
    },
    {
      id: 2,
      name: 'SERENA SERAFINI',
      role: 'FRONTEND DEVELOPER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_2
    },
    {
      id: 3,
      name: 'GRETA FRANCO',
      role: 'UX – UI DESIGNER E CONCEPT DESIGNER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_3
    },
    {
      id: 4,
      name: 'MATILDE CURINO',
      role: 'UX – UI DESIGNER E CODE REVIEWER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_4
    },
    {
      id: 5,
      name: 'VIOLA NALDI',
      role: 'UX – UI DESIGNER E FIELD RESEARCHER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_5
    },
    {
      id: 6,
      name: 'LAURA MAGONI',
      role: 'UX – UI DESIGNER E CONCEPT DESIGNER',
      subtitle: 'STUDENTESSA IN DESIGN DELLA COMUNICAZIONE',
      image: VOLUNTEER_6
    },
  ];

  let { volunteers = defaultVolunteers }: { volunteers?: Volunteer[] } = $props();

  let canvasEl: HTMLCanvasElement | null = $state(null);
  let containerEl: HTMLElement | null   = $state(null);
  let renderer: any = null;
  let scene: any    = null;
  let camera: any   = null;
  let clock: any    = null;
  let animFrameId   = 0;

  const N_SLOTS = 11;
  const HALF    = (N_SLOTS - 1) / 2;

  type Slot = {
    cMesh: any; sMesh: any;
    cMat: any;  sMat: any;
    texIdx: number;
  };
  let slots: Slot[]             = [];
  let textures: THREE.Texture[] = [];

  let targetPos = 0;
  let animPos   = 0;
  let visualPos = $state(0);
  let position  = $state(0);
  let isMobile  = $state(false);

  let touchStartY = 0;
  let isDragging  = false;
  let dragStartX  = 0;
  let dragLive    = 0;

  const ARC_R     = 4.1;
  const ARC_THETA = 0.25;
  const CARD_W    = 3.2;
  const CARD_H    = 3.2;
  const SIDE_W    = 3.7;
  const SIDE_H    = 3.7;
  const LERP_K    = 0.025;

  const N = () => volunteers.length;
  function mod(n: number, m: number) { return ((n % m) + m) % m; }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
  function smoothstep(x: number) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  const C_VERT = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;

  const C_FRAG = /* glsl */`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uFade;
    uniform float     uBlend;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(uTex, vUv);
      float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x)
                 * smoothstep(0.0, 0.16, vUv.y) * smoothstep(0.0, 0.16, 1.0 - vUv.y);
      gl_FragColor = vec4(c.rgb, uFade * edge);
    }`;

  const S_VERT = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;

  const S_FRAG = /* glsl */`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uSide;
    uniform float     uFade;
    uniform float     uDist;
    varying vec2 vUv;
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
      col.rgb *= vec3(0.74, 0.88, 1.12);
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 0.78);
      float innerX = uSide > 0.0 ? (1.0 - vUv.x) : vUv.x;
      float topB   = smoothstep(0.0, 0.22, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
      float sideV  = smoothstep(0.0, 0.58, innerX) * (1.0 - smoothstep(0.55, 1.0, innerX)*0.3);
      float vig    = topB * sideV;
      col.rgb     *= vig * 0.72 + 0.015;
      col.rgb *= 0.64 - uDist * 0.12;
      gl_FragColor = vec4(col.rgb, uFade);
    }`;

  function buildScene() {
    if (!canvasEl || !containerEl) return;
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100);
    camera.position.set(0, 0, ARC_R * 0.98);
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    const loader = new THREE.TextureLoader();
    textures = volunteers.map(vol => {
      const t = loader.load(vol.image, undefined as any, undefined as any, undefined as any);
      t.colorSpace = THREE.NoColorSpace;
      return t;
    });
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
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1), cMat);
      const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(SIDE_W, SIDE_H, 1, 1), sMat);
      scene.add(cMesh);
      scene.add(sMesh);
      slots.push({ cMesh, sMesh, cMat, sMat, texIdx: initIdx });
    }
    animate();
  }

  function animate() {
    if (!renderer || !scene || !camera || !clock) return;
    animFrameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    animPos = lerp(animPos, targetPos, LERP_K);
    const visual = animPos + dragLive;
    visualPos = visual;
    slots.forEach((slot, s) => {
      const slotOffset = s - HALF;
      const catIdx = mod(Math.round(visual) + slotOffset, N());
      if (slot.texIdx !== catIdx) {
        slot.texIdx                   = catIdx;
        slot.cMat.uniforms.uTex.value = textures[catIdx];
        slot.sMat.uniforms.uTex.value = textures[catIdx];
      }
      const fracOffset = visual - Math.round(visual);
      const displayRel = slotOffset - fracOffset;
      const absD       = Math.abs(displayRel);
      const signD      = displayRel >= 0 ? 1 : -1;
      const theta      = displayRel * ARC_THETA;
      const px         = ARC_R * Math.sin(theta);
      const pz         = ARC_R * Math.cos(theta) - ARC_R;
      const ry         = -theta * 1.2;
      const cf         = Math.exp(-absD * absD * 2.9);
      const sf         = smoothstep(Math.max(0, absD - 0.02) * 2.1)
                       * (1 - smoothstep(Math.max(0, absD - 2.15) * 1.5));
      const normDist   = Math.min(1, Math.max(0, (absD - 0.18) / 1.2));
      slot.cMesh.position.set(px, 0, pz + 0.03);
      slot.cMesh.rotation.set(0, ry, 0);
      slot.cMesh.visible                = cf > 0.003;
      slot.cMat.uniforms.uFade.value    = cf;
      slot.cMat.uniforms.uTime.value    = t;
      slot.sMesh.position.set(px, 0, pz - 0.03);
      slot.sMesh.rotation.set(0, ry, 0);
      slot.sMesh.visible                = true;
      slot.sMat.uniforms.uFade.value    = Math.max(sf, 0.12);
      slot.sMat.uniforms.uTime.value    = t;
      slot.sMat.uniforms.uSide.value    = signD;
      slot.sMat.uniforms.uDist.value    = normDist;
    });
    renderer.render(scene, camera);
  }

  function navigate(dir: number) {
    targetPos += dir;
    position   = mod(targetPos, N());
  }

  function onArrowClick(dir: number, e: MouseEvent) {
    e.stopPropagation();
    navigate(dir);
  }

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

  async function handleTitleClick() {
    const idx = mod(Math.round(animPos || 0), N());
    const volunteer = volunteers[idx];
    console.log('Clicked on:', volunteer?.name);
  }

  beforeNavigate(() => {
    document.body.style.overflow   = '';
    document.body.style.paddingTop = '';
  });

  onMount(() => {
    const checkMobile = () => { isMobile = window.innerWidth < 600; };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    const prev = { pt: document.body.style.paddingTop, ov: document.body.style.overflow };
    document.body.style.paddingTop = '0';
    // Non blocchiamo overflow: la hero deve scrollare
    if (!isMobile) {
      buildScene();
      window.addEventListener('resize', onResize);
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.paddingTop = prev.pt;
      document.body.style.overflow   = prev.ov;
      window.removeEventListener('resize', checkMobile);
    };
  });

  onDestroy(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(animFrameId);
    try { renderer?.dispose(); } catch (e) {}
    if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
  });

  // ─── reactive state ───────────────────────────────────────────────
  let currentIndex      = $derived(mod(Math.round(position), N()));
  let visualCenterIndex = $derived(mod(Math.round(visualPos), N()));
  let currentVolunteer  = $derived(volunteers[mod(Math.round(position), N())]);

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

  let leftOutgoingImage  = $derived(volunteers[mod(visualCenterIndex - 1, N())]?.image ?? '');
  let leftIncomingImage  = $derived(volunteers[mod(visualCenterIndex + transitionDirection - 1, N())]?.image ?? leftOutgoingImage);
  let rightOutgoingImage = $derived(volunteers[mod(visualCenterIndex + 1, N())]?.image ?? '');
  let rightIncomingImage = $derived(volunteers[mod(visualCenterIndex + transitionDirection + 1, N())]?.image ?? rightOutgoingImage);

  // Split name into one word per line
  let nameWords = $derived(currentVolunteer?.name?.split(' ') ?? []);
</script>

<main class="about-page">

  <!-- ══════════════════════════════════════════════════════════════
       HERO — titolo + corpo testo
  ══════════════════════════════════════════════════════════════ -->
  <section class="hero">
    <h1>
      <span class="h1-outline">CHI C'È DIETRO</span>
      <span class="h1-fill">FUORI CAMPO?</span>
    </h1>

    <p class="hero-body">
      Vogliamo raccontare le Olimpiadi attraverso gli occhi di chi le ha
      costruite restando nell'ombra. Questo progetto celebra i volontari:
      il motore invisibile che, con dedizione silenziosa, ha permesso a Milano
      Cortina 2026 di brillare.
    </p>
  </section>

<!-- ══════════════════════════════════════════════════════════════════
     MOBILE
══════════════════════════════════════════════════════════════════ -->
{#if isMobile}
<section class="mobile-carousel" id="main-content"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
  aria-label="Volunteer carousel"
>
  {#key currentIndex}
    <div
      class="mobile-bg"
      style="background-image: url('{volunteers[currentIndex]?.image}')"
      in:fade={{ duration: 500, delay: 80 }}
      out:fade={{ duration: 400 }}
    ></div>
  {/key}

  <div class="mobile-blur mobile-blur--top"    aria-hidden="true"></div>
  <div class="mobile-blur mobile-blur--bottom" aria-hidden="true"></div>

  <div class="mobile-info">
    <span class="vol-subtitle">{currentVolunteer?.subtitle}</span>
    <span class="vol-role">{currentVolunteer?.role}</span>
    <div class="vol-name-lines">
      {#each nameWords as word}
        <span class="vol-name-word">{word}</span>
      {/each}
    </div>
  </div>

  <a class="scopri-btn" href="#">SCOPRI DI PIÙ</a>

  <div class="mobile-nav-circles">
    <ArrowButton direction="up"   onclick={() => navigate(-1)} />
    <ArrowButton direction="down" onclick={() => navigate(1)}  />
  </div>
</section>

<!-- ══════════════════════════════════════════════════════════════════
     DESKTOP
══════════════════════════════════════════════════════════════════ -->
{:else}
<section class="carousel" id="main-content" bind:this={containerEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
  aria-label="Volunteer carousel"
>
  <canvas bind:this={canvasEl}></canvas>

  <!-- Edge blur panels -->
  <div class="edge-panel edge-panel--left" aria-hidden="true">
    <div class="edge-panel__layer" style={`background-image: url('${leftOutgoingImage}'); opacity:${1 - edgeBlend};`}></div>
    <div class="edge-panel__layer" style={`background-image: url('${leftIncomingImage}'); opacity:${edgeBlend};`}></div>
  </div>
  <div class="edge-panel edge-panel--right" aria-hidden="true">
    <div class="edge-panel__layer" style={`background-image: url('${rightOutgoingImage}'); opacity:${1 - edgeBlend};`}></div>
    <div class="edge-panel__layer" style={`background-image: url('${rightIncomingImage}'); opacity:${edgeBlend};`}></div>
  </div>

  <!-- Arrows -->
  <div class="arrow-left"  onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="left"  onclick={(e) => onArrowClick(-1, e)} />
  </div>
  <div class="arrow-right" onpointerdown={(e) => e.stopPropagation()}>
    <ArrowButton direction="right" onclick={(e) => onArrowClick(1,  e)} />
  </div>

  <!-- Curved masks -->
  <div class="curve-frame" aria-hidden="true">
    <svg class="curve curve-top"    viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z" />
    </svg>
    <svg class="curve curve-bottom" viewBox="0 0 1000 260" preserveAspectRatio="none">
      <path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z" />
    </svg>
  </div>

  <!-- Sfumatura nera dietro al testo, sopra la card centrale -->
  <svg class="card-bottom-fade" aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="none">
    <defs>
      <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="#000" stop-opacity="0" />
        <stop offset="38%" stop-color="#000" stop-opacity="0.4" />
        <stop offset="72%" stop-color="#000" stop-opacity="0.78" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.92" />
      </linearGradient>
    </defs>
    <path d="M0,0 H1000 V145 C780,85 220,85 0,145 Z" fill="url(#fadeGrad)" />
  </svg>

  <!--
    Overlay testi: centrato sull'immagine, testi in basso a sinistra,
    bottone in basso a destra — identico allo screenshot.
  -->
  <div class="card-overlay" aria-live="polite">
    <div class="overlay-inner">
      <!-- Info a sinistra: subtitle + role + nome -->
      <div class="vol-info-block"
        role="button" tabindex="0"
        onclick={handleTitleClick}
        onkeydown={(e) => { if (e.key === 'Enter') handleTitleClick(); }}
      >
        <span class="vol-subtitle">{currentVolunteer?.subtitle}</span>
        <span class="vol-role">{currentVolunteer?.role}</span>
        <div class="vol-name-lines">
          {#each nameWords as word}
            <span class="vol-name-word">{word}</span>
          {/each}
        </div>
      </div>

      <!-- Bottone in basso a destra -->
      <a class="scopri-desktop-btn" href="#">SCOPRI DI PIÙ</a>
    </div>
  </div>

</section>
{/if}

</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary, #0e0e0e);
  }

  /* ══════════════════════════════════════════════════════════════════
     DESKTOP CAROUSEL
  ══════════════════════════════════════════════════════════════════ */

  /* ── Page shell ─────────────────────────────────────────────── */
  .about-page {
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-body, #fafafa);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* ── Hero ────────────────────────────────────────────────────── */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding:
      clamp(56px, 8vh, 110px)
      clamp(24px, 5.5vw, 80px)
      clamp(32px, 4vh, 56px)
      clamp(24px, 5.5vw, 80px);
  }

  h1 {
    margin: 0;
    display: flex;
    flex-direction: column;
    line-height: 1;
    align-items: flex-end;
  }

  /* "CHI C'È DIETRO" — outline, right-aligned */
  .h1-outline {
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: clamp(40px, calc(116px / max(var(--page-zoom,1), 0.65)), 180px);
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) var(--color-content-accent, #bdff5d);
    display: block;
    white-space: nowrap;
  }

  /* "FUORI CAMPO?" — fill, right-aligned */
  .h1-fill {
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: clamp(48px, calc(140px / max(var(--page-zoom,1), 0.65)), 220px);
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-accent, #bdff5d);
    display: block;
    white-space: nowrap;
    margin-top: -0.05em;
  }

  /* Body copy — dimensione h2 */
  .hero-body {
    margin: clamp(24px, 4vh, 48px) 0 0;
    max-width: clamp(500px, 60vw, 820px);
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: var(--font-size-h2, clamp(28px, 3.5vw, 56px));
    font-weight: 500;
    line-height: 1.08;
    letter-spacing: 0;
    color: var(--color-content-body, #fafafa);
  }

  /* ── Carousel wrapper (desktop) ──────────────────────────────── */
  /*
   * position: sticky + height: 100vh = il carousel occupa tutto lo
   * schermo esattamente come prima (fixed), ma nel flusso normale
   * della pagina — la hero sta sopra e si scrolla fino al carousel.
   */
  .carousel {
    position: sticky;
    top: 0;
    width: 100%;
    height: 100vh;
    flex-shrink: 0;
    background: var(--color-background-primary, #0e0e0e);
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
    background: linear-gradient(
      180deg,
      rgba(255,255,255,0.03) 0%,
      rgba(255,255,255,0.01) 5%,
      rgba(0,0,0,0)          18%,
      rgba(0,0,0,0.18)       100%
    );
    pointer-events: none;
    z-index: 1;
  }

  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  /* ── Edge blur panels ─────────────────────────────────────────── */
  .edge-panel {
    position: absolute;
    top: 0; bottom: 0;
    width: min(30vw, 460px);
    pointer-events: none;
    z-index: 2;
    overflow: hidden;
  }
  .edge-panel__layer {
    position: absolute;
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
    mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%);
  }
  .edge-panel--right {
    right: 0;
    border-radius: 32px 0 0 32px;
    transform-origin: right center;
    transform: scaleX(1.22);
    mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%);
  }
  .edge-panel--left::after,
  .edge-panel--right::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    pointer-events: none;
  }
  .edge-panel--left::after {
    left: 0; width: 100%;
    background: linear-gradient(90deg,  rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.36) 24%, rgba(0,0,0,0.14) 52%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.42) 88%, rgba(0,0,0,0.75) 100%);
  }
  .edge-panel--right::after {
    right: 0; width: 100%;
    background: linear-gradient(270deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.36) 24%, rgba(0,0,0,0.14) 52%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.42) 88%, rgba(0,0,0,0.75) 100%);
  }

  /* ── Curve masks ──────────────────────────────────────────────── */
  .curve-frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }
  .curve {
    position: absolute;
    left: 0; width: 100%;
    fill: var(--color-background-primary, #0e0e0e);
  }
  .curve-top    { top: 0;    height: clamp(120px, 30vh, 260px); }
  .curve-bottom { bottom: 0; height: clamp(110px, 28vh, 240px); }

  /* ── Arrows ───────────────────────────────────────────────────── */
  .arrow-left {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    left: var(--spacing-5, 24px);
    z-index: 12;
  }
  .arrow-right {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    right: var(--spacing-5, 24px);
    z-index: 12;
  }
  @media (min-width: 768px) {
    .arrow-left  { left:  var(--spacing-8,  48px); }
    .arrow-right { right: var(--spacing-8,  48px); }
  }
  @media (min-width: 1024px) {
    .arrow-left  { left:  var(--spacing-11, 72px); }
    .arrow-right { right: var(--spacing-11, 72px); }
  }

  /* ── Sfumatura nera dietro al testo, sulla foto centrale ───────── */
  .card-bottom-fade {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: clamp(10px, 28vh, 40px);
    pointer-events: none;
    z-index: 4;
  }

  /* ── Card overlay: allineato alla card centrale ───────────────── */
  /*
   * La card centrale occupa ~34% della larghezza del viewport (CARD_W 3.2
   * su un FOV 52° alla distanza della camera). L'overlay usa la stessa
   * larghezza e sta centrato orizzontalmente, con i testi in basso a
   * sinistra e il bottone in basso a destra — identico allo screenshot.
   */
  .card-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;

    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .overlay-inner {
    width: clamp(280px, 34vw, 560px);
    /*
     * Testo/bottone spostati più in basso rispetto alla curva:
     * sottraiamo invece di aggiungere margine rispetto all'altezza
     * della curva bottom, per farli scendere più vicino al bordo.
     */
    padding-bottom: calc(clamp(110px, 28vh, 240px) - 40px);
    padding-left:  24px;
    padding-right: 24px;

    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: clamp(12px, 1.5vw, 24px);

    pointer-events: auto;
  }

  /* Info a sinistra */
  .vol-info-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* "STUDENTESSA IN DESIGN DELLA COMUNICAZIONE" */
  .vol-subtitle {
    display: block;
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: clamp(7px, 0.65vw, 10px);
    font-weight: 400;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.85);
    margin-bottom: clamp(3px, 0.4vh, 6px);
    white-space: nowrap;
  }

  /* "UX – UI DESIGNER E CODE REVIEWER" */
  .vol-role {
    display: block;
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: clamp(12px, 1.25vw, 18px);
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    color: #ffffff;
    line-height: 1.15;
    margin-bottom: clamp(4px, 0.6vh, 10px);
    white-space: normal;
  }

  /* SOLIDORO / CLAUDIA / IRENE — una parola per riga */
  .vol-name-lines {
    display: flex;
    flex-direction: column;
    line-height: 0.9;
  }

  .vol-name-word {
    display: block;
    font-family: var(--font-display, 'Forma DJR Display', sans-serif);
    font-size: clamp(32px, 3.8vw, 62px);
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-content-accent, #bdff5d);
    white-space: nowrap;
  }

  /* Bottone SCOPRI DI PIÙ — bottom-right della card */
  .scopri-desktop-btn {
    flex: 0 0 auto;
    align-self: flex-end;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: clamp(9px, 1vh, 14px) clamp(16px, 1.6vw, 26px);
    border: 1.5px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-accent, #bdff5d);
    font-family: var(--font-display, sans-serif);
    font-size: clamp(10px, 0.85vw, 13px);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background 200ms ease, box-shadow 200ms ease;
    pointer-events: auto;
  }
  .scopri-desktop-btn:hover,
  .scopri-desktop-btn:focus-visible {
    background: rgba(189,255,93,0.08);
    box-shadow: 0 0 16px rgba(189,255,93,0.22);
  }

  /* ══════════════════════════════════════════════════════════════════
     MOBILE CAROUSEL
  ══════════════════════════════════════════════════════════════════ */

  .mobile-carousel {
    position: fixed;
    inset: 0;
    background: var(--color-background-primary, #0e0e0e);
    overflow: hidden;
  }

  /* Sul mobile il carousel è fixed e fullscreen: nascondi la hero */
  @media (max-width: 599px) {
    .hero { display: none; }
  }

  .mobile-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .mobile-blur {
    position: absolute;
    left: 0; right: 0;
    height: 44%;
    pointer-events: none;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .mobile-blur--top {
    top: 0;
    background: linear-gradient(180deg, rgba(14,14,14,0.35) 0%, rgba(14,14,14,0) 100%);
    mask-image: linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%);
  }
  .mobile-blur--bottom {
    bottom: 0;
    background: linear-gradient(0deg,
      rgba(14,14,14,1)   0%,
      rgba(14,14,14,1)   28%,
      rgba(14,14,14,0.7) 50%,
      rgba(14,14,14,0)   100%
    );
    mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(0deg, #000 0%, #000 32%, rgba(0,0,0,0) 100%);
  }

  /* Info mobile — stessa struttura desktop ma senza bottone inline */
  .mobile-info {
    position: absolute;
    left: 0; right: 0;
    bottom: 100px;
    padding: var(--spacing-6, 24px) var(--spacing-5, 20px);
    display: flex;
    flex-direction: column;
    pointer-events: none;
    z-index: 3;
  }

  /* Riuso le stesse classi .vol-subtitle / .vol-role / .vol-name-lines
     ma con override mobile */
  .mobile-info .vol-subtitle {
    font-size: 9px;
    margin-bottom: 4px;
  }
  .mobile-info .vol-role {
    font-size: 14px;
    margin-bottom: 6px;
  }
  .mobile-info .vol-name-lines {
    line-height: 0.88;
  }
  .mobile-info .vol-name-word {
    font-size: 43px;
  }

  /* Bottone mobile */
  .scopri-btn {
    position: absolute;
    left: var(--spacing-5, 20px);
    bottom: 36px;
    width: 238px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-3, 12px) 0;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: var(--color-background-primary, #0e0e0e);
    color: var(--color-content-accent, #bdff5d);
    font-family: var(--font-display, sans-serif);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    z-index: 4;
    transition: background 220ms ease, box-shadow 220ms ease;
  }
  .scopri-btn:hover,
  .scopri-btn:focus-visible {
    background: rgba(189,255,93,0.08);
    box-shadow: 0 0 16px rgba(189,255,93,0.22);
  }

  .mobile-nav-circles {
    position: absolute;
    right: var(--spacing-5, 20px);
    bottom: 36px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5, 20px);
    z-index: 4;
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .vol-subtitle, .vol-role, .vol-name-word { transition: none; }
  }
</style>