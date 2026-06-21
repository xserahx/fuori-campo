<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, volunteersNames, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';
  import { buildGalleryHref, readGalleryContext } from '$lib/data/gallery-context';
  import { fetchVolunteer, getImageUrl, getImageUrls, type VolunteerRow } from '$lib/supabase';

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
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  /* ── Supabase volunteer data ─────────────────────────────────── */
  let dbVol = $state<VolunteerRow | null>(null);

  $effect(() => {
    const slug = currentSlug;
    let cancelled = false;
    fetchVolunteer(slug).then(v => { if (!cancelled) dbVol = v; });
    return () => { cancelled = true; };
  });

  /* ── Resolved display values (DB takes priority) ─────────────── */
  const isManualVolunteer = $derived(!volunteer);

  const volunteerTitle = $derived(
    dbVol
      ? `${dbVol.cognome} ${dbVol.nome}`
      : (volunteer?.name
          ?? volunteersNames.find((name, i) => slugify(name, i) === currentSlug)
          ?? 'Volunteer')
  );

  const volunteerRole = $derived(
    dbVol
      ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? 'Volunteer').toUpperCase()
      : (volunteer?.role ?? 'Event Services Volunteer').toUpperCase()
  );

  /* ── Name display ────────────────────────────────────────────── */
  const nameParts = $derived(volunteerTitle.trim().split(/\s+/).filter(Boolean));
  const nameSurname = $derived(
    dbVol
      ? dbVol.cognome.toUpperCase()
      : isManualVolunteer
        ? nameParts[0]?.toUpperCase() ?? ''
        : nameParts.slice(1).join(' ').toUpperCase()
  );
  const nameFirstname = $derived(
    dbVol
      ? dbVol.nome.toUpperCase()
      : isManualVolunteer
        ? nameParts.slice(1).join(' ').toUpperCase()
        : nameParts[0]?.toUpperCase() ?? ''
  );

  /* ── Resolved location / detail lines ───────────────────────── */
  const resolvedLocation = $derived(
    dbVol
      ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? '').toUpperCase()
      : locationLine(volunteer)
  );

  const resolvedDetail = $derived(
    dbVol
      ? [dbVol.regione, dbVol.eta ? `${dbVol.eta} anni` : null].filter(Boolean).join(', ') || ''
      : detailLine(volunteer)
  );

  /* ── Quote ───────────────────────────────────────────────────── */
  const resolvedQuote = $derived(
    dbVol?.autorizzazione_risposte ? (dbVol.commento_positivo ?? null) : (volunteer?.quote ?? null)
  );

  /* ── Photo (main, for hero) ──────────────────────────────────── */
  const resolvedSrc = $derived(
    dbVol?.ha_immagini ? getImageUrl(dbVol.image_path) : null
  );

  /* ── All photos from Storage (preferred) or Figma fallback ───── */
  const dbPhotos = $derived(dbVol ? getImageUrls(dbVol) : []);
  const volunteerPhotos = $derived(
    dbPhotos.length > 0
      ? dbPhotos
      : imagesRaw.filter(img => img.name && volunteer?.name && img.name === volunteer.name).map(img => img.src)
  );

  /* ── Q&A responses ───────────────────────────────────────────── */
  const dbResponses = $derived(
    dbVol?.autorizzazione_risposte
      ? [
          dbVol.giornata_tipo,
          dbVol.percezione_pubblico,
          dbVol.commento_positivo,
          dbVol.commento_negativo,
          dbVol.cosa_porti,
          dbVol.commenti_generali,
          dbVol.rifai,
        ]
      : null
  );

  /* ── Image load state ────────────────────────────────────────── */
  let imgError = $state(false);
  $effect(() => { currentSlug; imgError = false; });

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

  function goBack() {
    goto(buildGalleryHref(currentContext));
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="profile">

  <!-- ── INDIETRO button ──────────────────────────────────────────── -->
  <button
    class="back-btn"
    type="button"
    onclick={goBack}
  >
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" style="flex-shrink:0">
      <path d="M17 5H1M1 5L6 1M1 5L6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="back-btn-label">INDIETRO</span>
  </button>

  <!-- ── Hero name ─────────────────────────────────────────────────── -->
  <div
    class="name-hero"
    role="img"
    aria-label={volunteerTitle}
  >
    {#if nameSurname}
      <div class="name-surname" aria-hidden="true">{nameSurname}</div>
    {/if}
    <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
  </div>

  <!-- ── Quote (top-right) ─────────────────────────────────────────── -->
  {#if resolvedQuote}
    <blockquote class="vol-quote">
      <span class="qmark qmark--open" aria-hidden="true">"</span>
      <p class="quote-body">{resolvedQuote}</p>
      <span class="qmark qmark--close" aria-hidden="true">"</span>
    </blockquote>
  {:else}
    <blockquote class="vol-quote vol-quote--dim">
      <span class="qmark qmark--open" aria-hidden="true">"</span>
      <p class="quote-body">Un'esperienza che non dimenticherò mai.</p>
      <span class="qmark qmark--close" aria-hidden="true">"</span>
    </blockquote>
  {/if}

  <!-- ── Volunteer info (left, below name) ─────────────────────────── -->
  <div class="vol-info">
    <p class="info-role">{volunteerRole}</p>
    <p class="info-location">{resolvedLocation}<br />{resolvedDetail}</p>
  </div>

  <!-- ── Photo column (left) ───────────────────────────────────────── -->
  <div class="photo-col">
    <div class="photo-fade photo-fade--top" aria-hidden="true"></div>
    <div class="photo-fade photo-fade--bottom" aria-hidden="true"></div>
    <div class="photo-scroll">
      {#each volunteerPhotos as img (img.src + img.left)}
        <button
          class="photo-btn"
          type="button"
          aria-label="Vedi foto grande"
          onclick={() => goto(`/volunteer/${currentSlug}`)}
        >
          <img
            src={img.src}
            alt={img.name ?? 'foto volunteer'}
            class="photo-img"
            draggable="false"
          />
        </button>
      {/each}
      {#if volunteerPhotos.length === 0 && resolvedSrc && !imgError}
        <button
          class="photo-btn"
          type="button"
          aria-label="Vedi foto grande"
          onclick={() => goto(`/volunteer/${currentSlug}`)}
        >
          <img
            src={resolvedSrc}
            alt={volunteerTitle}
            class="photo-img"
            draggable="false"
            onerror={() => { imgError = true; }}
          />
        </button>
      {:else if volunteerPhotos.length === 0 && volunteer?.src}
        <button
          class="photo-btn"
          type="button"
          aria-label="Vedi foto grande"
          onclick={() => goto(`/volunteer/${currentSlug}`)}
        >
          <img
            src={volunteer.src}
            alt={volunteer?.name ?? 'foto volunteer'}
            class="photo-img"
            draggable="false"
          />
        </button>
      {/if}
    </div>
  </div>

  <!-- ── Q&A accordion (right column) ─────────────────────────────── -->
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
          <span class="qa-icon" class:qa-icon--open={openQ === i} aria-hidden="true">+</span>
        </button>
        <div class="qa-sep" class:qa-sep--open={openQ === i}>
          {#if openQ === i}
            <div class="qa-answer" role="region" aria-live="polite">
              {#if dbResponses}
                <p>{dbResponses[i] ?? 'Nessuna risposta disponibile.'}</p>
              {:else if i === 0 && volunteer?.dayDescription}
                <p>{volunteer.dayDescription}</p>
              {:else}
                <p>{volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.'}</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

</main>

<style>
  /* ── Global ─────────────────────────────────────────────────────── */
  :global(html), :global(body) {
    margin: 0;
    background: #0e0e0e;
    color: #fafafa;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: 'Forma DJR Display', sans-serif;
  }

  /* ── Page shell ─────────────────────────────────────────────────── */
  .profile {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: #0e0e0e;
    color: #fafafa;
  }

  /* ── INDIETRO button ─────────────────────────────────────────────── */
  /* Figma 6103-10525: border-2 lime, px-20 py-12, gap-12, radius-999, w-168px */
  .back-btn {
    position: absolute;
    left: 4.17vw;
    top: calc(var(--navbar-height, 125px) + 24px);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    width: 168px;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: #0e0e0e;
    color: #fafafa;
    cursor: pointer;
    white-space: nowrap;
  }

  .back-btn-label {
    font-size: 24px;
    font-weight: 500;
    line-height: 26px;
    width: 98px;
    text-align: center;
    pointer-events: none;
    user-select: none;
    transition: filter 0.22s ease;
  }

  .back-btn:hover .back-btn-label {
    filter: blur(4px);
  }

  /* ── Hero name ───────────────────────────────────────────────────── */
  /* Figma 6103:7013: container top 337px (frame) = 225px, py-20px
     → surname text starts at 245px. Leading: 116px. mb-[-8px] on surname.  */
  .name-hero {
    position: absolute;
    left: 0;
    top: 225px;
    width: 100%;
    padding: 20px 0;
    pointer-events: auto;
    z-index: 5;
  }

  .name-surname,
  .name-firstname {
    font-size: clamp(40px, 6.71vw, 116px);
    font-weight: 800;
    line-height: 116px;
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
  }

  .name-surname {
    padding-left: 72px;
    margin-bottom: -8px;
    color: var(--color-content-accent, #bdff5d);
  }

  .name-firstname {
    padding-left: 340px;
    color: transparent;
    -webkit-text-stroke: 2px var(--color-content-accent, #bdff5d);
  }

  /* ── Volunteer info (left) ───────────────────────────────────────── */
  /* Figma 6103:7015: left 74px, top 629px (frame) = 517px viewport */
  /* Figma 6103:7015: left 74px, top 629px (frame) = 517px, w 513px */
  .vol-info {
    position: absolute;
    left: 72px;
    top: 517px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 513px;
  }

  /* font-size: var(--unit/36, 36px), tracking: 1.44px */
  .info-role {
    margin: 0;
    font-size: clamp(14px, 2.08vw, 36px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 1.44px;
    color: var(--color-content-accent, #bdff5d);
  }

  /* font-size: var(--unit/24, 24px), tracking: 0.96px — location + detail in one p */
  .info-location {
    margin: 0;
    font-size: clamp(12px, 1.39vw, 24px);
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: 0.96px;
    white-space: pre-wrap;
    color: #fafafa;
  }

  /* ── Quote (top-right) ───────────────────────────────────────────── */
  /* Figma 6103:7018: left calc(66.67%+80px), top 357px (frame) = 245px viewport
     Container: w-429px h-176px. Text: w-393px, Bold 32px, right-aligned.
     Quote marks: 84px Medium, transparent (text-stroke).                      */
  .vol-quote {
    position: absolute;
    left: calc(66.67% + 80px);
    top: 245px;
    width: 429px;
    height: 176px;
    margin: 0;
    padding: 0;
    z-index: 6;
    font-style: normal;
  }

  .vol-quote--dim { opacity: 0.55; }

  /* Opening " — top-left of the container, transparent outline */
  .qmark--open {
    position: absolute;
    left: 0;
    top: 0;
    font-size: clamp(40px, 4.86vw, 84px);
    font-weight: 500;
    line-height: 80px;
    color: transparent;
    -webkit-text-stroke: 2px #fafafa;
    user-select: none;
  }

  /* Closing " — bottom-right */
  .qmark--close {
    position: absolute;
    right: 0;
    bottom: 0;
    font-size: clamp(40px, 4.86vw, 84px);
    font-weight: 500;
    line-height: 80px;
    color: transparent;
    -webkit-text-stroke: 2px #fafafa;
    user-select: none;
  }

  /* Quote text — 32px Bold, right-aligned, w-393px, right-edge of container */
  .quote-body {
    position: absolute;
    right: 0;
    top: 0;
    width: 393px;
    margin: 0;
    font-size: clamp(14px, 1.85vw, 32px);
    font-weight: 700;
    line-height: 32px;
    letter-spacing: 0.96px;
    color: #fafafa;
    text-align: right;
    white-space: pre-wrap;
  }

  /* ── Photo column (left) ─────────────────────────────────────────── */
  /* Figma 6103:7000: left 72px, top 757px (frame) = 645px viewport, w 782px, h 570px */
  .photo-col {
    position: absolute;
    left: 72px;
    top: 645px;
    width: 782px;
    height: 570px;
    overflow: hidden;
    z-index: 8;
  }

  .photo-fade {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
    height: 120px;
  }

  .photo-fade--top {
    top: 0;
    background: linear-gradient(to bottom, #0e0e0e 0%, transparent 100%);
    backdrop-filter: blur(4px);
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }

  .photo-fade--bottom {
    bottom: 0;
    background: linear-gradient(to top, #0e0e0e 0%, transparent 100%);
    backdrop-filter: blur(4px);
    mask-image: linear-gradient(to top, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, black 60%, transparent 100%);
  }

  .photo-scroll {
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

  .photo-scroll::-webkit-scrollbar { display: none; }

  .photo-btn {
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

  .photo-btn:hover { opacity: 0.82; }

  .photo-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
    border-radius: 4px;
  }

  /* ── Q&A accordion (right column) ───────────────────────────────── */
  /* Figma 6103:15338: w-1059px, gap-20px (var --spacing/4,5), right: 73px.
     All items uniform: font var(--unit/48)=48px, tracking 1.92px.
     Title: w-879px. Icon: size-52px. Separator: h-2.417px.               */
  .qa-wrap {
    position: absolute;
    right: 73px;
    top: 689px;
    width: 1059px;
    bottom: 40px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    font-size: 48px;
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 1.92px;
    cursor: pointer;
    text-align: left;
    transition: color 0.15s ease;
  }

  .qa-row:hover,
  .qa-row--open { color: var(--color-content-accent, #bdff5d); }

  .qa-row:hover + .qa-sep:not(.qa-sep--open) { background: #bdff5d; }

  /* Figma: title w-879px within 1059px item, icon size-52px */
  .qa-title { flex: 1; max-width: 879px; }

  .qa-icon {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 42px;
    font-weight: 300;
    color: var(--color-content-accent, #bdff5d);
    transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .qa-icon--open { transform: rotate(-45deg); }

  /* Figma: separator h-2.417px → hover lime → expanded lime card */
  .qa-sep {
    height: 2.417px;
    background: #fafafa;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    transition: background 200ms ease;
  }

  .qa-sep--open {
    height: auto;
    min-height: 320px;
    background: #bdff5d;
  }

  .qa-answer {
    padding: 48px 64px;
  }

  .qa-answer p {
    margin: 0;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 28px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.04em;
    color: #0e0e0e;
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1280px) {
    .name-surname  { padding-left: 3.2vw; }
    .name-firstname { padding-left: 15vw; }
    .vol-info  { left: 3.2vw; }
    .vol-quote { left: calc(64% + 2vw); width: clamp(140px, 20vw, 360px); }
    .photo-col { left: 3.2vw; width: 45vw; }
    .qa-wrap   { right: 3.2vw; width: 42vw; }
  }

  @media (max-width: 1100px) {
    .name-firstname { padding-left: 12vw; }
    .vol-quote    { left: 62%; width: clamp(120px, 18vw, 300px); }
    .quote-body   { font-size: clamp(12px, 1.5vw, 26px); }
    .qmark        { font-size: clamp(28px, 4.5vw, 56px); }
    .photo-col    { left: 3vw; width: 44vw; }
    .qa-wrap      { right: 3vw; width: 40vw; }
  }

  @media (max-width: 768px) {
    .profile { overflow-y: auto; height: auto; min-height: 100dvh; }

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
      width: 100%;
      padding: 24px 16px 0;
    }

    .photo-col {
      position: relative;
      left: auto; top: auto;
      width: 100%;
      height: 60vh;
      margin: 16px 0;
    }

    .qa-wrap {
      position: relative;
      left: auto; right: auto; top: auto; bottom: auto;
      width: 100%;
      overflow: visible;
      padding: 16px;
    }

    .qa-row { font-size: 20px; }
  }
</style>
