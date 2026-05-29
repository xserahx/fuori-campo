<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';

  /* ── Extended volunteer type ─────────────────────────────────── */
  type Volunteer = GalleryImage & {
    city?:      string;
    region?:    string;
    role?:      string;
    age?:       number;
    quote?:     string;
    responses?: string[];
  };

  /* ── Reactive volunteer from URL ─────────────────────────────── */
  const currentSlug = $derived((page.params as Record<string, string>).slug ?? '');

  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  /* ── Name split: first word = firstname (outline), rest = surname (filled) ── */
  const nameSurname  = $derived(
    (volunteer?.name ?? '').trim().split(/\s+/).slice(1).join(' ').toUpperCase()
  );
  const nameFirstname = $derived(
    (volunteer?.name ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
  );

  /* ── Q&A accordion ───────────────────────────────────────────── */
  const questionTitles = [
    'LA MIA GIORNATA (QUASI) NORMALE',
    'COME MI VEDEVANO GLI ALTRI',
    'IL MIO MOMENTO PREFERITO',
    'QUELLO CHE VORREI DIMENTICARE',
    'COSA MI PORTO A CASA',
    'COSA (NON) MI AVETE CHIESTO',
    'LA MIA RISPOSTA ONESTA',
  ];

  let openQ = $state(-1);

  /* Reset accordion when route changes */
  $effect(() => { currentSlug; openQ = -1; });

  /* ── Helpers ─────────────────────────────────────────────────── */
  function locationLine(vol: Volunteer | null): string {
    if (!vol) return 'BORMIO - STELVIO SKI CENTER';
    const parts = [vol.city, vol.region].filter(Boolean);
    return parts.length ? parts.join(' - ').toUpperCase() : 'BORMIO - STELVIO SKI CENTER';
  }

  function detailLine(vol: Volunteer | null): string {
    const parts: string[] = [];
    if (vol?.region) parts.push(vol.region);
    if (vol?.age)    parts.push(`${vol.age} anni`);
    return parts.join(', ') || 'Lombardia, 59 anni';
  }
</script>

<svelte:head>
  <title>{volunteer?.name ?? 'Profilo'} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="profile">

  <!-- ── INDIETRO button ────────────────────────────────────────── -->
  <button
    class="back-btn"
    type="button"
    onclick={() => goto(`/volunteer/${currentSlug}`)}
  >
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
      <path d="M17 5H1M1 5L6 1M1 5L6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    INDIETRO
  </button>

  <!-- ── Hero name (two staggered lines) ──────────────────────── -->
  <!--
    Line 1: SURNAME — lime filled, left-aligned at 4.17vw
    Line 2: FIRSTNAME — lime outline (text-stroke), indented to 19.68vw
  -->
  <div class="name-hero" aria-label={volunteer?.name}>
    {#if nameSurname}
      <div class="name-surname" aria-hidden="true">{nameSurname}</div>
    {/if}
    <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
  </div>

  <!-- ── Quote (top-right) ─────────────────────────────────────── -->
  {#if volunteer?.quote}
    <blockquote class="vol-quote">
      <span class="qmark qmark--open" aria-hidden="true">"</span>
      {volunteer.quote}
      <span class="qmark qmark--close" aria-hidden="true">"</span>
    </blockquote>
  {:else}
    <!-- Placeholder quote for visual completeness -->
    <blockquote class="vol-quote vol-quote--placeholder">
      <span class="qmark qmark--open" aria-hidden="true">"</span>
      Un'esperienza che non dimenticherò mai.
      <span class="qmark qmark--close" aria-hidden="true">"</span>
    </blockquote>
  {/if}

  <!-- ── Volunteer info (left column) ──────────────────────────── -->
  <div class="vol-info">
    <p class="info-role">{(volunteer?.role ?? 'Event Services Volunteer').toUpperCase()}</p>
    <p class="info-location">{locationLine(volunteer)}</p>
    <p class="info-detail">{detailLine(volunteer)}</p>
  </div>

  <!-- ── Q&A accordion (right column) ─────────────────────────── -->
  <div class="qa-wrap">
    {#each questionTitles as q, i}
      <div class="qa-item">
        <button
          class="qa-row"
          class:qa-row--open={openQ === i}
          type="button"
          aria-expanded={openQ === i}
          onclick={() => { openQ = openQ === i ? -1 : i; }}
        >
          <span class="qa-title">{q}</span>
          <span class="qa-icon" aria-hidden="true">{openQ === i ? '−' : '+'}</span>
        </button>
        <div class="qa-sep" aria-hidden="true"></div>
        {#if openQ === i}
          <div class="qa-answer" role="region">
            <p>{volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.'}</p>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- ── INFO / FOTO toggle (bottom-left) ─────────────────────── -->
  <!-- INFO is selected (current page); FOTO navigates back to lightbox -->
  <div class="toggle-area">
    <div class="toggle-track">
      <!-- Pill is on the left (INFO side) -->
      <span class="toggle-pill" aria-hidden="true"></span>
      <button class="toggle-opt toggle-opt--info" type="button" aria-pressed="true">
        INFO
      </button>
      <button
        class="toggle-opt toggle-opt--foto"
        type="button"
        aria-pressed="false"
        onclick={() => goto(`/volunteer/${currentSlug}`)}
      >
        FOTO
      </button>
    </div>
  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
    overflow: hidden;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: 'Forma DJR Display', sans-serif;
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .profile {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #0e0e0e;
    color: #fafafa;
  }

  /* ── INDIETRO button ─────────────────────────────────────────────── */
  /*
   * Figma: left:72px, top:~160px (below browser chrome).
   * We place it below the navbar using the CSS variable.
   */
  .back-btn {
    position: absolute;
    left: 4.17vw;   /* 72 / 1728 */
    top: calc(var(--navbar-height, 100px) + 24px);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: transparent;
    color: #fafafa;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .back-btn:hover {
    background: var(--color-content-accent, #bdff5d);
    color: #0e0e0e;
  }

  /* ── Hero name ───────────────────────────────────────────────────── */
  /*
   * Figma artboard: 1728px wide.
   * Line 1 (surname) : padding-left 72px  → 4.17vw, lime filled
   * Line 2 (firstname): padding-left 340px → 19.68vw, lime outline
   * Font: 116px extra-bold  → clamp(40px, 6.71vw, 116px)
   * Top: 222px from artboard → ~20vh
   */
  .name-hero {
    position: absolute;
    left: 0;
    top: 20vh;
    width: 100%;
    pointer-events: none;
    z-index: 5;
    line-height: 0.92;
  }

  .name-surname,
  .name-firstname {
    font-size: clamp(40px, 6.71vw, 116px);
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
  }

  .name-surname {
    padding-left: 4.17vw;
    color: var(--color-content-accent, #bdff5d);
  }

  .name-firstname {
    padding-left: 19.68vw;
    color: transparent;
    -webkit-text-stroke: 2px var(--color-content-accent, #bdff5d);
  }

  /* ── Quote (top-right) ──────────────────────────────────────────── */
  /*
   * Figma: left ~calc(66.67% + 75px), top ~242px, w ~393px, 32px bold, right-aligned.
   */
  .vol-quote {
    position: absolute;
    left: calc(67% + 4.34vw);
    top: 21vh;
    width: clamp(180px, 22.7vw, 393px);
    margin: 0;
    padding: 0;
    font-size: clamp(16px, 1.85vw, 32px);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.03em;
    color: #fafafa;
    text-align: right;
    z-index: 6;
    font-style: normal;
  }

  .vol-quote--placeholder {
    opacity: 0.4;
    font-style: italic;
  }

  .qmark {
    font-size: 1.4em;
    line-height: 0.6;
    color: transparent;
    -webkit-text-stroke: 1px rgba(250,250,250,0.35);
    vertical-align: text-top;
  }

  /* ── Volunteer info (left, mid-page) ────────────────────────────── */
  /*
   * Figma: left:74px → 4.28vw, top:539px → ~47.7vh
   */
  .vol-info {
    position: absolute;
    left: 4.28vw;
    top: 47vh;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 30vw;
  }

  .info-role {
    margin: 0;
    font-size: clamp(18px, 2.08vw, 36px);  /* 36/1728 = 2.08vw */
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--color-content-accent, #bdff5d);
  }

  .info-location {
    margin: 0;
    font-size: clamp(14px, 1.39vw, 24px);  /* 24/1728 = 1.39vw */
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: 0.04em;
    color: #fafafa;
  }

  .info-detail {
    margin: 0;
    font-size: clamp(14px, 1.39vw, 24px);
    font-weight: 400;
    line-height: 1.3;
    color: rgba(250, 250, 250, 0.65);
  }

  /* ── Q&A accordion (right column) ──────────────────────────────── */
  /*
   * Figma: right:62px → 3.59vw, top:522px → 46.2vh, width:1059px → 61.3vw.
   * So left = 100% - 3.59vw - 61.3vw = 35.11vw
   */
  .qa-wrap {
    position: absolute;
    left: 35.11vw;
    right: 3.59vw;
    top: 44vh;
    bottom: 80px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    z-index: 10;
  }

  .qa-wrap::-webkit-scrollbar { display: none; }

  .qa-item {
    display: flex;
    flex-direction: column;
  }

  .qa-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border: 0;
    background: transparent;
    color: #fafafa;
    font-size: clamp(18px, 2.78vw, 48px);  /* 48/1728 = 2.78vw */
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    text-align: left;
    transition: color 0.15s ease;
  }

  .qa-row:hover,
  .qa-row--open {
    color: var(--color-content-accent, #bdff5d);
  }

  .qa-title { flex: 1; }

  .qa-icon {
    flex-shrink: 0;
    width: clamp(24px, 3.01vw, 52px);   /* 52/1728 = 3.01vw */
    height: clamp(24px, 3.01vw, 52px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(20px, 2.31vw, 40px);
    font-weight: 300;
    color: var(--color-content-accent, #bdff5d);
  }

  .qa-sep {
    height: 2px;
    background: rgba(250, 250, 250, 0.18);
    flex-shrink: 0;
  }

  .qa-answer {
    padding: 12px 0 16px;
    border-bottom: 1px solid rgba(250, 250, 250, 0.1);
  }

  .qa-answer p {
    margin: 0;
    font-size: clamp(14px, 1.04vw, 18px);
    font-weight: 400;
    line-height: 1.6;
    color: rgba(250, 250, 250, 0.8);
  }

  /* ── INFO / FOTO toggle (bottom-left) ──────────────────────────── */
  /*
   * Figma: left:72px → 4.17vw, bottom:48px.
   * Same geometry as gallery toggle: 180×45px track, 88×37px lime pill.
   * INFO is selected (pill on left), FOTO on right.
   */
  .toggle-area {
    position: fixed;
    left: 4.17vw;
    bottom: 48px;
    z-index: 30;
  }

  .toggle-track {
    position: relative;
    width: 180px;
    height: 45px;
    border-radius: 999px;
    background: #0e0e0e;
    overflow: hidden;
  }

  /* Lime pill — fixed on the left (INFO selected) */
  .toggle-pill {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 88px;
    height: 37px;
    border-radius: 995px;
    background: var(--color-content-accent, #bdff5d);
    pointer-events: none;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .toggle-opt {
    position: absolute;
    top: 0;
    width: 90px;  /* 180 / 2 */
    height: 45px;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    text-transform: uppercase;
  }

  .toggle-opt--info {
    left: 0;
    color: #0e0e0e;   /* dark text on lime pill */
    cursor: default;
  }

  .toggle-opt--foto {
    right: 0;
    color: #fafafa;   /* white text, unselected */
    transition: color 0.2s ease;
  }

  .toggle-opt--foto:hover { color: var(--color-content-accent, #bdff5d); }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .name-hero { top: 22vh; }
    .vol-info { top: 50vh; max-width: 35vw; }
    .qa-wrap  { left: 38vw; top: 46vh; }
    .vol-quote { left: 60%; width: 35vw; top: 23vh; }
  }

  @media (max-width: 768px) {
    /* Stack to a single-column scrollable layout on mobile */
    .profile { overflow-y: auto; height: auto; min-height: 100vh; }

    .name-hero  { position: relative; top: auto; margin-top: 120px; }
    .name-surname  { padding-left: 16px; }
    .name-firstname { padding-left: 48px; }

    .vol-quote {
      position: relative;
      left: auto; top: auto;
      width: 100%;
      text-align: left;
      padding: 20px 16px;
      font-size: 20px;
    }

    .vol-info {
      position: relative;
      left: auto; top: auto;
      max-width: 100%;
      padding: 24px 16px 0;
    }

    .qa-wrap {
      position: relative;
      left: auto; right: auto; top: auto; bottom: auto;
      overflow: visible;
      padding: 16px;
    }

    .qa-row { font-size: 20px; }

    .toggle-area { bottom: 24px; left: 16px; }
  }
</style>
