<script lang="ts">
  import '../../lib/styles/tokens.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import gsap from 'gsap';

  let activeToggle = $state<'photos' | 'names'>('photos');
  let activeFilter = $state<string | null>(null);

  let collageRef: HTMLDivElement;
  let innerRef: HTMLDivElement;
  let scale = $state<number>(1);
  let selectedImageIndex = $state<number | null>(null);
  let selectedNameIndex = $state<number>(0);
  let isAlphabetActive = $state(false);
  let namesWheelAccumulator = 0;
  let isNamesDragging = false;
  let namesLastY = 0;
  let namesDragAccumulator = 0;
  const NAME_ROW_STEP = 126;
  let namesStackRef: HTMLElement;

  const designWidth = 1920;
  let designHeight = $state<number>(1080);

  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;
  let velX = 0, velY = 0;
  let isDragging = false;
  let lastX = 0, lastY = 0, lastTime = 0;
  let rafId: number;

  const FRICTION = 0.92;
  const LERP = 0.1;

  function animate() {
    if (!isDragging) {
      velX *= FRICTION; velY *= FRICTION;
      targetX += velX; targetY += velY;
    }
    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;
    gsap.set(innerRef, { x: currentX, y: currentY, force3D: true });
    rafId = requestAnimationFrame(animate);
  }

  function pointerDown(e: PointerEvent) {
    isDragging = true;
    lastX = e.clientX; lastY = e.clientY;
    lastTime = performance.now();
    velX = 0; velY = 0;
    collageRef?.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dt = Math.max(performance.now() - lastTime, 1);
    targetX += (e.clientX - lastX) * 1.2;
    targetY += (e.clientY - lastY) * 1.2;
    velX = ((e.clientX - lastX) / dt) * 16;
    velY = ((e.clientY - lastY) / dt) * 16;
    lastX = e.clientX; lastY = e.clientY;
    lastTime = performance.now();
  }

  function pointerUp() {
    isDragging = false;
    isNamesDragging = false;
  }

  function wheelMove(e: WheelEvent) {
    e.preventDefault();
    targetX -= e.deltaX * 0.85;
    targetY -= e.deltaY * 0.85;
  }

  function updateScale() {
    scale = Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight);
  }

  onMount(() => {
    updateScale();
    animate();
    window.addEventListener('resize', updateScale);
    window.addEventListener('pointerup', pointerUp);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('pointerup', pointerUp);
      cancelAnimationFrame(rafId);
    };
  });

  const filters = [
    { id: 'organizzativa', label: 'Area organizzativa e servizi generali' },
    { id: 'logistica', label: 'Logistica e territorio' },
    { id: 'gestione', label: 'Gestione Operativa e Fan Experience' },
    { id: 'relazioni', label: 'Relazioni e comunicazione' },
    { id: 'cerimonie', label: 'Cerimonie e revenue' },
    { id: 'sport', label: 'Sport e discipline' }
  ];

  const setToggle = (v: 'photos' | 'names') => {
    activeToggle = v;
    selectedImageIndex = null;

    if (v === 'names') {
      selectedNameIndex = 0;
    }
  };
  const setFilter = (v: string | null) => activeFilter = v;
  function selectImage(index: number) {
    selectedImageIndex = index;
  }

  function slugify(name: string | undefined, index: number) {
    if (!name) return `member-${index}`;
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function clearSelection() {
    selectedImageIndex = null;
  }

  type Person = {
    name: string;
    tags: string[];
  };

  type GalleryImage = {
    src: string;
    left: number;
    top: number;
    width: number;
    height: number;
    tags?: string[];
    name?: string;
  };

  function buildPeople(rawImages: typeof imagesRaw): Person[] {
    const peopleByName = new Map<string, Set<string>>();

    for (const image of rawImages) {
      if (!image.name) continue;

      const currentTags = peopleByName.get(image.name) ?? new Set<string>();

      for (const tag of image.tags ?? []) {
        currentTags.add(tag);
      }

      peopleByName.set(image.name, currentTags);
    }

    return Array.from(peopleByName.entries())
      .map(([name, tags]) => ({
        name,
        tags: Array.from(tags)
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  function buildSpacedImages(rawImages: GalleryImage[]) {
    const columnCount = 12;
    const sidePadding = 86;
    const horizontalGap = 22;
    const verticalGap = 26;
    const topPadding = 84;
    const bottomPadding = 120;
    const blockPattern = [3, 2, 2, 3, 1, 2, 3, 2, 1, 3, 2, 2];
    const sizePattern = [0.86, 1.02, 0.93, 1.08, 0.78, 0.97, 1.04, 0.84, 0.91];

    const availableWidth = designWidth - (sidePadding * 2) - (horizontalGap * (columnCount - 1));
    const columnWidth = availableWidth / columnCount;
    const columnHeights = Array.from({ length: columnCount }, () => topPadding);

    const spacedImages = rawImages.map((image, index) => {
      const span = blockPattern[index % blockPattern.length];
      const scale = sizePattern[index % sizePattern.length];
      const aspectRatio = image.height / image.width;

      const slotWidth = (columnWidth * span) + (horizontalGap * (span - 1));
      const imageWidth = slotWidth * scale;
      const imageHeight = imageWidth * aspectRatio;

      let targetColumn = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let start = 0; start <= columnCount - span; start += 1) {
        const laneHeight = Math.max(...columnHeights.slice(start, start + span));
        const rhythmBias = ((start % 3) * 14) + ((index % 6) * 5);
        const score = laneHeight + rhythmBias;

        if (score < bestScore) {
          bestScore = score;
          targetColumn = start;
        }
      }

      const laneTop = Math.max(...columnHeights.slice(targetColumn, targetColumn + span));
      const bandOffset = ((index % 4) - 1.5) * 11;
      const left = sidePadding + (targetColumn * (columnWidth + horizontalGap)) + ((slotWidth - imageWidth) / 2);
      const top = laneTop + bandOffset;
      const nextHeight = top + imageHeight + verticalGap;

      for (let i = targetColumn; i < targetColumn + span; i += 1) {
        columnHeights[i] = nextHeight;
      }

      return {
        ...image,
        left,
        top,
        width: imageWidth,
        height: imageHeight
      };
    });

    const contentHeight = Math.max(...columnHeights) + bottomPadding;

    return {
      images: spacedImages,
      canvasHeight: Math.max(1080, contentHeight)
    };
  }

  function buildInfiniteImages(rawImages: GalleryImage[], waves = 8) {
    const expanded: GalleryImage[] = [];

    for (let wave = 0; wave < waves; wave += 1) {
      for (let i = 0; i < rawImages.length; i += 1) {
        const image = rawImages[(i + wave * 3) % rawImages.length];
        const scaleVariant = 0.86 + (((wave + i) % 5) * 0.06);

        expanded.push({
          ...image,
          width: image.width * scaleVariant,
          height: image.height * scaleVariant
        });
      }
    }

    return expanded;
  }

  const imagesRaw = [
    { src: 'https://www.figma.com/api/mcp/asset/aa1bcc44-33a0-48b1-a75c-913f2d3630eb', left: 1384.95, top: 494.84, width: 223.864, height: 298.485, tags: ['organizzativa'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06 },
    { src: 'https://www.figma.com/api/mcp/asset/0a1bd32a-57a9-4d4d-847d-b271d6ec91ae', left: 1704.64, top: 689.31, width: 138.746, height: 104.06, tags: ['logistica'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/cf92030a-f76a-466e-83d6-f94316719d6e', left: 628.47, top: 155.8, width: 161.035, height: 286.285, tags: ['gestione'], name: 'Elisa Filippi' },
    { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425 },
    { src: 'https://www.figma.com/api/mcp/asset/d76c1003-06b2-4d2e-ad1b-add1e8c85403', left: 951.22, top: 986.6, width: 136.567, height: 102.425, tags: ['relazioni'], name: 'Adriano Lacchin' },
    { src: 'https://www.figma.com/api/mcp/asset/9dc12179-c0fb-4d55-988b-c055d87fecb1', left: 320.99, top: 1041.6, width: 184.303, height: 138.452, tags: ['cerimonie'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938 },
    { src: 'https://www.figma.com/api/mcp/asset/42fc7859-bcfe-4ad5-a6fe-eff45eb6b8b1', left: 1759.39, top: 222.99, width: 167.216, height: 361.938, tags: ['sport'], name: 'Rudy Bre' },
    { src: 'https://www.figma.com/api/mcp/asset/005b2d2c-0afe-4335-9bff-7580699b45c3', left: 1509.16, top: 889.88, width: 263.09, height: 199.246, tags: ['organizzativa'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919 },
    { src: 'https://www.figma.com/api/mcp/asset/8fe95570-1827-4cd2-8aef-1d6997c1b9b0', left: 317.94, top: 155.8, width: 164.939, height: 219.919, tags: ['logistica'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/331fa98b-1d4f-4c52-84df-2f4e0da7c169', left: 159.12, top: 774.83, width: 158.83, height: 211.773, tags: ['gestione'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684 },
    { src: 'https://www.figma.com/api/mcp/asset/dd9acb8f-0201-4e62-80e6-e82d8677b77d', left: 1002.05, top: 721.88, width: 134.013, height: 178.684, tags: ['relazioni'], name: "Gualtiero D'Amiano" },
    { src: 'https://www.figma.com/api/mcp/asset/1f8a6af0-1ed8-4150-9b19-e988572ea609', left: 648.83, top: 811.48, width: 185.429, height: 247.239, tags: ['cerimonie'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948 },
    { src: 'https://www.figma.com/api/mcp/asset/d0b6856b-ca04-4dac-92d2-728a4d150ca5', left: 1121.25, top: 96.74, width: 173.211, height: 230.948, tags: ['sport'], name: 'Lisa Liz' },
    { src: 'https://www.figma.com/api/mcp/asset/57845de6-3257-4345-b245-5582dcd71fed', left: 413.64, top: 554.91, width: 165.865, height: 221.153, tags: ['organizzativa'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714 },
    { src: 'https://www.figma.com/api/mcp/asset/b4a67335-f55e-4137-9ea2-86361587bd77', left: 895.39, top: 282.84, width: 142.285, height: 189.714, tags: ['logistica'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/08aad09d-f709-4304-b39f-2a12aad3373f', left: 1207.8, top: 935.69, width: 157.939, height: 210.586, tags: ['gestione'], name: "Gualtiero D'Amiano" },
    { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479 },
    { src: 'https://www.figma.com/api/mcp/asset/f4a03545-322c-4df0-aff3-8bdfadbd2f21', left: 1141.62, top: 462.26, width: 153.208, height: 203.479, tags: ['relazioni'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/f11ba762-b329-4551-a3d6-ef7950a6bb8d', left: 736.39, top: 564.07, width: 214.461, height: 160.846, tags: ['cerimonie'], name: 'Chiara Terraneo' },
    { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095 },
    { src: 'https://www.figma.com/api/mcp/asset/c53d80c5-6549-4ad2-87aa-4715b5f5e48d', left: 43.04, top: 504, width: 212.127, height: 159.095, tags: ['sport'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/ded9c5f3-a6e9-4d84-be2c-7b125c11b710', left: -131.05, top: 793.15, width: 102.25, height: 136.334, tags: ['logistica'], name: 'Romano Cecchin' },
    { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864 },
    { src: 'https://www.figma.com/api/mcp/asset/6af4e78a-2f35-4668-9df7-22785806e913', left: 1390.04, top: 176.16, width: 289.152, height: 216.864, tags: ['gestione'], name: 'Mariagrazia Toscano' },
    { src: 'https://www.figma.com/api/mcp/asset/bd2e4233-abf8-4255-b73b-9c2060bdbf2d', left: -198.26, top: 309.54, width: 203.567, height: 152.675, tags: ['organizzativa'], name: 'Valentina Guerrini' },
    { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963 },
    { src: 'https://www.figma.com/api/mcp/asset/862fb2d7-86cc-4cb1-8c79-84a421f7c78a', left: 913.57, top: 352.16, width: 198.917, height: 159.963, tags: ['logistica'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/fd4440df-10b0-46de-9533-973bb268cf89', left: 626.66, top: 388.45, width: 155.829, height: 161.1, tags: ['relazioni'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633 },
    { src: 'https://www.figma.com/api/mcp/asset/3f2318b0-e639-404a-8e54-8fc2b88d4965', left: 639.92, top: 843.61, width: 248.237, height: 139.633, tags: ['cerimonie'], name: 'Michele Tomolillo' },
    { src: 'https://www.figma.com/api/mcp/asset/721f6cef-83d5-4035-be4d-9652b82b9c81', left: 1049.7, top: 780.99, width: 359.169, height: 215.501, tags: ['relazioni'], name: 'Laura Giovanessi' },
    { src: 'https://www.figma.com/api/mcp/asset/e99ac53f-6fba-4a2e-ba86-d6f12f9eb068', left: 244.8, top: 810.1, width: 248.122, height: 186.092, tags: ['organizzativa'], name: 'Lisa Liz' },
    { src: 'https://www.figma.com/api/mcp/asset/c42edf09-a934-400c-bae9-0eaf96a509bd', left: 390, top: 593, width: 250.15, height: 187.612, tags: ['gestione'], name: 'Guido Marzorati' },
    { src: 'https://www.figma.com/api/mcp/asset/f47cc2c2-c580-4acf-ad82-83302c739cc7', left: 749.52, top: 565.56, width: 361.128, height: 192.267, tags: ['sport'], name: 'Anna Passarella' }
  ];

  const infiniteImagesRaw = buildInfiniteImages(imagesRaw, 9);
  const photoLayout = buildSpacedImages(infiniteImagesRaw);
  const positionedImages = photoLayout.images;
  designHeight = photoLayout.canvasHeight;
  const people = buildPeople(imagesRaw);

  function getVisiblePeople() {
    const visible = activeFilter
      ? people.filter((person) => person.tags.includes(activeFilter))
      : people;

    return visible;
  }

  function getSelectedPerson() {
    const visiblePeople = getVisiblePeople();
    return visiblePeople[Math.min(selectedNameIndex, Math.max(visiblePeople.length - 1, 0))] ?? null;
  }

  function selectName(index: number) {
    const visible = getVisiblePeople();
    selectedNameIndex = Math.max(0, Math.min(visible.length - 1, index));
    // focus the names container for keyboard interaction
    namesStackRef?.focus?.();
  }

  function shiftSelectedName(delta: number) {
    const visiblePeople = getVisiblePeople();

    if (!visiblePeople.length) return;

    selectedNameIndex = Math.max(0, Math.min(visiblePeople.length - 1, selectedNameIndex + delta));
  }

  function handleNamesWheel(e: WheelEvent) {
    e.preventDefault();
    namesWheelAccumulator += e.deltaY;

    const threshold = 40;

    while (Math.abs(namesWheelAccumulator) >= threshold) {
      shiftSelectedName(namesWheelAccumulator > 0 ? 1 : -1);
      namesWheelAccumulator += namesWheelAccumulator > 0 ? -threshold : threshold;
    }
  }

  function handleNamesPointerDown(e: PointerEvent) {
    isNamesDragging = true;
    namesLastY = e.clientY;
    namesDragAccumulator = 0;
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }

  function handleNamesPointerMove(e: PointerEvent) {
    if (!isNamesDragging) return;

    namesDragAccumulator += (namesLastY - e.clientY);
    namesLastY = e.clientY;

    const threshold = 34;

    while (Math.abs(namesDragAccumulator) >= threshold) {
      shiftSelectedName(namesDragAccumulator > 0 ? 1 : -1);
      namesDragAccumulator += namesDragAccumulator > 0 ? -threshold : threshold;
    }
  }

  function handleNamesKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      shiftSelectedName(1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      shiftSelectedName(-1);
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function personStartsWithLetter(personName: string, letter: string) {
    return personName.trim().toUpperCase().startsWith(letter);
  }

  function hasPeopleForLetter(letter: string) {
    return getVisiblePeople().some((person) => personStartsWithLetter(person.name, letter));
  }

  function selectByLetter(letter: string) {
    const index = getVisiblePeople().findIndex((person) => personStartsWithLetter(person.name, letter));

    if (index !== -1) {
      selectedNameIndex = index;
    }
  }

  $effect(() => {
    activeFilter;
    activeToggle;

    const visiblePeople = getVisiblePeople();

    if (selectedNameIndex >= visiblePeople.length) {
      selectedNameIndex = 0;
    }
  });
</script>

<svelte:head>
  <title>Gallery — Fuori Campo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Forma+DJR+Display:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<svelte:window on:pointermove={pointerMove} />

<Navbar />

<main class="gallery-page">

  <div class="bg-glow bg-glow-1"></div>
  <div class="bg-glow bg-glow-2"></div>
  <div class="bg-noise"></div>

  <!-- FILTERS -->
  <section class="filters" aria-label="Gallery filters">
    {#each filters as filter}
      <button
        class:filter-item--active={activeFilter === filter.id}
        class="filter-item"
        type="button"
        aria-pressed={activeFilter === filter.id}
        on:click={() => setFilter(activeFilter === filter.id ? null : filter.id)}
      >
        {filter.label}
      </button>
    {/each}
  </section>

  {#if activeToggle === 'photos'}
    <!-- COLLAGE -->
    <div
      bind:this={collageRef}
      class:collage--selection-active={selectedImageIndex !== null}
      class="collage"
      on:pointerdown={pointerDown}
      on:wheel|preventDefault={wheelMove}
    >
      <div
        bind:this={innerRef}
        class="collage-inner"
        style="
          width:{designWidth}px;
          height:{designHeight}px;
          transform:scale({scale});
          transform-origin:center center;
          left:calc(50vw - {designWidth / 2}px);
          top:calc(50vh - {designHeight / 2}px);
        "
      >
          {#each positionedImages as img, i (img.src + '-' + i + '-' + img.name)}
          {@const isUnmatched = !!(activeFilter && !(img.tags && img.tags.includes(activeFilter)))}
          {@const isSelected = selectedImageIndex === i}
            <div
              class="collage-item"
              class:is-selected={isSelected}
              class:img-unmatched={isUnmatched}
              style="left:{img.left}px;top:{img.top}px;width:{img.width}px;height:{img.height}px;"
              on:click={() => goto(`/volunteer/${slugify(img.name, i)}`)}
            >
            <div class="img-bw-layer">
              <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--bw" draggable="false" />
            </div>
            <div class="img-color-layer">
              <img src={img.src} alt={img.name ?? 'photo'} class="collage-img collage-img--color" class:img--names={activeToggle === 'names'} draggable="false" />
            </div>
            <div class="img-noise"></div>
            <div class="img-vignette"></div>
            {#if activeToggle === 'names' && (!activeFilter || (img.tags && img.tags.includes(activeFilter)))}
              <div class="img-name">{img.name ?? 'Name'}</div>
            {/if}
            {#if isSelected}
              <div class="selected-glow"></div>
              {#if img.name}
                <div class="selected-caption">{img.name}</div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>

    {#if selectedImageIndex !== null}
      <button class="selection-backdrop" aria-label="Clear selection" type="button" on:click={clearSelection}></button>
    {/if}
  {:else}
    <div class="names-view">
      <div class="names-quote">
        <p>“HO PARLATO DI CURLING CON LA PRINCIPESSA D’INGHILTERRA CHE FIGATA.”</p>
        <div class="names-meta">
          <span>BORMIO - STELVIO SKI CENTER</span>
          <span>EVENT SERVICES VOLUNTEER</span>
        </div>
      </div>

      <div class="names-stage">
        <div
          class="names-stack"
          aria-label="People names"
          tabindex="0"
          bind:this={namesStackRef}
          on:wheel|preventDefault={handleNamesWheel}
          on:pointerdown={handleNamesPointerDown}
          on:pointermove={handleNamesPointerMove}
          on:keydown={handleNamesKeydown}
        >
          <div class="names-focus-line"></div>
          {#each getVisiblePeople() as person, index}
            {@const distance = index - selectedNameIndex}
            <button
              class:is-selected={distance === 0}
              class="name-row"
              type="button"
              style={`transform: translateY(${distance * NAME_ROW_STEP}px);`}
              on:click={() => selectName(index)}
            >
              <span class="name-row__text">{person.name.toUpperCase()}</span>
              <span class="name-row__arrow" aria-hidden="true">⌄</span>
            </button>
          {/each}
        </div>

        {#if getSelectedPerson()}
          <div class="names-current">
            <span class="names-current__label">GALLERY</span>
            <span class="names-current__pill">NAMES</span>
          </div>
        {/if}

        <div
          class="alphabet-hover-zone"
          on:mouseenter={() => isAlphabetActive = true}
          on:mouseleave={() => isAlphabetActive = false}
        >
          <div class:alphabet-rail--visible={isAlphabetActive} class="alphabet-rail" aria-label="Alphabet quick index">
            {#each alphabet as letter}
              {@const hasLetter = hasPeopleForLetter(letter)}
              <button
                class:is-disabled={!hasLetter}
                class="alphabet-letter"
                type="button"
                on:mouseenter={() => hasLetter && selectByLetter(letter)}
                on:click={() => hasLetter && selectByLetter(letter)}
              >
                {letter}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- EDGE FADES -->
  <div class="edge-fade edge-fade--top"></div>
  <div class="edge-fade edge-fade--bottom"></div>
  <div class="edge-fade edge-fade--left"></div>
  <div class="edge-fade edge-fade--right"></div>

  <!-- TOGGLE -->
  <section class="toggle" aria-label="View toggle">
    <div class:toggle--names={activeToggle === 'names'} class="toggle-track">
      <span class="toggle-selected"></span>
      <button class="toggle-option toggle-option--photos" type="button" aria-pressed={activeToggle === 'photos'} on:click={() => setToggle('photos')}>
        <span class="toggle-label">FOTO</span>
      </button>
      <button class="toggle-option toggle-option--names" type="button" aria-pressed={activeToggle === 'names'} on:click={() => setToggle('names')}>
        <span class="toggle-label">NOMI</span>
      </button>
    </div>
  </section>

</main>

<style>
  :global(html), :global(body) {
    margin: 0;
    overflow: hidden;
    background: #060606;
  }

  :global(*) {
    font-family: 'Forma DJR Display', 'FormaDJRDisplay', ui-sans-serif, sans-serif;
    box-sizing: border-box;
  }

  .gallery-page {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
    background: #1a1a1a;
  }

  .bg-noise {
    position: fixed; inset: 0;
    pointer-events: none; z-index: 1; opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  .bg-glow { position:absolute; border-radius:50%; filter:blur(160px); pointer-events:none; z-index:0; }
  .bg-glow-1 {
    width:700px; height:700px;
    background:radial-gradient(circle, rgba(189,255,93,0.09) 0%, transparent 70%);
    top:-200px; left:-180px;
    animation: gd1 20s ease-in-out infinite alternate;
  }
  .bg-glow-2 {
    width:500px; height:500px;
    background:radial-gradient(circle, rgba(76,126,255,0.07) 0%, transparent 70%);
    right:-150px; bottom:-150px;
    animation: gd2 25s ease-in-out infinite alternate;
  }
  @keyframes gd1 { 0%{transform:translate(0,0)} 100%{transform:translate(60px,80px)} }
  @keyframes gd2 { 0%{transform:translate(0,0)} 100%{transform:translate(-50px,-60px)} }

  .edge-fade { position:fixed; pointer-events:none; z-index:10; }
  .edge-fade--top    { top:0;    left:0; right:0;  height:110px; background:linear-gradient(to bottom,#1a1a1a,transparent); }
  .edge-fade--bottom { bottom:0; left:0; right:0;  height:130px; background:linear-gradient(to top,   #1a1a1a,transparent); }
  .edge-fade--left   { left:0;   top:0;  bottom:0; width:70px;   background:linear-gradient(to right, #1a1a1a,transparent); }
  .edge-fade--right  { right:0;  top:0;  bottom:0; width:70px;   background:linear-gradient(to left,  #1a1a1a,transparent); }

  /* COLLAGE */
  .collage { position:absolute; inset:0; z-index:2; cursor:grab; pointer-events:auto; }
  .collage:active { cursor:grabbing; }
  .collage-inner { position:absolute; will-change:transform; }
  .collage--selection-active .collage-item:not(.is-selected) {
    opacity:0.22;
    filter: blur(8px) saturate(0.45);
    transform: scale(0.97);
  }
  .collage--selection-active .collage-item:not(.is-selected) .img-bw-layer,
  .collage--selection-active .collage-item:not(.is-selected) .img-color-layer,
  .collage--selection-active .collage-item:not(.is-selected) .img-noise,
  .collage--selection-active .collage-item:not(.is-selected) .img-vignette,
  .collage--selection-active .collage-item:not(.is-selected) .img-name {
    opacity:0.5;
  }

  /* CARD */
  .collage-item {
    position:absolute; overflow:hidden; border-radius:5px;
    box-shadow:0 2px 16px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);
    transition:box-shadow .4s ease, opacity .45s ease;
    cursor:pointer;
    pointer-events:auto;
  }
  .collage-item:hover {
    z-index:50;
    box-shadow:0 8px 48px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07);
  }
  .collage-item.is-selected {
    z-index:60;
    box-shadow:
      0 0 0 2px #bdff5d,
      0 0 20px rgba(189,255,93,0.35),
      0 10px 48px rgba(0,0,0,0.75);
  }
  .collage-item.is-selected .img-bw-layer { opacity:0; }
  .collage-item.is-selected .img-color-layer { opacity:1; }
  .collage-item.is-selected .img-vignette {
    opacity:1;
    background:linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.42));
  }
  .collage-item.is-selected .collage-img {
    transform:scale(1.01);
  }

  /* GRAYSCALE ↔ COLOR LAYERS */
  .img-bw-layer, .img-color-layer {
    position:absolute; inset:0; width:100%; height:100%;
  }
  .img-bw-layer    { z-index:1; transition:opacity .5s cubic-bezier(.25,.46,.45,.94); }
  .img-color-layer { z-index:2; transition:opacity .5s cubic-bezier(.25,.46,.45,.94); }

  .collage-img {
    width:100%; height:100%; object-fit:cover; display:block;
    user-select:none; -webkit-user-drag:none;
    will-change:transform,filter;
    transform:scale(1.04);
    transition:transform .65s cubic-bezier(.25,.46,.45,.94), filter .5s ease;
  }
  .collage-img--bw {
    filter:grayscale(100%) contrast(1.05) brightness(0.82);
  }
  .collage-img--color.img--names {
    filter:grayscale(80%) brightness(0.55);
  }

  /* Hover on matched: show colour */
  .collage-item:hover .img-bw-layer { opacity:0; }
  .collage-item:hover .collage-img  { transform:scale(1.09); }

  /* GREEN HOVER EFFECT (camera-zoom accent) */
  .img-color-layer::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 5px;
    box-shadow: inset 0 0 40px rgba(189,255,93,0.18), 0 0 28px rgba(189,255,93,0.12);
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 220ms ease, transform 220ms ease;
    z-index: 6;
  }

  .collage-item:hover .img-color-layer::after {
    opacity: 1;
  }

  .collage-item:hover .img-color-layer .collage-img {
    filter: brightness(1.06) saturate(1.08) contrast(1.02);
  }

  /* UNMATCHED */
  .img-unmatched { opacity:0.45; }
  .img-unmatched { pointer-events:none; }
  .img-unmatched .img-color-layer { opacity:0; transition:opacity .5s ease; }
  .img-unmatched .img-bw-layer    { opacity:1; }
  .img-unmatched .collage-img--bw { filter:grayscale(100%) contrast(0.82) brightness(0.42); }

  /* OVERLAYS */
  .img-noise {
    position:absolute; inset:0; z-index:3;
    background-image:radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size:3px 3px; mix-blend-mode:overlay; opacity:0.12; pointer-events:none;
  }
  .img-vignette {
    position:absolute; inset:0; z-index:4;
    background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%);
    pointer-events:none; opacity:0; transition:opacity .4s ease;
  }
  .collage-item:hover .img-vignette { opacity:1; }

  .img-name {
    position:absolute; left:8px; bottom:8px; z-index:5;
    color:white; font-size:10px; font-weight:400;
    padding:5px 9px; border-radius:999px;
    background:rgba(0,0,0,0.52); backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.07);
    letter-spacing:0.09em; text-transform:uppercase; pointer-events:none;
  }

  .selected-glow {
    position:absolute;
    inset:0;
    border:2px solid #bdff5d;
    box-shadow:0 0 19px rgba(189,255,93,0.6);
    pointer-events:none;
    z-index:6;
  }

  .selected-caption {
    position:absolute;
    left:14px;
    bottom:14px;
    z-index:7;
    color:#fafafa;
    font-size:14px;
    line-height:1;
    font-family:'Forma DJR Display',sans-serif;
    font-weight:700;
    text-transform:uppercase;
    text-shadow:0 0 4px rgba(0,0,0,0.25), 0 4px 4px rgba(0,0,0,0.25);
    pointer-events:none;
  }

  .selection-backdrop {
    position:fixed;
    inset:143px 0 0 0;
    border:0;
    background:rgba(26,26,26,0.5);
    backdrop-filter:blur(4.977px) saturate(0.55);
    z-index:15;
    cursor:default;
  }

  .names-view {
    position:absolute;
    inset:143px 0 0 0;
    z-index:6;
    overflow:hidden;
  }

  .names-view::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      linear-gradient(90deg, rgba(26,26,26,0.96) 0 28%, rgba(26,26,26,0.82) 46%, rgba(26,26,26,0.78) 100%),
      radial-gradient(circle at center, rgba(255,255,255,0.02), transparent 60%);
    backdrop-filter: blur(10.9px) saturate(0.9);
    pointer-events:none;
  }

  .names-quote {
    position:absolute;
    left:42px;
    top:286px;
    width:210px;
    z-index:2;
    color:#fafafa;
    text-transform:uppercase;
    font-family:'Forma DJR Display',sans-serif;
  }

  .names-quote p {
    margin:0;
    font-size:24px;
    line-height:1.02;
    letter-spacing:-0.01em;
    text-shadow:0 0 4px rgba(0,0,0,0.25), 0 4px 4px rgba(0,0,0,0.25);
  }

  .names-meta {
    margin-top:36px;
    padding-top:14px;
    border-top:1px solid rgba(250,250,250,0.75);
    display:flex;
    flex-direction:column;
    gap:8px;
    font-size:14px;
    line-height:1;
    letter-spacing:0;
  }

  .names-stage {
    position:absolute;
    inset:0;
    z-index:2;
  }

  .names-stack {
    position:absolute;
    left:226px;
    top:147px;
    right:84px;
    bottom:44px;
    overflow:hidden;
    cursor:grab;
    touch-action:none;
    -webkit-mask-image:linear-gradient(to bottom, transparent 0%, #000 11%, #000 88%, transparent 100%);
    mask-image:linear-gradient(to bottom, transparent 0%, #000 11%, #000 88%, transparent 100%);
  }

  .names-stack:active {
    cursor:grabbing;
  }

  .names-stack:focus-visible { outline:none; }

  .names-focus-line {
    position:absolute;
    left:0;
    right:22px;
    top:84px;
    height:1px;
    background:rgba(250,250,250,0.78);
    box-shadow:0 0 22px rgba(255,255,255,0.2);
    pointer-events:none;
    z-index:1;
  }

  .names-focus-line::after {
    content:'';
    position:absolute;
    right:-1px;
    top:50%;
    width:26px;
    height:2px;
    transform:translateY(-50%);
    background:linear-gradient(90deg, rgba(250,250,250,0.15), #bdff5d);
    box-shadow:0 0 12px rgba(189,255,93,0.35);
  }

  .name-row {
    position:absolute;
    left:0;
    width:min(100%, 1120px);
    min-height:112px;
    border:0;
    background:transparent;
    padding:0;
    text-align:left;
    cursor:pointer;
    color:#fafafa;
    font-family:'Forma DJR Display',sans-serif;
    font-size:64px;
    line-height:1.04;
    font-weight:700;
    letter-spacing:-0.03em;
    text-transform:uppercase;
    transform-origin:left center;
    transition:
      transform 280ms cubic-bezier(.22,1,.36,1),
      color 180ms ease,
      opacity 180ms ease,
      filter 180ms ease;
  }

  .name-row .name-row__text {
    display:-webkit-box;
    max-width:calc(100% - 88px);
    overflow:hidden;
    text-wrap:balance;
    white-space:normal;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
  }

  .name-row:not(.is-selected) {
    opacity:0.66;
    color:rgba(250,250,250,0.86);
    filter:blur(4.8px);
  }

  .name-row.is-selected {
    color:#bdff5d;
    filter:none;
    z-index:3;
    text-shadow:0 0 4px rgba(0,0,0,0.25), 0 4px 4px rgba(0,0,0,0.25);
  }

  .name-row__arrow {
    position:absolute;
    right:22px;
    top:50%;
    transform:translateY(-50%);
    z-index:5;
    color:rgba(250,250,250,0.22);
    font-size:56px;
    line-height:1;
    pointer-events:none;
    transition:color 160ms ease, transform 160ms ease, opacity 160ms ease;
    opacity:0.95;
  }

  .name-row.is-selected .name-row__arrow {
    color:#bdff5d;
    transform:translateY(-50%) translateX(2px) scale(1.02);
    opacity:1;
  }

  .names-focus-arrow {
    position:absolute;
    right:18px;
    z-index:6;
    color:#bdff5d;
    font-size:72px;
    line-height:0.5;
    text-shadow:0 6px 12px rgba(0,0,0,0.45), 0 0 18px rgba(189,255,93,0.22);
    pointer-events:none;
    transform:translateY(-50%);
    transition:transform 180ms ease, opacity 180ms ease;
    opacity:1;
  }

  .alphabet-hover-zone {
    position:absolute;
    top:142px;
    right:4px;
    bottom:56px;
    width:86px;
    z-index:4;
    display:flex;
    justify-content:flex-end;
    align-items:center;
  }

  .alphabet-rail {
    position:relative;
    width:38px;
    height:100%;
    max-height:560px;
    padding:16px 11px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:space-between;
    border-radius:999px;
    background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
    backdrop-filter:blur(7px) saturate(0.9);
    opacity:0;
    transform:translateX(18px) scaleY(0.92);
    transition:opacity 180ms ease, transform 220ms cubic-bezier(0.22,1,0.36,1);
    pointer-events:none;
  }

  .alphabet-rail--visible {
    opacity:1;
    transform:translateX(0) scaleY(1);
    pointer-events:auto;
  }

  .alphabet-rail::before {
    content:'';
    position:absolute;
    left:50%;
    top:14px;
    bottom:14px;
    width:1px;
    transform:translateX(-50%);
    background:linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.7), rgba(255,255,255,0.2));
  }

  .alphabet-rail::after {
    content:'';
    position:absolute;
    left:50%;
    top:50%;
    width:18px;
    height:142px;
    transform:translate(-50%, -50%);
    background:linear-gradient(180deg, rgba(189,255,93,0), rgba(189,255,93,0.6), rgba(189,255,93,0));
    filter:blur(1px);
    opacity:0.7;
  }

  .alphabet-letter {
    position:relative;
    z-index:1;
    border:0;
    background:transparent;
    color:rgba(250,250,250,0.78);
    font-family:'Forma DJR Display',sans-serif;
    font-size:10px;
    font-weight:700;
    line-height:1;
    letter-spacing:0.03em;
    text-transform:uppercase;
    cursor:pointer;
    padding:0;
    transition:color 140ms ease, transform 140ms ease, text-shadow 140ms ease;
  }

  .alphabet-letter:hover,
  .alphabet-letter:focus-visible {
    color:#bdff5d;
    transform:scale(1.2);
    text-shadow:0 0 10px rgba(189,255,93,0.5);
    outline:none;
  }

  .alphabet-letter.is-disabled {
    opacity:0.25;
    cursor:default;
    pointer-events:none;
  }

  .names-current {
    position:absolute;
    left:52px;
    bottom:28px;
    display:flex;
    align-items:center;
    gap:8px;
    z-index:3;
    color:#fafafa;
    font-family:'Forma DJR Display',sans-serif;
    text-transform:uppercase;
  }

  .names-current__label {
    font-size:12px;
    letter-spacing:0.01em;
  }

  .names-current__pill {
    display:inline-flex;
    align-items:center;
    min-height:18px;
    padding:0 11px;
    border-radius:999px;
    background:#bdff5d;
    color:#1a1a1a;
    font-size:12px;
    font-weight:700;
    line-height:18px;
    letter-spacing:0;
  }

  /* FILTERS */
  .filters {
    position:fixed; top:10px; right:14px;
    z-index:100; display:flex; flex-direction:column; align-items:flex-end;
    gap:1px; width:max-content; max-width:none; text-align:right;
  }
  .names-view .filters {
    top:10px;
    right:14px;
  }
  .filter-item {
    border:0; background:transparent;
    color:rgba(255,255,255,0.84);
    font-size:11px; font-weight:700; line-height:1.02;
    text-transform:uppercase; letter-spacing:0;
    cursor:pointer; padding:0;
    white-space:nowrap;
    transition:color .2s ease;
  }
  .filter-item:hover { color:rgba(255,255,255,0.96); }
  .filter-item--active { color:#bdff5d; }

  /* TOGGLE */
  .toggle {
    position:fixed; left:32px; bottom:32px; z-index:100;
    width:143px; height:35px;
  }
  .toggle-track {
    position:relative;
    width:143px; height:35px;
    border-radius:24px;
    background:#1a1a1a;
    overflow:hidden;
  }
  .toggle-selected {
    position:absolute; top:4px; left:4px;
    width:69px; height:27px; border-radius:16px;
    background:#bdff5d;
    transition:transform .38s cubic-bezier(.22,1,.36,1); pointer-events:none;
  }
  .toggle--names .toggle-selected { transform:translateX(66px); }
  .toggle-option {
    position:absolute;
    top:0;
    width:69px;
    height:35px;
    border:0;
    background:transparent;
    padding:0;
    cursor:pointer;
    z-index:2;
  }
  .toggle-option--photos { left:0; }
  .toggle-option--names { right:0; }
  .toggle-label {
    position:absolute; top:50%; transform:translateY(-50%);
    font-family:'Forma DJR Display',sans-serif;
    font-size:16px; 
    font-weight:700; 
    line-height:1; 
    letter-spacing:0;
    text-transform:uppercase;
    transition:color .2s ease;
  }
  .toggle-option--photos .toggle-label {
    left:19px; color:#1a1a1a;
  }
  .toggle-option--names .toggle-label {
    right:19px; color:#fafafa;
  }
  .toggle--names .toggle-option--photos .toggle-label { color:#fafafa; }
  .toggle--names .toggle-option--names .toggle-label { color:#1a1a1a; }

  @media (max-width: 980px) {
    .names-quote {
      display:none;
    }

    .names-stack {
      left:30px;
      right:40px;
      top:90px;
    }

    .name-row {
      font-size:42px;
    }

    .name-row__arrow {
      font-size:54px;
    }

    .alphabet-hover-zone {
      display:none;
    }
  }
</style>