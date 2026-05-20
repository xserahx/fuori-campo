<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // --- CONFIG ---
  const projects = [
    {
      id: 1,
      title: 'LIIKKU',
      category: 'Motion · Fitness',
      year: '2024',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    },
    {
      id: 2,
      title: 'DEEP BLUE',
      category: 'Brand · Identity',
      year: '2024',
      image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&q=80',
    },
    {
      id: 3,
      title: 'AURA',
      category: 'Campaign · Digital',
      year: '2023',
      image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80',
    },
    {
      id: 4,
      title: 'FORMA',
      category: 'Architecture · Film',
      year: '2023',
      image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
    },
    {
      id: 5,
      title: 'NACHT',
      category: 'Fashion · Editorial',
      year: '2023',
      image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&q=80',
    },
    {
      id: 6,
      title: 'STREET IS NOT A HOME',
      category: 'Documentary · Social',
      year: '2022',
      image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    },
    {
      id: 7,
      title: 'KINETIC',
      category: 'Sport · Brand',
      year: '2022',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
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
  let dragDeltaX = 0;
  let velocity = 0;

  // Arc params
  const ARC_RADIUS = 5.5;
  const ARC_SPREAD = 0.38; // radians between cards
  const CARD_W = 2.2;
  const CARD_H = 3.0;

  onMount(() => {
    let disposed = false;

    const init = async () => {
      const THREE = await import('three');

      if (!container) return;

      // --- SCENE ---
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);

      camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 0.1);
      camera.lookAt(0, 0, -1);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      // Subtle ambient + directional light for card sheen
      const ambient: any = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(ambient);
      const dir: any = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(0, 3, 4);
      scene.add(dir);

      // --- BUILD CARDS ---
      const loader = new THREE.TextureLoader();
      cards = [];

      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];

        // Load image texture
          const tex = await new Promise<any>((res) => {
            loader.load(p.image, res, () => {}, () => res(null));
        });

        // Plane geometry
        const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1);
        const mat: any = new THREE.MeshStandardMaterial({
          map: tex || null,
          color: tex ? 0xffffff : 0x1a1a2e,
          roughness: 0.7,
          metalness: 0.1,
        });
        const mesh: any = new THREE.Mesh(geo, mat);

        const group: any = new THREE.Group();
        group.add(mesh);
        group.userData = { index: i, project: p };
        scene.add(group);
        cards.push(group);
      }

      positionCards(0);

      // --- POINTER EVENTS ---
      const el = renderer.domElement;

      const onDown: EventListener = (e) => {
        const event = e as MouseEvent | TouchEvent;
        isDragging = true;
        dragStartX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        dragDeltaX = 0;
        velocity = 0;
      };

      const onMove: EventListener = (e) => {
        const event = e as MouseEvent | TouchEvent;
        if (!isDragging) return;
        const x = 'touches' in event ? event.touches[0].clientX : event.clientX;
        dragDeltaX = x - dragStartX;
      };

      const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        const threshold = 60;
        if (dragDeltaX < -threshold) {
          targetIndex = Math.min(targetIndex + 1, projects.length - 1);
        } else if (dragDeltaX > threshold) {
          targetIndex = Math.max(targetIndex - 1, 0);
        }
        dragDeltaX = 0;
      };

      const onWheel: EventListener = (e) => {
        const event = e as WheelEvent;
        e.preventDefault();
        if (event.deltaY > 0) targetIndex = Math.min(targetIndex + 1, projects.length - 1);
        else targetIndex = Math.max(targetIndex - 1, 0);
      };

      const onResize = () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      el.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      el.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);
      el.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', onResize);

      // --- ANIMATE ---
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const animate = () => {
        if (disposed) return;
        animFrameId = requestAnimationFrame(animate);

        // Smooth index
        currentIndex = lerp(currentIndex, targetIndex, 0.08);
        positionCards(currentIndex);

        renderer?.render(scene, camera);
      };

      animate();

      cleanup = () => {
        el.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        el.removeEventListener('touchstart', onDown);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
        el.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', onResize);
      };

      return cleanup;
    };

    let cleanup = () => {};
    void init();

    return () => {
      disposed = true;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      cleanup();
      renderer?.dispose();
    };
  });

  function positionCards(ci: number) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;

      const offset = i - ci;
      const angle = offset * ARC_SPREAD;

      // Arc: cards sit on a cylinder around the camera
      const x = Math.sin(angle) * ARC_RADIUS;
      const z = -Math.cos(angle) * ARC_RADIUS;

      card.position.set(x, 0, z);

      // Face the center (camera at origin)
      card.rotation.y = -angle;

      // Scale: center card is full size, others shrink
      const dist = Math.abs(offset);
      const scale = Math.max(0.55, 1 - dist * 0.13);
      card.scale.setScalar(scale);

      // Brightness via material color
      const brightness = Math.max(0.3, 1 - dist * 0.22);
      const content = card.children[1] as any;
      if (content) {
        content.material.color.setScalar(brightness);
      }
    }
  }

  onDestroy(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (renderer) renderer.dispose();
  });

  const activeProject = $derived(projects[Math.round(currentIndex)] ?? projects[0]);
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
  }

  .carousel-section:active {
    cursor: grabbing;
  }

  .three-canvas {
    width: 100%;
    height: 100%;
  }

  /* Project title overlay — bottom left like Kaide */
  .project-meta {
    position: absolute;
    bottom: 3rem;
    left: 3rem;
    pointer-events: none;
  }

  .project-title {
    font-family: 'Arial Black', 'Haettenschweiler', sans-serif;
    font-size: clamp(3rem, 8vw, 7rem);
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 0.92;
    color: #ffffff;
    text-transform: uppercase;
    margin: 0 0 0.75rem;
    transition: opacity 0.3s ease;
  }

  .project-sub {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }

  /* Next project — bottom right like Kaide */
  .next-hint {
    position: absolute;
    bottom: 3rem;
    right: 3rem;
    text-align: right;
    pointer-events: none;
  }

  .next-label {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    display: block;
    margin-bottom: 0.3rem;
  }

  .next-title {
    font-family: 'Arial Black', 'Haettenschweiler', sans-serif;
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
  }

  /* Nav arrows */
  .nav {
    position: absolute;
    bottom: 3rem;
    right: 3rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    bottom: auto;
    top: 50%;
    transform: translateY(-50%);
  }

  .nav-btn {
    width: 44px;
    height: 44px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
    background: rgba(0,0,0,0.4);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    font-size: 1.1rem;
    line-height: 1;
  }

  .nav-btn:hover {
    border-color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.1);
  }

  /* Dot indicators */
  .dots {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    pointer-events: none;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    transition: background 0.3s, transform 0.3s;
  }

  .dot.active {
    background: #fff;
    transform: scale(1.4);
  }
</style>

<section class="carousel-section">
  <!-- Three.js mounts here -->
  <div class="three-canvas" bind:this={container}></div>

  <!-- Active project meta — bottom left -->
  <div class="project-meta">
    <h2 class="project-title">{activeProject.title}</h2>
    <p class="project-sub">{activeProject.category} &nbsp;·&nbsp; {activeProject.year}</p>
  </div>

  <!-- Next project — bottom right -->
  {#if projects[Math.round(currentIndex) + 1]}
    <div class="next-hint" style="bottom: 3rem; right: 7rem;">
      <span class="next-label">Next</span>
      <span class="next-title">{projects[Math.round(currentIndex) + 1].title}</span>
    </div>
  {/if}

  <!-- Arrow nav — right side -->
  <div class="nav" style="right: 2rem;">
    <button
      class="nav-btn"
      aria-label="Previous project"
      onclick={() => { targetIndex = Math.max(targetIndex - 1, 0); }}
    >&#8593;</button>
    <button
      class="nav-btn"
      aria-label="Next project"
      onclick={() => { targetIndex = Math.min(targetIndex + 1, projects.length - 1); }}
    >&#8595;</button>
  </div>

  <!-- Dot indicators -->
  <div class="dots" role="tablist" aria-label="Carousel position">
    {#each projects as _, i}
      <div
        class="dot"
        class:active={Math.round(currentIndex) === i}
        role="tab"
        aria-selected={Math.round(currentIndex) === i}
      ></div>
    {/each}
  </div>
</section>