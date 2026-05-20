<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import "../../lib/styles/tokens.css";
  import { blurReveal } from "../../lib/actions/blurReveal";

  // --- CONFIG ---
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
      titleLines: ['AREA ORGANIZZATIVA', 'E SERVIZI GENERALI'],
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
  let scene: any = null;
  let camera: any = null;
  let cards: any[] = [];
  let animFrameId: number | null = null;
  let targetIndex = $state(0);
  let currentIndex = $state(0);
  let isDragging = false;
  let dragStartX = 0;
  let dragStartIndex = 0;
  let dragDeltaX = 0;
  const goPrevious = () => {
    targetIndex = Math.max(Math.round(targetIndex) - 1, 0);
  };
  const goNext = () => {
    targetIndex = Math.min(Math.round(targetIndex) + 1, projects.length - 1);
  };

  // ─── ARC GEOMETRY ───────────────────────────────────────────────────────────
  // The card width on the arc equals the chord length = 2·R·sin(spread/2).
  // We want cards to butt together seamlessly, so chord ≈ CARD_W.
  // We pick R then compute the angular spread that makes chord = CARD_W.
  const ARC_RADIUS = 7.0;          // larger radius = flatter arc
  const CARD_W     = 2.6;           // world-units wide
  const CARD_H     = 3.4;           // world-units tall
  // spread so that arc-chord ≈ card width (slight overlap keeps them flush)
  const ARC_SPREAD = 2 * Math.asin((CARD_W * 0.97) / (2 * ARC_RADIUS));

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};

    const init = async () => {
      const THREE = await import('three');
      if (!container || disposed) return;

      // ── SCENE ──
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);

      camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      );
      // Pull camera back slightly so all cards fill nicely
      camera.position.set(0, 0, 0.5);
      camera.lookAt(0, 0, -1);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.zIndex = '0';
      container.appendChild(renderer.domElement);

      // Light — keep it soft so the darkening vignette is the main effect
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const dir: any = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0, 2, 5);
      scene.add(dir);

      // ── BUILD CARDS ──
      const loader = new THREE.TextureLoader();
      cards = [];

      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];

        const tex = await new Promise<any>((res) => {
          loader.load(p.image, res, () => {}, () => res(null));
        });
        if (disposed) return;

        // Main image plane
        const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
        const mat: any = new THREE.MeshStandardMaterial({
          map: tex ?? null,
          color: tex ? 0xffffff : 0x1a1a2e,
          roughness: 0.8,
          metalness: 0.0,
        });
        const mesh: any = new THREE.Mesh(geo, mat);

        // Very thin gap seam (2px equivalent in world-space)
        const seamMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const seamGeo = new THREE.PlaneGeometry(CARD_W + 0.012, CARD_H + 0.012);
        const seam: any = new THREE.Mesh(seamGeo, seamMat);
        seam.position.z = -0.001;

        const group: any = new THREE.Group();
        group.add(seam);
        group.add(mesh);
        group.userData = { index: i };
        scene.add(group);
        cards.push(group);
      }

      positionCards(0);

      // ── INPUT ──
      const el = renderer.domElement;

      const onDown = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        dragStartX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dragStartIndex = targetIndex;
        dragDeltaX = 0;
      };

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dragDeltaX = x - dragStartX;
        // Live-drag: shift index continuously while dragging
        const sensitivity = 180; // px per card step
        targetIndex = Math.max(0, Math.min(
          projects.length - 1,
          dragStartIndex - dragDeltaX / sensitivity
        ));
      };

      const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        // Snap to nearest integer
        targetIndex = Math.max(0, Math.min(projects.length - 1, Math.round(targetIndex)));
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetIndex = Math.max(0, Math.min(
          projects.length - 1,
          Math.round(targetIndex) + (e.deltaY > 0 ? 1 : -1)
        ));
      };

      const onResize = () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      el.addEventListener('mousedown', onDown as EventListener);
      window.addEventListener('mousemove', onMove as EventListener);
      window.addEventListener('mouseup', onUp);
      el.addEventListener('touchstart', onDown as EventListener, { passive: true });
      window.addEventListener('touchmove', onMove as EventListener, { passive: true });
      window.addEventListener('touchend', onUp);
      el.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', onResize);

      // ── ANIMATE ──
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const animate = () => {
        if (disposed) return;
        animFrameId = requestAnimationFrame(animate);
        currentIndex = lerp(currentIndex, targetIndex, 0.09);
        positionCards(currentIndex);
        renderer?.render(scene, camera);
      };
      animate();

      cleanup = () => {
        el.removeEventListener('mousedown', onDown as EventListener);
        window.removeEventListener('mousemove', onMove as EventListener);
        window.removeEventListener('mouseup', onUp);
        el.removeEventListener('touchstart', onDown as EventListener);
        window.removeEventListener('touchmove', onMove as EventListener);
        window.removeEventListener('touchend', onUp);
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

  // ─── POSITION CARDS ON ARC ──────────────────────────────────────────────────
  function positionCards(ci: number) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;

      const offset = i - ci;
      const angle  = offset * ARC_SPREAD;

      // Place card on cylinder surface
      const x =  Math.sin(angle) * ARC_RADIUS;
      const z = -Math.cos(angle) * ARC_RADIUS;
      card.position.set(x, 0, z);

      // Rotate to face the camera (tangent to cylinder)
      card.rotation.y = -angle;

      // No size scaling — all cards same size, seamless strip
      card.scale.setScalar(1.0);

      // Darken cards away from centre (the bay-window vignette)
      const dist = Math.abs(offset);
      const brightness = Math.max(0.08, 1.0 - dist * 0.28);
      const imgMesh = card.children[1] as any;
      if (imgMesh?.material) {
        imgMesh.material.color.setScalar(brightness);
      }
    }
  }

  onDestroy(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderer?.dispose();
  });

  const activeProject = $derived(projects[Math.round(currentIndex)] ?? projects[0]);
  const nextProject   = $derived(projects[Math.round(currentIndex) + 1] ?? null);
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

  /* ── bottom-left title ── */
  .project-meta {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }
  .project-title {
    position: absolute;
    margin: 0;
    padding: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-style: normal;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: nowrap;
    font-size: 115.942px;
    line-height: 139.13px;
  }
  .project-title--filled {
    left: 4.3vw;
    top: 70.3vh;
    color: #BDFF5D;
  }
  .project-title--outlined {
    left: 25.4vw;
    top: 83.3vh;
    color: #000C0E;
    -webkit-text-stroke-width: 4.03px;
    -webkit-text-stroke-color: #BDFF5D;
  }

  /* ── side arrows ── */
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
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    pointer-events: auto;
    font-family: var(--font-display);
    font-size: 32px;
    line-height: 1;
  }
  .nav-btn--left {
    left: clamp(16px, 1.7vw, 30px);
  }
  .nav-btn--right {
    right: clamp(16px, 1.7vw, 30px);
  }
  .nav-btn:hover {
    opacity: 0.9;
  }

  /* ── dots ── */
  .dots {
    position: absolute;
    bottom: 1.4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    pointer-events: none;
    z-index: 2;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    transition: background 0.3s, transform 0.3s;
  }
  .dot.active {
    background: #fff;
    transform: scale(1.45);
  }
</style>

<section class="carousel-section">
  <div class="three-canvas" bind:this={container}></div>

  <div class="project-meta">
    <h2 class="project-title project-title--filled">{activeProject.titleLines[0]}</h2>
    <h2 class="project-title project-title--outlined">{activeProject.titleLines[1]}</h2>
  </div>

  <div class="nav" aria-label="Carousel navigation">
    <button class="nav-btn nav-btn--left" aria-label="Previous" onclick={goPrevious}>&#8249;</button>
    <button class="nav-btn nav-btn--right" aria-label="Next" onclick={goNext}>&#8250;</button>
  </div>

  <div class="dots" role="tablist" aria-label="Carousel position"
    use:blurReveal={{ direction: "left", variant: "slide", blur: 10, threshold: 0.1, delay: 140 }}>
    {#each projects as _, i}
      <div class="dot" class:active={Math.round(currentIndex) === i}
        role="tab" aria-selected={Math.round(currentIndex) === i}></div>
    {/each}
  </div>
</section>