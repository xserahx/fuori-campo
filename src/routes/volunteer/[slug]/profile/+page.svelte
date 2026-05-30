<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';

  /* ── Extended volunteer type ─────────────────────────────────── */
  type Volunteer = GalleryImage & {
    city?:           string;
    region?:         string;
    role?:           string;
    age?:            number;
    quote?:          string;
    responses?:      string[];
    dayDescription?: string;
  };

  /* ── Reactive volunteer from URL ─────────────────────────────── */
  const currentSlug = $derived((page.params as Record<string, string>).slug ?? '');

  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  /* ── Name display: firstname (outline) + surname (filled) ───── */
  const nameSurname = $derived(
    (volunteer?.name ?? '').trim().split(/\s+/).slice(1).join(' ').toUpperCase()
  );
  const nameFirstname = $derived(
    (volunteer?.name ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
  );

  /* ── Photos for this volunteer (for FOTO view) ───────────────── */
  const volunteerPhotos = $derived(
    imagesRaw.filter(img => img.name && volunteer?.name && img.name === volunteer.name)
  );

  /* ── View mode toggle: 'info' | 'foto' ───────────────────────── */
  let viewMode = $state<'info' | 'foto'>('info');

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

  /* Reset on navigation */
  $effect(() => { currentSlug; openQ = -1; viewMode = 'info'; });


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

  <!-- ── INDIETRO button (always visible) ──────────────────────── -->
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

  <!-- ── Hero name (always visible, both modes) ────────────────── -->
  <!--
    Line 1: SURNAME — lime filled,   left: 4.17vw  (72px / 1728px artboard)
    Line 2: FIRSTNAME — lime outline, left: 19.68vw (340px / 1728px artboard)
    Font: 116px extra-bold → clamp(40px, 6.71vw, 116px)
  -->
  <div
    class="name-hero"
    role="img"
    aria-label={volunteer?.name}
  >
    {#if nameSurname}
      <div class="name-surname" aria-hidden="true">{nameSurname}</div>
    {/if}
    <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
  </div>

  <!-- ════════════════════════════════════════════════════════════
       INFO VIEW
       Left column : volunteer info (role / location / detail)
       Right column: Q&A accordion
       ════════════════════════════════════════════════════════════ -->
  {#if viewMode === 'info'}

    <!-- Volunteer info (left, mid-page) -->
    <div class="vol-info">
      <p class="info-role">{(volunteer?.role ?? 'Event Services Volunteer').toUpperCase()}</p>
      <p class="info-location">{locationLine(volunteer)}</p>
      <p class="info-detail">{detailLine(volunteer)}</p>
    </div>

    <!-- Quote (top-right) -->
    {#if volunteer?.quote}
      <blockquote class="vol-quote">
        <span class="qmark qmark--open" aria-hidden="true">“</span>
        <p class="quote-body">{volunteer.quote}</p>
        <span class="qmark qmark--close" aria-hidden="true">”</span>
      </blockquote>
    {:else}
      <blockquote class="vol-quote vol-quote--dim">
        <span class="qmark qmark--open" aria-hidden="true">“</span>
        <p class="quote-body">Un'esperienza che non dimenticherò mai.</p>
        <span class="qmark qmark--close" aria-hidden="true">”</span>
      </blockquote>
    {/if}

    <!-- Q&A accordion (right column) -->
    <!--
      Figma: right:62px → 3.59vw, top:522px → 46.2vh of 1130px artboard.
      Width: 1059px → 61.3vw, so left = 100% - 3.59vw - 61.3vw = 35.11vw.
    -->
    <div class="qa-wrap" role="list">
      {#each questionTitles as q, i}
        <div class="qa-item" role="listitem">
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
            <div class="qa-answer" role="region" aria-live="polite">
              <!-- First question: show lime day-description card if available -->
              {#if i === 0 && volunteer?.dayDescription}
                <div class="day-card">
                  <p class="day-card__text">{volunteer.dayDescription}</p>
                </div>
              {:else}
                <p>{volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.'}</p>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

  {:else}
  <!-- ════════════════════════════════════════════════════════════
       FOTO VIEW (Figma 6039:15675 / 6039:15746)
       Right side: scrollable vertical column of volunteer photos,
       with fade-mask at top & bottom.
       Clicking a photo → back to lightbox for this volunteer.
       ════════════════════════════════════════════════════════════ -->
    <div class="foto-wrap">
      <!-- Top + bottom blur gradients from Figma -->
      <div class="foto-fade foto-fade--top" aria-hidden="true"></div>
      <div class="foto-fade foto-fade--bottom" aria-hidden="true"></div>

      <div class="foto-scroll">
        {#each volunteerPhotos as img (img.src + img.left)}
          <button
            class="foto-btn"
            type="button"
            aria-label="Vedi foto grande"
            onclick={() => goto(`/volunteer/${currentSlug}`)}
          >
            <img
              src={img.src}
              alt={img.name ?? 'foto volunteer'}
              class="foto-img"
              draggable="false"
            />
          </button>
        {/each}

        <!-- Fallback: show src from volunteer directly if no tagged photos -->
        {#if volunteerPhotos.length === 0 && volunteer?.src}
          <button
            class="foto-btn"
            type="button"
            aria-label="Vedi foto grande"
            onclick={() => goto(`/volunteer/${currentSlug}`)}
          >
            <img
              src={volunteer.src}
              alt={volunteer?.name ?? 'foto volunteer'}
              class="foto-img"
              draggable="false"
            />
          </button>
        {/if}
      </div>
    </div>

  {/if}

  <!-- ── INFO / FOTO toggle (bottom-left, always visible) ──────── -->
  <div class="toggle-area">
    <div class="toggle-track" class:toggle--foto={viewMode === 'foto'}>
      <span class="toggle-pill" aria-hidden="true"></span>
      <button
        class="toggle-opt toggle-opt--info"
        type="button"
        aria-pressed={viewMode === 'info'}
        onclick={() => { viewMode = 'info'; openQ = -1; }}
      >
        INFO
      </button>
      <button
        class="toggle-opt toggle-opt--foto"
        type="button"
        aria-pressed={viewMode === 'foto'}
        onclick={() => { viewMode = 'foto'; }}
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
  .back-btn {
    position: absolute;
    left: 4.17vw;
    top: calc(var(--navbar-height, 125px) + 24px);
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
   * Figma artboard: 1728px wide, artboard top: ~113px browser chrome.
   * Line 1 (surname):   padding-left  72px → 4.17vw, lime filled
   * Line 2 (firstname): padding-left 340px → 19.68vw, lime outline
   * Font size: 116px → clamp(40px, 6.71vw, 116px)
   * Top: 222px from artboard, after browser chrome offset
   */
  .name-hero {
    position: absolute;
    left: 0;
    /* Stay below INDIETRO button (≈125+24+50px) with breathing room */
    top: calc(var(--navbar-height, 125px) + 100px);
    width: 100%;
    pointer-events: auto;
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

  /* ── Volunteer info (left, mid-page, INFO mode only) ──────────── */
  /*  Below name hero: name-top + 2 lines of font + gap.
      2 lines ≈ clamp(74px, 12.4vw, 213px)  [2 × clamp(40,6.71vw,116) × 0.92] */
  .vol-info {
    position: absolute;
    left: 4.28vw;
    top: calc(var(--navbar-height, 125px) + 100px + clamp(74px, 12.4vw, 213px) + 20px);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 28vw;
  }

  .info-role {
    margin: 0;
    font-size: clamp(14px, 2.08vw, 36px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--color-content-accent, #bdff5d);
  }

  .info-location {
    margin: 0;
    font-size: clamp(12px, 1.39vw, 24px);
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: 0.04em;
    color: #fafafa;
  }

  .info-detail {
    margin: 0;
    font-size: clamp(12px, 1.39vw, 24px);
    font-weight: 400;
    line-height: 1.3;
    color: rgba(250, 250, 250, 0.6);
  }

  /* ── Quote (top-right, INFO mode only) ──────────────────────────── */
  /*
   * Figma 6039:15669 — right column, top-aligned with name hero.
   * Layout: opening " (84px Medium, left) → text (32px Bold, right) → closing " (84px Medium, right)
   */
  .vol-quote {
    position: absolute;
    left: calc(67% + 4vw);
    top: calc(var(--navbar-height, 125px) + 100px);
    width: clamp(160px, 22.7vw, 393px);
    margin: 0;
    padding: 0;
    z-index: 6;
    display: flex;
    flex-direction: column;
    font-style: normal;
  }

  /* Placeholder (no real quote yet) — slightly dimmed */
  .vol-quote--dim { opacity: 0.55; }

  /* Large decorative quotation marks — 84 px Medium weight, outline (Figma H2) */
  .qmark {
    display: block;
    font-size: clamp(40px, 5.5vw, 84px);
    font-weight: 500;          /* Medium */
    line-height: clamp(50px, 5.5vw, 80px);
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 2px var(--color-content-body, #fafafa);
    user-select: none;
  }

  /* Opening mark: left-aligned (hangs into left margin) */
  .qmark--open  { text-align: left; }
  /* Closing mark: right-aligned */
  .qmark--close { text-align: right; }

  /* Quote text — 32 px Bold, right-aligned (Figma h3) */
  .quote-body {
    margin: 0;
    font-size: clamp(14px, 2.2vw, 32px);
    font-weight: 700;          /* Bold */
    line-height: 1;
    letter-spacing: 0.96px;
    color: #fafafa;
    text-align: right;
  }

  /* ── Day-description lime card (Figma 3772:4591) ─────────────── */
  /*
   * Figma: 1062×219px, accent background (#bdff5d), rounded rect.
   * Rendered inside the first Q&A answer — expands when + is clicked.
   */
  .day-card {
    background: var(--color-content-accent, #bdff5d);
    border-radius: 12px;
    padding: clamp(20px, 2.1vw, 36px) clamp(24px, 2.5vw, 44px);
    margin-top: 8px;
    min-height: clamp(120px, 12.7vw, 219px);
  }

  .day-card__text {
    margin: 0;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: 26px;
    color: var(--color-content-body-black, #0e0e0e);
  }

  /* ── Q&A accordion (right column, INFO mode) ─────────────────── */
  /*  Starts at the same top as vol-info, below the name hero */
  .qa-wrap {
    position: absolute;
    left: 35.11vw;
    right: 3.59vw;
    top: calc(var(--navbar-height, 125px) + 100px + clamp(74px, 12.4vw, 213px) + 20px);
    bottom: 80px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 1.16vw, 20px);
  }

  .qa-wrap::-webkit-scrollbar { display: none; }

  .qa-item { display: flex; flex-direction: column; }

  .qa-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: #fafafa;
    /* Figma: Unit/48 = 48px at 1728px artboard → 2.78vw */
    font-size: clamp(16px, 2.78vw, 48px);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;  /* 4% = 1.92px at 48px — matches Figma */
    cursor: pointer;
    text-align: left;
    transition: color 0.15s ease;
  }

  .qa-row:hover,
  .qa-row--open { color: var(--color-content-accent, #bdff5d); }

  .qa-title { flex: 1; }

  .qa-icon {
    flex-shrink: 0;
    width: clamp(24px, 3.01vw, 52px);
    height: clamp(24px, 3.01vw, 52px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(18px, 2.31vw, 40px);
    font-weight: 300;
    color: var(--color-content-accent, #bdff5d);
  }

  /* Figma: separator 2.417px — var(--color/link/default, #fafafa) */
  .qa-sep {
    height: 2.417px;
    background: #fafafa;
    flex-shrink: 0;
  }

  .qa-answer {
    padding: 12px 0 16px;
    border-bottom: 1px solid rgba(250, 250, 250, 0.1);
  }

  .qa-answer p {
    margin: 0;
    font-size: clamp(13px, 1.04vw, 18px);
    font-weight: 400;
    line-height: 1.6;
    color: rgba(250, 250, 250, 0.8);
  }

  .day-card .day-card__text {
    color: var(--color-content-body-black, #0e0e0e);
  }

  /* ── FOTO view wrapper ───────────────────────────────────────────── */
  /*
   * Figma 6039:15675: photo column centered at x ≈ 74.5vw (right of center),
   * spanning from below the name to near-bottom of screen.
   * Width ≈ 42.6vw (735.966 / 1728). Centred in the right half.
   */
  .foto-wrap {
    position: absolute;
    left: 53vw;        /* start right of center, matching Figma */
    right: 3.59vw;
    top: calc(var(--navbar-height, 125px) + 100px + clamp(74px, 12.4vw, 213px) + 20px);
    bottom: 80px;
    z-index: 10;
    overflow: hidden;
  }

  /* Top fade: blur gradient from Figma */
  .foto-fade {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
    height: 120px;
  }

  .foto-fade--top {
    top: 0;
    background: linear-gradient(to bottom, #0e0e0e 0%, transparent 100%);
    backdrop-filter: blur(4px);
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }

  .foto-fade--bottom {
    bottom: 0;
    background: linear-gradient(to top, #0e0e0e 0%, transparent 100%);
    backdrop-filter: blur(4px);
    mask-image: linear-gradient(to top, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, black 60%, transparent 100%);
  }

  /* Scrollable photo column */
  .foto-scroll {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 40px 0;
  }

  .foto-scroll::-webkit-scrollbar { display: none; }

  .foto-btn {
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    display: block;
    width: 100%;
    flex-shrink: 0;
    transition: opacity 0.2s ease;
    border-radius: 4px;
    overflow: hidden;
  }

  .foto-btn:hover { opacity: 0.82; }

  .foto-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
    border-radius: 4px;
  }

  /* ── INFO / FOTO toggle ──────────────────────────────────────────── */
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

  /* Shift pill to the right when FOTO is active */
  .toggle--foto .toggle-pill { transform: translateX(84px); }

  .toggle-opt {
    position: absolute;
    top: 0;
    width: 90px;
    height: 45px;
    border: 0;
    background: transparent;
    padding-top: 11px;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    text-align: center;
    text-transform: uppercase;
    transition: color 0.2s ease;
  }

  /* INFO (left side) */
  .toggle-opt--info {
    left: 0;
    justify-content: flex-start;
    padding-left: 20px;
    padding-right: 0;
  }
  /* FOTO (right side) */
  .toggle-opt--foto {
    right: 0;
    justify-content: flex-end;
    padding-left: 0;
    padding-right: 20px;
  }

  /* Colours: selected = dark text on lime pill; unselected = white */
  .toggle-opt--info { color: #0e0e0e; }   /* INFO default: on lime (selected) */
  .toggle-opt--foto { color: #fafafa; }   /* FOTO default: unselected */

  /* When FOTO is active, flip the colours */
  .toggle--foto .toggle-opt--info { color: #fafafa; }
  .toggle--foto .toggle-opt--foto { color: #0e0e0e; }

  /* ── Responsive ─────────────────────────────────────────────────── */

  /* Small laptop 1024–1280 px — tighten columns */
  @media (max-width: 1280px) {
    .name-surname  { padding-left: 3.2vw; }
    .name-firstname { padding-left: 15vw; }
    .vol-info  { max-width: 30vw; left: 3.2vw; }
    .qa-wrap   { left: 34vw; }
    .vol-quote { left: calc(64% + 2vw); width: clamp(140px, 20vw, 360px); }
    .foto-wrap { left: 50vw; }
    .back-btn  { font-size: 20px; }
  }

  /* Compact laptop ≤1100 px */
  @media (max-width: 1100px) {
    .name-firstname { padding-left: 12vw; }
    .vol-info  { max-width: 28vw; }
    .qa-wrap   { left: 36vw; }
    .vol-quote    { left: 62%; width: clamp(120px, 18vw, 300px); }
    .quote-body   { font-size: clamp(12px, 1.5vw, 26px); }
    .qmark        { font-size: clamp(28px, 4.5vw, 56px); }
    .foto-wrap { left: 48vw; }
    .back-btn  { font-size: 18px; padding: 10px 14px; }
    .toggle-area { left: 3.2vw; }
  }

  /* Tablet breakpoint — switch to single-column flow */
  @media (max-width: 768px) {
    .profile { overflow-y: auto; height: auto; min-height: 100vh; }

    .name-hero      { position: relative; top: auto; margin-top: 120px; }
    .name-surname   { padding-left: 16px; }
    .name-firstname { padding-left: 48px; }

    .vol-quote {
      position: relative;
      left: auto; top: auto;
      width: 100%;
      padding: 20px 16px;
    }

    .quote-body { font-size: 18px; text-align: right; }
    .qmark      { font-size: 40px; }

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

    .foto-wrap {
      position: relative;
      left: auto; right: auto; top: auto; bottom: auto;
      height: 60vh;
      margin: 16px;
    }

    .toggle-area { bottom: 24px; left: 16px; }
  }
</style>
