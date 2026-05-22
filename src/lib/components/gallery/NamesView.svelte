<script lang="ts">
  import { buildPeople, imagesRaw } from '$lib/data/gallery';

  let { activeFilter = null }: { activeFilter?: string | null } = $props();

  type Person = {
    name: string;
    tags: string[];
  };

  const people = buildPeople(imagesRaw);
  const NAME_ROW_STEP = 126;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  let selectedNameIndex = 0;
  let isAlphabetActive = false;
  let namesWheelAccumulator = 0;
  let isNamesDragging = false;
  let namesLastY = 0;
  let namesDragAccumulator = 0;
  let namesStackRef: HTMLElement;

  function getVisiblePeople() {
    return activeFilter
      ? people.filter((person) => person.tags.includes(activeFilter as string))
      : people;
  }

  function selectName(index: number) {
    const visible = getVisiblePeople();
    selectedNameIndex = Math.max(0, Math.min(visible.length - 1, index));
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

    namesDragAccumulator += namesLastY - e.clientY;
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
    const visiblePeople = getVisiblePeople();

    if (selectedNameIndex >= visiblePeople.length) {
      selectedNameIndex = 0;
    }
  });
</script>

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

    {#if getVisiblePeople().length}
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

<style>
  .names-view {
    position:absolute;
    inset:var(--gallery-navbar-offset) 0 0 0;
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
    color:var(--gallery-text);
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

  .names-stack:focus-visible {
    outline:none;
  }

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
    background:linear-gradient(90deg, rgba(250,250,250,0.15), var(--gallery-accent));
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
    color:var(--gallery-text);
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
    color:var(--gallery-accent);
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
    color:var(--gallery-accent);
    transform:translateY(-50%) translateX(2px) scale(1.02);
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
    color:var(--gallery-accent);
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
    color:var(--gallery-text);
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
    background:var(--gallery-accent);
    color:#1a1a1a;
    font-size:12px;
    font-weight:700;
    line-height:18px;
    letter-spacing:0;
  }

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
