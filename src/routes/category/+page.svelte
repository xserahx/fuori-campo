<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import "../../lib/styles/tokens.css";
  import { blurReveal } from "../../lib/actions/blurReveal";
  import Navbar from "../../lib/components/Navbar.svelte";

  const projects = [
    {
      id: 1,
      titleLines: ['RELAZIONI', 'E COMUNICAZIONE'],
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    },
    {
      id: 2,
      titleLines: ['CERIMONIE', 'E REVENUE'],
      image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&q=80',
    },
    {
      id: 3,
      titleLines: ['SPORT', 'E DISCIPLINE'],
      image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80',
    },
    {
      id: 4,
      titleLines: ['AREA ORGANIZZATIVA', 'E SERVIZI GENERALI'],
      image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
    },
    {
      id: 5,
      titleLines: ['LOGISTICA', 'E TERRITORIO'],
      image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&q=80',
    },
    {
      id: 6,
      titleLines: ['GESTIONE OPERATIVA', 'E FAN EXPERIENCE'],
      image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    },
  ];

  let container: HTMLDivElement | null = null;
  let renderer: any = null;
  let scene: any   = null;
  let camera: any  = null;
  let cards: any[] = [];
  let animFrameId: number | null = null;
  let targetIndex  = $state(0);
  let currentIndex = $state(0);
  let isDragging   = false;
  let dragStartX   = 0;
  let dragStartIdx = 0;

  const goPrevious = () => { targetIndex = targetIndex - 1; };
  const goNext     = () => { targetIndex = targetIndex + 1; };

  const N = projects.length;

  // ─── ARC GEOMETRY ─────────────────────────────────────────────────────────
  // Camera at z=3.0, FOV=52°, aspect≈16/9
  //   → viewport at z=0 is ~5.2w × 2.93h world units
  // CARD_SIZE = 2.1  → card is 72% of vh, 40% of vw — large & cinematic
  // ARC_RADIUS = 6   → pronounced curve, noticeable bow
  // ARC_SPREAD computed so chord = CARD_SIZE (seamless touching edges)
  // 5-card span ≈ 9.9 world units > 5.2vp → sides bleed off-screen ✓
  const ARC_RADIUS = 6.0;
  const GALLERY_RADIUS = 14.0;
  // CARD_SIZE computed dynamically to match viewport fractions (width/height)
  let CARD_SIZE = 2.1;
  let ARC_SPREAD = 2 * Math.asin(CARD_SIZE / (2 * GALLERY_RADIUS)); // updated later

  // big circular gallery: panels follow one wide, continuous arc
  const RIBBON_TIGHTNESS = 1.0;
  const CARD_OVERLAP = 1.0;
  const RIBBON_LIFT = 0.0;

  // Desired fractions of the viewport the center card should occupy
  const DESIRED_WIDTH_FRAC = 0.40; // 40% of viewport width
  const DESIRED_HEIGHT_FRAC = 0.72; // 72% of viewport height

  onMount(() => {
    let disposed = false;
    let cleanup  = () => {};

    const init = async () => {
      const THREE = await import('three');
      if (!container || disposed) return;

      // ── Scene ──
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1A1A1A);

      camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.01, 100);
      camera.position.set(0, 0, 3.0);
      camera.lookAt(0, 0, 0);

      const computeCardSize = () => {
        if (!camera) return;
        // world space height at z=0 seen by the camera
        const fovRad = (camera.fov * Math.PI) / 180;
        const distance = camera.position.z; // camera z from origin
        const worldHeight = 2 * distance * Math.tan(fovRad / 2);
        const cw = container ? container.clientWidth : window.innerWidth;
        const ch = container ? container.clientHeight : window.innerHeight;
        const worldWidth = worldHeight * (cw / ch);
        const desiredW = worldWidth * DESIRED_WIDTH_FRAC;
        const desiredH = worldHeight * DESIRED_HEIGHT_FRAC;
        CARD_SIZE = Math.min(desiredW, desiredH);
        ARC_SPREAD = 2 * Math.asin(Math.min(CARD_SIZE, GALLERY_RADIUS * 1.999) / (2 * GALLERY_RADIUS));
      };

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.sortObjects = true;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;z-index:0;';
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.0));

      // ── Shaders ──
      const vert = /* glsl */`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
        }`;

      // object-fit:cover + multi-pass gaussian blur + brightness
      const frag = /* glsl */`
        precision mediump float;
        uniform sampler2D uMap;
        uniform float uAspect;   // image natural w/h
        uniform float uBright;   // [0,1]
        uniform float uBlur;     // blur radius in normalised units
        varying vec2 vUv;

        vec2 coverUV(vec2 uv, float ia){
          vec2 c = uv - 0.5;
          if(ia > 1.0) c.x *= 1.0 / ia;
          else         c.y *= ia;
          return c + 0.5;
        }

        vec4 blur(vec2 uv, float r){
          if(r < 0.5) return texture2D(uMap, uv);
          float s = r * 0.0018;
          vec4 col = texture2D(uMap, uv) * 0.204;
          col += (texture2D(uMap,uv+vec2(s,0.))  + texture2D(uMap,uv-vec2(s,0.)))  * 0.183;
          col += (texture2D(uMap,uv+vec2(0.,s))  + texture2D(uMap,uv-vec2(0.,s)))  * 0.183;
          col += (texture2D(uMap,uv+vec2(s*2.,0.))  + texture2D(uMap,uv-vec2(s*2.,0.)))  * 0.122;
          col += (texture2D(uMap,uv+vec2(0.,s*2.))  + texture2D(uMap,uv-vec2(0.,s*2.)))  * 0.122;
          col += (texture2D(uMap,uv+vec2(s*3.,0.))  + texture2D(uMap,uv-vec2(s*3.,0.)))  * 0.054;
          col += (texture2D(uMap,uv+vec2(0.,s*3.))  + texture2D(uMap,uv-vec2(0.,s*3.)))  * 0.054;
          col += (texture2D(uMap,uv+vec2(s*4.,0.))  + texture2D(uMap,uv-vec2(s*4.,0.)))  * 0.017;
          col += (texture2D(uMap,uv+vec2(0.,s*4.))  + texture2D(uMap,uv-vec2(0.,s*4.)))  * 0.017;
          return col;
        }

        void main(){
          vec2 uv = coverUV(vUv, uAspect);
          // clamp so cover-uv never samples outside [0,1]
          uv = clamp(uv, 0.001, 0.999);
          vec4 col = blur(uv, uBlur);
          float leftFade = smoothstep(0.01, 0.10, vUv.x);
          float rightFade = 1.0 - smoothstep(0.90, 0.99, vUv.x);
          float edgeFade = leftFade * rightFade;
          gl_FragColor = vec4(col.rgb * uBright, edgeFade);
        }`;

      // ── Build cards ──
      const loader = new THREE.TextureLoader();
      cards = [];

      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        const tex: any = await new Promise<any>((res) =>
          loader.load(p.image, res, () => {}, () => res(null))
        );
        if (disposed) return;

        if (tex) {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
        }

        const aspect = tex ? tex.image.width / tex.image.height : 1.0;

        const mat: any = new THREE.ShaderMaterial({
          uniforms: {
            uMap:    { value: tex },
            uAspect: { value: aspect },
            uBright: { value: 1.0 },
            uBlur:   { value: 0.0 },
          },
          vertexShader: vert,
          fragmentShader: frag,
          transparent: true,
          depthWrite: false,
          depthTest: true,
        });

        // Square card — no border plane, clean edge
        // create a unit plane and scale it so we can update size on resize
        const meshGeom = new THREE.PlaneGeometry(1, 1);
        const mesh: any = new THREE.Mesh(meshGeom, mat);
        mesh.scale.set(CARD_SIZE, CARD_SIZE, 1);

        const group: any = new THREE.Group();
        group.add(mesh);
        group.userData = { mat, index: i };
        scene.add(group);
        cards.push(group);
      }

      // compute initial dynamic card size, apply to all existing meshes
      computeCardSize();
      for (const g of cards) {
        const m = g.children[0];
        if (m) m.scale.set(CARD_SIZE, CARD_SIZE, 1);
      }

      positionCards(0);

      // ── Input ──
      const el = renderer.domElement;

      const onDown = (e: MouseEvent | TouchEvent) => {
        isDragging  = true;
        dragStartX  = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dragStartIdx = targetIndex;
      };
      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        // allow continuous fractional index; wrapping handled in rendering
        targetIndex = dragStartIdx - (x - dragStartX) / 180;
      };
      const onUp = () => {
        if (!isDragging) return;
        isDragging  = false;
        // snap to nearest integer index (can be outside 0..N-1)
        targetIndex = Math.round(targetIndex);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetIndex = targetIndex + (e.deltaY > 0 ? 1 : -1);
      };
      const onResize = () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        // recompute card size and arc spread, update meshes
        computeCardSize();
        for (const g of cards) {
          const m = g.children[0];
          if (m) m.scale.set(CARD_SIZE, CARD_SIZE, 1);
        }
        positionCards(currentIndex);
      };

      el.addEventListener('mousedown',  onDown   as EventListener);
      window.addEventListener('mousemove', onMove as EventListener);
      window.addEventListener('mouseup',   onUp);
      el.addEventListener('touchstart', onDown as EventListener, { passive: true });
      window.addEventListener('touchmove', onMove as EventListener, { passive: true });
      window.addEventListener('touchend',  onUp);
      el.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', onResize);

      // ── Animate ──
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const animate = () => {
        if (disposed) return;
        animFrameId = requestAnimationFrame(animate);
        currentIndex = lerp(currentIndex, targetIndex, 0.1);
        positionCards(currentIndex);
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        el.removeEventListener('mousedown',  onDown   as EventListener);
        window.removeEventListener('mousemove', onMove as EventListener);
        window.removeEventListener('mouseup',   onUp);
        el.removeEventListener('touchstart', onDown as EventListener);
        window.removeEventListener('touchmove', onMove as EventListener);
        window.removeEventListener('touchend',  onUp);
        el.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', onResize);
      };
    };

    void init();
    return () => {
      disposed = true;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      cleanup();
      renderer?.dispose();
    };
  });

  // ─── POSITION CARDS ────────────────────────────────────────────────────────
  function positionCards(ci: number) {
    // compute an x-shift so the rounded active card is exactly centered
    const rounded = Math.round(ci);
    const effectiveSpread = ARC_SPREAD * RIBBON_TIGHTNESS;
    const centerShift = Math.sin((rounded - ci) * effectiveSpread) * GALLERY_RADIUS;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;

      // compute wrapped offset on a circular list so cards repeat around ends
      const n = cards.length;
      // compute shortest circular offset from ci to index i
      let raw = i - ci;
      raw = ((raw + n / 2) - Math.floor((raw + n / 2) / n) * n) - n / 2;
      const offset = raw;
      const absOffset = Math.abs(offset);

      // Hide cards beyond ±3 slots
      if (absOffset >= 3.5) { card.visible = false; continue; }
      card.visible = true;

      const angle = offset * effectiveSpread;
      const bandY = -Math.sin(Math.abs(angle) * 0.85) * RIBBON_LIFT;

      // True cylindrical arc: x along tangent, z recedes by (R - R·cosθ)
      card.position.set(
        Math.sin(angle) * GALLERY_RADIUS - centerShift,
        bandY,
        -(GALLERY_RADIUS - GALLERY_RADIUS * Math.cos(angle))
      );
      card.rotation.y = -angle;  // always face camera
      card.scale.setScalar(CARD_OVERLAP); // tiny overlap hides seams between panels

      // Render order: center card on top, prevents edge-bleed on side cards
      card.renderOrder = 200 - Math.round(absOffset * 40);

      const mat = card.userData?.mat;
      if (!mat) continue;

      // Brightness: 1.0 at centre, dims to 0.15 at ±3
      mat.uniforms.uBright.value = Math.max(0.15, 1.0 - absOffset * 0.35);

      // Blur: keep the center crisp, but make side panels feel softer and more atmospheric
      mat.uniforms.uBlur.value = absOffset <= 0.6
        ? 0
        : Math.min(36, (absOffset - 0.45) * 24);
    }
  }

  onDestroy(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderer?.dispose();
  });

  const activeProject = $derived(projects[(((Math.round(currentIndex) % N) + N) % N)] ?? projects[0]);
  const nextProject   = $derived(projects[(((Math.round(currentIndex) + 1) % N) + N) % N] ?? null);
</script>

<style>
  .carousel-section {
    position: relative;
    width: 100%;
    height: 100vh;
    background: #050505;
    overflow: hidden;
    cursor: grab;
    user-select: none;
    font-family: var(--font-display);
  }
  .carousel-section:active { cursor: grabbing; }

  .three-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .curve-guide {
    position: absolute;
    left: -6vw;
    right: -6vw;
    bottom: 15vh;
    width: 112vw;
    height: 26vh;
    z-index: 0;
    pointer-events: none;
    overflow: visible;
  }

  .curve-guide path {
    fill: none;
    stroke: rgba(189, 255, 93, 0.26);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 10px rgba(189, 255, 93, 0.08));
  }

  .carousel-section{ background: #1A1A1A; }

  /* ── Titolo — bottom-left overlay ── */
  .project-meta {
    position: absolute;
    left: 24px;
    bottom: 24px;
    transform: none;
    pointer-events: none;
    z-index: 2;
    width: max-content;
  }
  .project-title {
    position: relative;
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    white-space: nowrap;
    font-size: clamp(44px, 7.5vw, 108px);
    line-height: 1.08;
    text-align: left;
  }
  .project-title--filled {
    display: block;
    bottom: -20px;
    left: 20px;
    color: #BDFF5D;
  }
  .project-title--outlined {
    display: block;
    bottom: 4px;
    left: 360px;
    color: transparent;
    -webkit-text-stroke: 3px #BDFF5D;
  }

  /* ── Frecce laterali ── */
  .nav {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }
  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(255,255,255,0.75);
    display: grid;
    place-items: center;
    cursor: pointer;
    pointer-events: auto;
    font-size: 38px;
    line-height: 1;
    transition: color .15s;
  }
  .nav-btn:hover { color: #fff; }
  .nav-btn--left  { left:  clamp(10px, 1.2vw, 22px); }
  .nav-btn--right { right: clamp(10px, 1.2vw, 22px); }

  /* ── Dots ── */
  .dots {
    position: absolute;
    bottom: 1.6rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 7px;
    pointer-events: none;
    z-index: 2;
  }
  .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transition: background .3s, transform .3s;
  }
  .dot.active { background: #fff; transform: scale(1.5); }
</style>

<section class="carousel-section">
  <Navbar />

  <div class="three-canvas" bind:this={container}></div>

  <div class="project-meta">
    <h2 class="project-title project-title--filled">{activeProject.titleLines[0]}</h2>
    <h2 class="project-title project-title--outlined">{activeProject.titleLines[1]}</h2>
  </div>

  <div class="nav" aria-label="Navigazione carosello">
    <button class="nav-btn nav-btn--left"  aria-label="Precedente" onclick={goPrevious}>&#8249;</button>
    <button class="nav-btn nav-btn--right" aria-label="Successivo" onclick={goNext}>&#8250;</button>
  </div>

  <div class="dots" role="tablist" aria-label="Posizione carosello"
    use:blurReveal={{ direction: "left", variant: "slide", blur: 10, threshold: 0.1, delay: 140 }}>
    {#each projects as _, i}
      <div class="dot" class:active={(((Math.round(currentIndex) % N) + N) % N) === i}
        role="tab" aria-selected={(((Math.round(currentIndex) % N) + N) % N) === i}></div>
    {/each}
  </div>

  <svg class="curve-guide" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
    <path d="M 0 180 C 180 60, 320 40, 500 150 C 680 260, 820 240, 1000 120" />
  </svg>
</section>