<script lang="ts">
  import '../../../../lib/styles/tokens.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { imagesRaw, slugify, type GalleryImage } from '$lib/data/gallery';
  import Navbar from '$lib/components/Navbar.svelte';
  import { buildGalleryHref, readGalleryContext } from '$lib/data/gallery-context';
  import { getImageUrls } from '$lib/data/volunteers';
  import type { PageData } from './$types';

  /* ── Page data (dbVol pre-fetched by load function) ─────────── */
  let { data }: { data: PageData } = $props();
  const dbVol = $derived(data.dbVol);

  /* ── Extended volunteer type (for Figma photo fallback only) ─── */
  type Volunteer = GalleryImage & { dayDescription?: string; responses?: string[] };

  /* ── Reactive slug / context ─────────────────────────────────── */
  const currentSlug = $derived((page.params as Record<string, string>).slug ?? '');
  const currentContext = $derived(readGalleryContext(page.url.searchParams));

  // Figma image entry — used only as photo fallback when volunteer has no DB photos
  const volunteer = $derived(
    (imagesRaw as Volunteer[]).find((img, i) => img.name && slugify(img.name, i) === currentSlug) ?? null
  );

  /* ── Display values — DB is the single source of truth ──────── */
  const volunteerTitle = $derived(
    dbVol ? `${dbVol.cognome} ${dbVol.nome}` : (volunteer?.name ?? '')
  );

  const volunteerRole = $derived(
    dbVol ? (dbVol.ruolo_specifico ?? dbVol.ruolo_generale ?? '').toUpperCase() : ''
  );

  const nameSurname   = $derived(dbVol?.cognome.toUpperCase() ?? '');
  const nameFirstname = $derived(dbVol?.nome.toUpperCase()    ?? '');

  const resolvedLocation = $derived(
    dbVol ? (dbVol.venue_montagna ?? dbVol.venue_milano ?? '').toUpperCase() : ''
  );

  const resolvedDetail = $derived(
    dbVol
      ? [dbVol.regione, dbVol.eta ? `${dbVol.eta} anni` : null].filter(Boolean).join(', ')
      : ''
  );

  const resolvedQuote = $derived(
    dbVol?.autorizzazione_risposte ? (dbVol.commento_positivo ?? null) : null
  );

  /* ── Photos: this volunteer's own photos (DB first, Figma fallback) ── */
  const dbPhotos    = $derived(dbVol ? getImageUrls(dbVol) : []);
  const figmaPhotos = $derived(
    imagesRaw
      .filter(img => img.name && volunteer?.name && img.name === volunteer.name)
      .map(img => img.src)
  );
  const volunteerPhotos = $derived(dbPhotos.length > 0 ? dbPhotos : figmaPhotos);
  const photoCount      = $derived(volunteerPhotos.length);

  /* ── Coverflow carousel — all of THIS volunteer's photos ─────────
     Active image sits at the centre, the volunteer's other photos flank
     it on the sides (circular). Premium feel comes from the per-slide
     GPU transitions in the stylesheet (slide + scale + blur + fade). */
  let activePhoto = $state(0);
  $effect(() => { currentSlug; activePhoto = 0; });   // always start centred on photo 0

  function stepPhoto(dir: number) {
    if (photoCount <= 1) return;
    activePhoto = (activePhoto + dir + photoCount) % photoCount;
  }

  /* Minimal *signed* circular distance of slide i from the active one, so the
     previous photo wraps onto the left and the next onto the right. */
  function slideOffset(i: number): number {
    const n = photoCount;
    if (n <= 1) return 0;
    let d = (i - activePhoto) % n;
    if (d >  n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

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

  function answerFor(i: number): string {
    if (dbResponses) return dbResponses[i] ?? 'Nessuna risposta disponibile.';
    if (i === 0 && volunteer?.dayDescription) return volunteer.dayDescription;
    return volunteer?.responses?.[i] ?? 'Nessuna risposta disponibile.';
  }

  function goBack() {
    goto(buildGalleryHref(currentContext));
  }
</script>

<svelte:head>
  <title>{volunteerTitle} — {volunteerRole} — Fuori Campo</title>
</svelte:head>

<Navbar pinned />

<main class="profile" id="main-content">

  <!-- ── INDIETRO button ──────────────────────────────────────────── -->
  <button class="back-btn" type="button" onclick={goBack}>
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" style="flex-shrink:0">
      <path d="M17 5H1M1 5L6 1M1 5L6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="back-btn-label">INDIETRO</span>
  </button>

  <!-- ── Header: hero name (left) + quote (right) ─────────────────── -->
  <header class="head">
    <div class="name-hero" role="img" aria-label={volunteerTitle}>
      {#if nameSurname}<div class="name-surname" aria-hidden="true">{nameSurname}</div>{/if}
      <div class="name-firstname" aria-hidden="true">{nameFirstname}</div>
    </div>

    <!-- Quote — marks hug the text block so they reflow with its length -->
    <blockquote class="vol-quote" class:vol-quote--dim={!resolvedQuote}>
      <span class="qmark qmark--open" aria-hidden="true">“</span>
      <p class="quote-body">{resolvedQuote ?? "Un'esperienza che non dimenticherò mai."}</p>
      <span class="qmark qmark--close" aria-hidden="true">”</span>
    </blockquote>
  </header>

  <!-- ── Volunteer info (role + location) ─────────────────────────── -->
  <div class="vol-info">
    <p class="info-role">{volunteerRole}</p>
    <p class="info-location">{resolvedLocation}<br />{resolvedDetail}</p>
  </div>

  <!-- ── Coverflow carousel — all of this volunteer's photos.
       Volunteers without any photo simply skip this section (Figma 6197-8306). -->
  {#if photoCount > 0}
    <section class="carousel" aria-label="Galleria foto">
      {#if photoCount > 1}
        <button class="car-arrow car-arrow--prev" type="button" aria-label="Foto precedente" onclick={() => stepPhoto(-1)}>
          <svg width="14" height="26" viewBox="0 0 14 26" fill="none" aria-hidden="true">
            <path d="M12 2L2 13L12 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}

      <div class="car-stage">
        {#each volunteerPhotos as photoUrl, i (photoUrl + i)}
          {@const off = slideOffset(i)}
          <div
            class="slide"
            class:slide--active={off === 0}
            class:slide--far={Math.abs(off) > 1}
            style="--off:{off}; z-index:{20 - Math.abs(off)};"
            aria-hidden={off !== 0}
          >
            <img class="slide-img" src={photoUrl} alt={off === 0 ? (volunteerTitle || 'foto volunteer') : ''} draggable="false" />
          </div>
        {/each}
      </div>

      {#if photoCount > 1}
        <button class="car-arrow car-arrow--next" type="button" aria-label="Foto successiva" onclick={() => stepPhoto(1)}>
          <svg width="14" height="26" viewBox="0 0 14 26" fill="none" aria-hidden="true">
            <path d="M2 2L12 13L2 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}
    </section>
  {/if}

  <!-- ── Q&A accordion ────────────────────────────────────────────── -->
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
          <span class="qa-icon" class:qa-icon--open={openQ === i} aria-hidden="true">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <path d="M26 14V38M14 26H38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
        </button>
        <div class="qa-sep" class:qa-sep--open={openQ === i}>
          {#if openQ === i}
            <div class="qa-answer" role="region" aria-live="polite">
              <p>{answerFor(i)}</p>
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
    font-family: var(--font-display);
  }

  /* ── Page shell — scrolls vertically ────────────────────────────── */
  .profile {
    position: relative;
    width: 100vw;
    min-height: 100dvh;
    padding: calc(var(--navbar-height, 125px) + 24px) 0 96px;
    background: #0e0e0e;
    color: #fafafa;
    overflow-x: hidden;
  }

  /* ── INDIETRO button ─────────────────────────────────────────────── */
  .back-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 0 var(--spacing-11, 72px);
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
  .back-btn:hover .back-btn-label { filter: blur(4px); }

  /* ── Header: name hero (left) + quote (top-right) ───────────────── */
  .head {
    position: relative;
    margin-top: 28px;
    min-height: 300px;
  }
  .name-hero { pointer-events: none; }
  .name-surname,
  .name-firstname {
    font-size: clamp(56px, 8vw, 116px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
  }
  .name-surname {
    padding-left: var(--spacing-11, 72px);
    margin-bottom: -8px;
    color: var(--color-content-accent, #bdff5d);
  }
  .name-firstname {
    padding-left: clamp(48px, 19vw, 340px);
    color: transparent;
    -webkit-text-stroke: 2px var(--color-content-accent, #bdff5d);
  }

  /* ── Quote — dynamic: marks pin to the corners of the auto-sized text
     block, so they reflow with the quote length (no fixed height/offsets).
     Figma 6250-4987: marks 84px outline, body 32px bold, right-aligned.  */
  .vol-quote {
    position: absolute;
    right: var(--spacing-11, 72px);
    top: 8px;
    width: 429px;
    max-width: 38vw;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;   /* text + closing mark hug the right edge */
    font-style: normal;
  }
  .vol-quote--dim { opacity: 0.55; }

  /* Quote marks live in the layout flow, so they reposition automatically with
     the text's length and stay glued to the block — no absolute offsets.
     Opening mark pins to the top-left, closing mark to the bottom-right. */
  .qmark {
    font-size: 84px;
    font-weight: 500;
    line-height: 0.66;
    color: transparent;
    -webkit-text-stroke: 2px #fafafa;
    user-select: none;
    pointer-events: none;
  }
  .qmark--open  { align-self: flex-start; margin-bottom: -0.16em; }
  .qmark--close { align-self: flex-end;   margin-top: -0.10em; }

  .quote-body {
    width: 393px;
    max-width: 100%;
    margin: 0;
    font-size: clamp(18px, 1.85vw, 32px);
    font-weight: 700;
    line-height: 1.04;
    letter-spacing: 0.96px;
    color: #fafafa;
    text-align: right;
    white-space: pre-wrap;
  }

  /* ── Volunteer info (role + location) ───────────────────────────── */
  .vol-info {
    margin: 40px 0 0 74px;
    width: 640px;
    max-width: calc(100vw - 96px);
  }
  .info-role {
    margin: 0 0 8px;
    font-size: 36px;
    font-weight: 500;
    line-height: 1.0;
    letter-spacing: 1.44px;
    color: var(--color-content-accent, #bdff5d);
  }
  .info-location {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.45;
    letter-spacing: 1px;
    white-space: pre-wrap;
    color: #fafafa;
  }

  /* ── Coverflow carousel ─────────────────────────────────────────── */
  .carousel {
    position: relative;
    margin: 54px auto 0;
    width: 100%;
    height: min(70vh, 760px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .car-stage {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 100%;
  }

  /* Each slide is positioned by its circular offset from the active photo:
     0 = centre (sharp), ±1 = flanking (blurred, scaled down), |off|>1 hidden.
     GPU transforms + eased transitions give the cinematic coverflow glide. */
  .slide {
    position: absolute;
    left: 50%;
    top: 50%;
    transform:
      translate3d(-50%, -50%, 0)
      translate3d(calc(var(--off) * 56%), 0, 0)
      scale(0.74);
    filter: blur(7px) brightness(0.62);
    opacity: 0.5;
    transition:
      transform 0.62s cubic-bezier(0.16, 1, 0.3, 1),
      filter    0.62s ease,
      opacity   0.62s ease;
    will-change: transform, filter, opacity;
  }
  .slide--active {
    transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1);
    filter: blur(0px) brightness(1);
    opacity: 1;
  }
  .slide--far { opacity: 0 !important; pointer-events: none; }

  /* Frame matches the image's own ratio → landscape photos show fully
     (no crop, no letterbox), portraits stay tall. */
  .slide-img {
    display: block;
    max-height: min(70vh, 760px);
    max-width: min(46vw, 640px);
    width: auto;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
    user-select: none;
    -webkit-user-drag: none;
  }
  /* Circular lime-outline nav arrows — anchored to the carousel's own vertical
     centre (absolute, not fixed) so they flank the photo and scroll with it
     instead of floating over the page. Spacing-11 from the edges (Figma). */
  .car-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 30;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-content-accent, #bdff5d);
    border-radius: 999px;
    background: rgba(14, 14, 14, 0.35);
    color: var(--color-content-accent, #bdff5d);
    cursor: pointer;
    padding: 0;
    backdrop-filter: blur(2px);
    transition:
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.3s ease,
      box-shadow 0.3s ease;
  }
  .car-arrow--prev { left:  var(--spacing-11, 72px); }
  .car-arrow--next { right: var(--spacing-11, 72px); }
  .car-arrow:hover {
    background: rgba(189, 255, 93, 0.12);
    box-shadow: 0 0 20px rgba(189, 255, 93, 0.25);
    transform: translateY(-50%) scale(1.08);
  }
  .car-arrow:active { transform: translateY(-50%) scale(0.94); transition-duration: 80ms; }

  /* ── Q&A accordion (Figma 6251-4989) ────────────────────────────── */
  .qa-wrap {
    width: min(1059px, calc(100vw - 144px));
    margin: 72px var(--spacing-11, 72px) 0 auto;
    display: flex;
    flex-direction: column;
  }
  .qa-item { display: flex; flex-direction: column; }

  /* Title: 36px Forma DJR Display Medium, tracking 1.44px. WHITE by default. */
  .qa-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 14px 0;
    border: 0;
    background: transparent;
    color: #fafafa;              /* Color/Link/Default — white in default */
    font-size: 36px;
    font-weight: 500;
    line-height: 1.0;
    text-transform: uppercase;
    letter-spacing: 1.44px;
    cursor: pointer;
    text-align: left;
    transition: color 0.18s ease;
  }
  .qa-row:hover,
  .qa-row--open { color: var(--color-content-accent, #bdff5d); }
  .qa-row:hover + .qa-sep:not(.qa-sep--open) { background: var(--color-content-accent, #bdff5d); }

  .qa-title { flex: 1; min-width: 0; word-break: break-word; }

  /* + icon → rotates to × when open. */
  .qa-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.18s ease, transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .qa-icon svg { width: 100%; height: 100%; }
  .qa-row:hover .qa-icon { opacity: 1; }
  .qa-icon--open { opacity: 1; transform: rotate(45deg); }

  /* Separator: 2.417px white → lime; open = lime answer card. */
  .qa-sep {
    height: 2.417px;
    background: #fafafa;
    flex-shrink: 0;
    overflow: hidden;
    transition: background 200ms ease;
  }
  .qa-sep--open { height: auto; background: var(--color-content-accent, #bdff5d); }

  .qa-answer { padding: 36px 44px 40px; }
  .qa-answer p {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: 0.96px;
    color: #0e0e0e;
    white-space: pre-wrap;
  }

  /* ── Focus states ───────────────────────────────────────────────── */
  .qa-row:focus-visible,
  .car-arrow:focus-visible,
  .back-btn:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 3px;
    border-radius: 4px;
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .vol-quote { right: var(--spacing-5, 24px); top: 4px; width: 300px; }
    .qmark { font-size: 56px; }
    .quote-body { font-size: clamp(14px, 2.4vw, 24px); }
    .vol-info { margin-left: 24px; }
    .qa-wrap { width: calc(100vw - 48px); margin: 56px 24px 0; }
    .qa-row { font-size: 26px; }
    .slide-img { max-width: 60vw; }
    .slide { transform: translate3d(-50%, -50%, 0) translate3d(calc(var(--off) * 62%), 0, 0) scale(0.7); }
    .car-arrow--prev { left: var(--spacing-5, 24px); }
    .car-arrow--next { right: var(--spacing-5, 24px); }
  }

  @media (max-width: 700px) {
    .profile { padding-top: calc(var(--navbar-height, 125px) + 8px); }
    .back-btn { margin-left: 16px; }
    .name-surname  { padding-left: 16px; font-size: clamp(44px, 13vw, 80px); }
    .name-firstname { padding-left: 40px; font-size: clamp(44px, 13vw, 80px); }
    .head { min-height: 0; }
    .vol-quote {
      position: relative;
      right: auto; top: auto;
      width: 100%;
      max-width: 100%;
      margin: 24px 0 0;
      padding: 0.6em 16px;
    }
    .qmark--open  { left: 8px; }
    .qmark--close { right: 8px; }
    .quote-body { width: 100%; font-size: 18px; }
    .vol-info { margin: 24px 16px 0; }
    .info-role { font-size: 26px; }
    .carousel { height: 54vh; margin-top: 32px; }
    .slide-img { max-width: 82vw; max-height: 54vh; }
    /* On phones the flanking photos would crowd the centre — show one at a time. */
    .slide:not(.slide--active) { opacity: 0 !important; }
    .car-arrow { width: 44px; height: 44px; }
    .car-arrow--prev { left: 16px; }
    .car-arrow--next { right: 16px; }
    .qa-wrap { width: calc(100vw - 32px); margin: 44px 16px 0; }
    .qa-row { font-size: 18px; letter-spacing: 1px; padding: 12px 0; }
    .qa-icon { width: 28px; height: 28px; }
    .qa-answer { padding: 20px 18px 24px; }
    .qa-answer p { font-size: 16px; }
  }

  /* ── Touch targets ──────────────────────────────────────────────── */
  @media (pointer: coarse) {
    .qa-row { min-height: max(48px, calc(44px / var(--page-zoom, 1))); }
    .car-arrow {
      min-width:  max(48px, calc(44px / var(--page-zoom, 1)));
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .slide, .qa-sep, .qa-icon, .car-arrow { transition: none; }
  }
</style>
