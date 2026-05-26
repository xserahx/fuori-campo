<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import { imagesRaw, slugify } from '$lib/data/gallery';
  import type { GalleryImage } from '$lib/data/gallery';

  type VolunteerImage = GalleryImage & {
    city?: string;
    region?: string;
    role?: string;
    age?: number;
    responses?: string[];
  };

  const fallbackHero = 'https://www.figma.com/api/mcp/asset/a593d582-cfd0-47a0-ad9c-c058031c20d7';
  const questionTitles = [
    'COME MI VEDEVANO GLI ALTRI.',
    'IL MIO MOMENTO PREFERITO.',
    'QUELLO CHE VORREI DIMENTICARE.',
    'COSA MI PORTO A CASA.',
    'COSA (NON) MI AVETE CHIESTO.',
    'LA MIA RISPOSTA ONESTA.'
  ];

  let slug: string | null = null;
  let volunteer = $state<VolunteerImage | null>(null);
  let volunteerImages = $state<VolunteerImage[]>([]);
  let activePhotoIndex = 0;
  let activeMode = $state<'info' | 'foto'>('info');
  let openIndex = $state(0);

  function splitDisplayName(name: string | undefined) {
    const fallback = ['Aquila Muraca', 'Francesca'];

    if (!name) return fallback;

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 1) return [parts[0] ?? fallback[0], ''];

    return [parts.slice(0, -1).join(' '), parts.at(-1) ?? ''];
  }

  function selectVolunteerBySlug(nextSlug: string | null) {
    slug = nextSlug;
    volunteer = slug
      ? imagesRaw.find((img, index) => slugify(img.name, index) === slug) ?? null
      : null;

    volunteerImages = volunteer
      ? imagesRaw.filter((img, index) => slugify(img.name, index) === slug)
      : [];

    activePhotoIndex = 0;
    activeMode = 'info';
    openIndex = 0;
  }

  function currentHeroImage() {
    return volunteerImages[activePhotoIndex]?.src ?? volunteer?.src ?? fallbackHero;
  }

  function hasPhotos() {
    return volunteerImages.length > 0 || (volunteer?.src && volunteer.src !== fallbackHero);
  }

  function previousPhoto() {
    if (!volunteerImages.length) return;

    activePhotoIndex = (activePhotoIndex - 1 + volunteerImages.length) % volunteerImages.length;
  }

  function nextPhoto() {
    if (!volunteerImages.length) return;

    activePhotoIndex = (activePhotoIndex + 1) % volunteerImages.length;
  }

  const unsub = page.subscribe(($page) => {
    selectVolunteerBySlug($page.params.slug ?? null);
  });

  onDestroy(() => unsub());

  let firstName = $state('');
  let lastName = $state('');
  let hoveredQuestion = $state<number>(-1);
  let hoveredThumbnail = $state<number>(-1);
  $effect(() => {
    [firstName, lastName] = splitDisplayName(volunteer?.name ?? 'Aquila Muraca Francesca');
  });
</script>

<svelte:head>
  <title>Volunteer — {volunteer?.name ?? 'Aquila Muraca Francesca'}</title>
</svelte:head>

<main class="volunteer-page">
  <section class="hero">
    <button class="back-button" type="button" onclick={() => history.back()} aria-label="Go back">
      <span class="back-button__icon" aria-hidden="true">←</span>
      <span>BACK</span>
    </button>

    <div class="hero-title" aria-label={volunteer?.name ?? 'Aquila Muraca Francesca'}>
      <p class="hero-title__solid">{firstName.toUpperCase()}</p>
      <p class="hero-title__outline">{lastName.toUpperCase()}</p>
    </div>

    {#if activeMode === 'info'}
      <div class="info-grid">
          <div class="hero-meta">
            <p class="hero-meta__role">{volunteer?.role ?? 'EVENT SERVICES VOLUNTEER'}</p>
            <p>{volunteer?.city ?? 'BORMIO'}{volunteer?.region ? ` - ${volunteer.region.toUpperCase()}` : ' - STELVIO SKI CENTER'}</p>
            <p>{volunteer?.region ? `${volunteer.region}, ${volunteer.age ?? 59} anni` : 'Lombardia, 59 anni'}</p>
          </div>

          <div class="questions-list" aria-label="Volunteer questions">
            {#each questionTitles as title, i}
              <button
                type="button"
                class="question-row"
                class:is-open={openIndex === i}
                class:muted={openIndex !== -1 && openIndex !== i}
                onmouseenter={() => (hoveredQuestion = i)}
                onmouseleave={() => (hoveredQuestion = -1)}
                onfocus={() => (hoveredQuestion = i)}
                onblur={() => (hoveredQuestion = -1)}
                onclick={() => (openIndex = openIndex === i ? -1 : i)}
                aria-expanded={openIndex === i}
              >
                <span>{title}</span>
                <span class="toggle-icon" aria-hidden="true">{openIndex === i ? '−' : '+'}</span>
              </button>
            {/each}
          </div>

          {#if openIndex !== -1}
            {@const response = volunteer?.responses?.[openIndex] ?? 'NESSUNA RISPOSTA DISPONIBILE.'}
            <div class="expanded-answer" role="region" aria-live="polite">
              <div class="expanded-inner">
                <p>{response}</p>
              </div>
            </div>
          {/if}
      </div>
    {:else}
      {#if hasPhotos()}
        <div class="hero-media">
          <button class="hero-arrow hero-arrow--left" type="button" aria-label="Previous photo" onclick={previousPhoto}>
            <span aria-hidden="true">‹</span>
          </button>

          <div class="hero-image-shell">
            <img src={currentHeroImage()} alt={volunteer?.name ?? 'Volunteer photo'} class="hero-image" />
          </div>

          <button class="hero-arrow hero-arrow--right" type="button" aria-label="Next photo" onclick={nextPhoto}>
            <span aria-hidden="true">›</span>
          </button>
          <div class="hero-thumbs">
            {#each volunteerImages as img, idx}
              <button
                class="thumb"
                type="button"
                onmouseenter={() => (hoveredThumbnail = idx)}
                onmouseleave={() => (hoveredThumbnail = -1)}
                onclick={() => (activePhotoIndex = idx)}
                aria-label={`Show photo ${idx + 1}`}
              >
                <img src={img.src} alt={img.name ?? 'thumb'} />
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="hero-no-photo" aria-hidden="true">
          <div class="hero-no-photo__art"></div>
        </div>
      {/if}
    {/if}

    <div class="mode-toggle" aria-label="View toggle">
      <button
        type="button"
        class="mode-toggle__info"
        class:is-active={activeMode === 'info'}
        aria-pressed={activeMode === 'info'}
        onclick={() => (activeMode = 'info')}
      >
        INFO
      </button>
      <button
        type="button"
        class="mode-toggle__foto"
        class:is-active={activeMode === 'foto'}
        aria-pressed={activeMode === 'foto'}
        onclick={() => (activeMode = 'foto')}
      >
        FOTO
      </button>
    </div>
  </section>
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    min-height: 100%;
    background: #1a1a1a;
    color: #fafafa;
  }

  :global(body) {
    overflow-x: hidden;
  }

  :global(*) {
    box-sizing: border-box;
    font-family: 'Forma DJR Display', sans-serif;
  }

  .volunteer-page {
    min-height: 100vh;
    background: #1a1a1a;
    padding-bottom: 48px;
  }

  .hero {
    position: relative;
    min-height: 960px;
    padding-top: 205px;
  }

  .hero-title {
    position: absolute;
    left: 50%;
    top: 205px;
    transform: translateX(-20%);
    width: min(1210px, calc(100vw - 80px));
    margin: 0;
    display: flex;
    align-items: baseline;
    justify-content: left;
    gap: 10px;
    text-transform: uppercase;
    pointer-events: none;
  }

  .hero-title p {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--figma-title-size, 90px);
    line-height: var(--figma-title-lineheight, 100px);
    letter-spacing: -0.02em;
    align-items: baseline;
    justify-content: left;
    white-space: nowrap;
    font-weight: 800;
    text-transform: uppercase;
  }

  /* question list & expanded answer */
  .questions-list { display:flex; flex-direction:column; gap:10px; }

  .question-row { text-align:left; padding:14px 20px; border:0; background:transparent; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:48px; line-height:1; letter-spacing:-0.02em; }
  .question-row:hover, .question-row:focus { color:var(--gallery-accent,#bdff5d); transform:translateX(6px); }
  .question-row.is-open { color:var(--gallery-accent,#bdff5d); transform:translateX(6px); }
  .question-row.muted { filter: blur(2px) opacity(0.45); transform:none; pointer-events: none; }

  .toggle-icon { color:var(--gallery-accent,#bdff5d); font-size:32px; line-height:1; min-width:36px; text-align:right; }

  .expanded-answer {
    position: absolute;
    right: 40px;
    top: 559px;
    background: var(--gallery-accent, #bdff5d);
    color: #0a0a0a;
    padding: 26px;
    border-radius: 6px;
    box-shadow: 0 2px 0 rgba(0,0,0,0.08);
    max-width: min(760px, calc(100% - 420px));
    z-index: 3;
  }
  .expanded-inner p { margin: 0; font-size: 18px; line-height: 1.45; font-weight: 400; }

  .hero-thumbs { display:flex; gap:10px; margin-left: 12px; align-items:center; }
  .hero-thumbs .thumb { width:80px; height:56px; border:0; padding:0; background:transparent; cursor:pointer; }
  .hero-thumbs img { width:100%; height:100%; object-fit:cover; display:block; filter:grayscale(100%) contrast(0.9); }
  .hero-thumbs .thumb:hover img, .hero-thumbs .thumb:focus img { filter:none; }

  .hero-title__solid {
    color: var(--color-content-title);
    font-weight: 800;
  }

  .hero-title__outline {
    color: transparent;
    -webkit-text-stroke: 4px var(--color-content-title);
    font-weight: 800;
  }

  .hero-meta {
    position: absolute;
    left: 40px;
    top: 303px;
    display: flex;
    flex-direction: column;
    gap: 0;
    color: #fafafa;
    font-size: 20px;
    line-height: 1.05;
    letter-spacing: 0;
    text-transform: uppercase;
    z-index: 2;
  }

  .hero-meta p {
    margin: 0;
  }

  .hero-meta__role {
    color: var(--gallery-accent, #bdff5d);
    font-weight: 600;
  }

  .hero-media {
    position: relative;
    width: 953px;
    margin: 44px auto 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
  }

  .hero-image-shell {
    width: 953px;
    height: 508px;
    overflow: hidden;
    box-shadow: 0 0 7px rgba(0, 0, 0, 0.25);
    background: #111;
  }

  .hero-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .hero-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 41px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: #bdff5d;
    font-size: 56px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    z-index: 3;
  }

  .hero-arrow--left {
    left: -64px;
  }

  .hero-arrow--right {
    right: -64px;
  }

  @media (max-width: 1100px) {
    .hero {
      min-height: 860px;
      padding-top: 180px;
    }

    .hero-title {
      width: calc(100vw - 40px);
      justify-content: center;
      gap: 8px;
    }

    .hero-meta {
      left: 20px;
      top: 280px;
      font-size: 16px;
    }

    .hero-media {
      width: calc(100vw - 80px);
      margin-top: 48px;
      gap: 0;
    }

    .hero-no-photo {
      width: calc(100vw - 80px);
      margin-top: 28px;
      gap: 20px;
      flex-direction: column;
      align-items: flex-start;
    }

    .hero-arrow--left {
      left: -48px;
    }

    .hero-arrow--right {
      right: -48px;
    }

    .question-row {
      padding-left: 20px;
      padding-right: 20px;
      min-height: 78px;
    }
  }

  @media (max-width: 760px) {
    .hero {
      min-height: auto;
      padding-top: 140px;
    }

    .hero-title {
      flex-direction: column;
      align-items: center;
      gap: 0;
      text-align: center;
    }

    .hero-meta {
      position: static;
      margin: 24px 20px 0;
    }

    .hero-media {
      width: calc(100vw - 32px);
      margin-top: 24px;
    }

    .hero-arrow--left {
      left: -6px;
    }

    .hero-arrow--right {
      right: -6px;
    }

    .question-row {
      font-size: 22px;
      min-height: 72px;
    }
  }

  .volunteer-page {
    min-height: 100dvh;
    background: #111;
    padding-bottom: 32px;
  }

  .hero {
    min-height: 100dvh;
    padding: 20px 0 32px;
  }

  .back-button {
    position: absolute;
    top: 20px;
    left: 38px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 31px;
    padding: 0 14px 0 12px;
    border: 1px solid #bdff5d;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.95);
    color: #fafafa;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
    z-index: 2;
  }

  .back-button__icon {
    font-size: 18px;
    line-height: 1;
    color: #fafafa;
  }

  .hero-title {
    position: absolute;
    top: 58px;
    left: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    text-transform: uppercase;
    pointer-events: none;
    z-index: 1;
  }

  .hero-title p {
    margin: 0;
    font-family: var(--font-display);
    font-size: 116px;
    line-height: 1;
    letter-spacing: -0.02em;
    white-space: nowrap;
    font-weight: 800;
    text-transform: uppercase;
  }

  .hero-title__solid {
    color: #bdff5d;
  }

  .hero-title__outline {
    color: transparent;
    -webkit-text-stroke: 3px #bdff5d;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 34px;
    align-items: start;
    margin-top: 559px;
    padding: 0 40px;
  }

  .hero-meta {
    display: flex;
    flex-direction: column;
    gap: 0;
    color: #fafafa;
    font-size: 24px;
    align-items: center;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .hero-meta p {
    margin: 0;
  }

  .hero-meta__role {
    color: #bdff5d;
    margin-bottom: 4px;
  }

  .questions-list {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .question-row {
    width: 100%;
    min-height: 64px;
    display: flex;
    align-items: center;
    padding: 0 0 8px;
    border: 0;
    border-bottom: 4px solid rgba(250, 250, 250, 0.92);
    background: transparent;
    color: #fafafa;
    text-align: left;
    font-size: 64px;
    line-height: 64px;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .question-row span {
    display: block;
    width: 100%;
  }

  .hero-media {
    width: min(953px, calc(100vw - 120px));
    margin: 180px auto 0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-image-shell {
    width: 953px;
    height: 508px;
    overflow: hidden;
    background: #111;
    box-shadow: 0 0 7px rgba(0, 0, 0, 0.25);
  }

  .hero-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .hero-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 41px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: #bdff5d;
    font-size: 56px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    z-index: 3;
  }

  .hero-arrow--left {
    left: -64px;
  }

  .hero-arrow--right {
    right: -64px;
  }

  .hero-no-photo {
    width: min(953px, calc(100vw - 120px));
    margin: 180px auto 0;
    height: 508px;
    background: #0d0d0d;
  }

  .hero-no-photo__art {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(189, 255, 93, 0.06);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.15));
  }

  .mode-toggle {
    position: fixed;
    left: 36px;
    bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 4;
  }

  .mode-toggle button {
    border: 0;
    padding: 0;
    background: transparent;
    color: #fafafa;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
  }

  .mode-toggle__info {
    min-width: 31px;
    height: 15px;
    padding: 0 6px;
    border-radius: 999px;
    background: #bdff5d;
    color: #111;
  }

  .mode-toggle__foto {
    color: #fafafa;
  }

  @media (max-width: 1100px) {
    .hero-title {
      left: 24px;
      top: 46px;
    }

    .hero-title p {
      font-size: 92px;
    }

    .info-grid {
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 24px;
      margin-top: 250px;
      padding: 0 24px;
    }

    .hero-meta,
    .question-row {
      font-size: 24px;
    }

    .hero-media,
    .hero-no-photo {
      width: calc(100vw - 48px);
      margin-top: 140px;
    }

    .hero-arrow--left {
      left: -48px;
    }

    .hero-arrow--right {
      right: -48px;
    }
  }

  @media (max-width: 760px) {
    .hero {
      min-height: auto;
    }

    .hero-title {
      position: static;
      padding: 56px 20px 0;
    }

    .hero-title p {
      font-size: 52px;
      white-space: normal;
    }

    .info-grid {
      grid-template-columns: 1fr;
      margin-top: 28px;
      padding: 0 20px;
    }

    .hero-meta {
      font-size: 18px;
    }

    .question-row {
      font-size: 22px;
      min-height: 36px;
    }

    .mode-toggle {
      left: 20px;
      bottom: 16px;
    }

    .hero-media,
    .hero-no-photo {
      width: calc(100vw - 40px);
      margin-top: 24px;
      height: auto;
    }

    .hero-image-shell {
      width: 100%;
      height: auto;
      aspect-ratio: 953 / 508;
    }
  }
</style>
