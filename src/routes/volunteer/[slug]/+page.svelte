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
    'LA MIA GIORNATA (QUASI) NORMALE.',
    'COME MI VEDEVANO GLI ALTRI.',
    'IL MIO MOMENTO PREFERITO.',
    'QUELLO CHE PREFERIREI DIMENTICARE.',
    'COSA MI PORTO A CASA.',
    'QUELLO CHE (NON) MI AVETE CHIESTO.',
    'LA MIA RISPOSTA ONESTA.'
  ];

  let slug: string | null = null;
  let volunteer = $state<VolunteerImage | null>(null);
  let volunteerImages: VolunteerImage[] = [];
  let activePhotoIndex = 0;
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

  function handleKeydown(e: KeyboardEvent) {
    if (!hasPhotos()) return;
    if (e.key === 'ArrowLeft') previousPhoto();
    if (e.key === 'ArrowRight') nextPhoto();
  }

  const unsub = page.subscribe(($page) => {
    selectVolunteerBySlug($page.params.slug ?? null);
  });

  onDestroy(() => unsub());

  let firstName = $state('');
  let lastName = $state('');
  $effect(() => {
    [firstName, lastName] = splitDisplayName(volunteer?.name ?? 'Aquila Muraca Francesca');
  });
</script>

<svelte:head>
  <title>Volunteer — {volunteer?.name ?? 'Aquila Muraca Francesca'}</title>
</svelte:head>
<svelte:window on:keydown={handleKeydown} />

<main class="volunteer-page">
  <section class="hero">
    <div class="hero-title" aria-label={volunteer?.name ?? 'Aquila Muraca Francesca'}>
      <p class="hero-title__solid">{firstName.toUpperCase()}</p>
      <p class="hero-title__outline">{lastName.toUpperCase()}</p>
    </div>

    <div class="hero-meta">
      <p class="hero-name">{volunteer?.name ?? `${firstName} ${lastName}`}</p>
      <p>{volunteer?.city ?? 'Bormio'} {volunteer?.region ? `- ${volunteer.region}` : '- STELVIO SKI CENTER'}</p>
      <p>{volunteer?.role ?? 'EVENT SERVICES VOLUNTEER'}</p>
      <p>{volunteer?.age ? `${volunteer.age} ANNI` : '— ANNI'}, {volunteer?.region ?? 'LOMBARDIA'}</p>
    </div>

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
      </div>
    {:else}
      <div class="hero-no-photo">
        <div class="no-photo-art" aria-hidden="true">
          <svg width="320" height="320" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
            <defs>
              <radialGradient id="g" cx="50%" cy="40%">
                <stop offset="0%" stop-color="#2b2b2b" />
                <stop offset="100%" stop-color="#111" />
              </radialGradient>
            </defs>
            <rect width="320" height="320" rx="20" fill="url(#g)" />
            <g transform="translate(40,34)" fill="#bdff5d" fill-opacity="0.08">
              <circle cx="40" cy="40" r="6" />
              <circle cx="80" cy="20" r="4" />
              <circle cx="120" cy="60" r="5" />
              <circle cx="60" cy="100" r="3" />
            </g>
            <g transform="translate(110,80)" fill="#bdff5d">
              <circle cx="50" cy="40" r="40" fill-opacity="0.12" />
              <circle cx="50" cy="30" r="18" />
            </g>
          </svg>
        </div>

        <div class="hero-meta hero-meta--no-photo">
          <p>{volunteer?.city ?? 'Bormio'} - {volunteer?.region ?? 'Stelvio'}</p>
          <p>{volunteer?.role ?? 'Event Services Volunteer'}</p>
          <p>{volunteer?.age ?? '—'} ANNI, {volunteer?.region ?? 'Lombardia'}</p>
        </div>
      </div>
    {/if}
  </section>

  <section class="questions" aria-label="Volunteer questions">
    <div class="questions-bg" aria-hidden="true" class:visible={openIndex !== -1}></div>

    {#each questionTitles as title, index}
      <button
        type="button"
        class:is-active={index === openIndex}
        class="question-row"
        onclick={() => openIndex = index === openIndex ? -1 : index}
      >
        <span>{title}</span>
      </button>

      {#if index === openIndex}
        <div class="question-panel">
          <button type="button" class="question-panel__close" aria-label="Close section" onclick={() => openIndex = -1}>×</button>
          <div class="question-panel__content">
            <p>{volunteer?.responses?.[index] ?? 'Risposta non disponibile. Questa è una descrizione di esempio che sostituisce la risposta del volontario.'}</p>
          </div>
        </div>
      {/if}
    {/each}
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
    transform: translateX(-50%);
    width: min(1210px, calc(100vw - 80px));
    margin: 0;
    display: flex;
    align-items: baseline;
    justify-content: center;
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
    white-space: nowrap;
    font-weight: 800;
    text-transform: uppercase;
  }

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

  .hero-name {
    font-size: clamp(22px, 2.4vw, 28px);
    font-weight: 700;
    color: #bdff5d;
    margin-bottom: 8px;
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

  .questions {
    position: relative;
  }

  .questions-bg {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 263px;
    background: var(--color-content-title);
    z-index: 0;
    opacity: 0;
    transition: opacity 200ms ease;
  }

  .questions-bg.visible {
    opacity: 1;
  }

  .question-row {
    width: 100%;
    min-height: 86px;
    display: flex;
    align-items: center;
    padding: 0 28px;
    border: 0;
    border-top: 1px solid rgba(250, 250, 250, 0.35);
    background: transparent;
    color: #fafafa;
    text-align: left;
    font-size: 48px;
    line-height: 42px;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 180ms ease, background 180ms ease;
  }

  .question-row span {
    display: block;
    width: 100%;
  }

  .question-panel {
    position: relative;
    width: 100%;
    background: #bdff5d;
    border-top: 1px solid rgba(0, 0, 0, 0.45);
    padding: 22px 28px;
    color: #111;
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    line-height: 1.4;
    transition: max-height 260ms ease, padding 220ms ease, opacity 200ms ease;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
  }

  .question-row.is-active + .question-panel {
    max-height: 600px;
    opacity: 1;
    background: #bdff5d;
    color: #111;
    padding: 22px 32px;
    border-top: 0;
    box-shadow: 0 -6px 18px rgba(0,0,0,0.28);
    transform-origin: top center;
  }

  .question-panel__close {
    position: absolute;
    top: 8px;
    right: 12px;
    border: 0;
    background: transparent;
    color: #1a1a1a;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }

  .hero-no-photo {
    width: min(953px, calc(100vw - 120px));
    margin: 44px auto 0;
    display: flex;
    align-items: center;
    gap: 36px;
    justify-content: center;
  }

  .no-photo-art {
    width: 320px;
    height: 320px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    overflow: hidden;
    background: linear-gradient(180deg, #111 0%, #0b0b0b 100%);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  }

  .hero-meta--no-photo {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #fafafa;
    font-size: 20px;
    line-height: 1.05;
    text-transform: uppercase;
    width: min(360px, calc(100% - 340px));
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
</style>
