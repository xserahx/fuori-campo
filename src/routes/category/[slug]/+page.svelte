<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import '$lib/styles/tokens.css';

  type CategoryInfo = {
    label: string;
    image: string;
    tag:   string;
    slug:  string;
  };

  const CATEGORIES: CategoryInfo[] = [
    { label: 'RELAZIONI E COMUNICAZIONE',             image: '/figma/cat-1.jpg', tag: 'relazioni',    slug: 'relazioni'    },
    { label: 'CERIMONIE E REVENUE',                   image: '/figma/cat-5.jpg', tag: 'cerimonie',    slug: 'cerimonie'    },
    { label: 'SPORT E DISCIPLINE',                    image: '/figma/cat-8.jpg', tag: 'sport',         slug: 'sport'         },
    { label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: '/figma/cat-1.jpg', tag: 'organizzativa', slug: 'organizzativa' },
    { label: 'LOGISTICA E TERRITORIO',                image: '/figma/cat-5.jpg', tag: 'logistica',     slug: 'logistica'     },
    { label: 'GESTIONE OPERATIVA E FAN EXPERIENCE',   image: '/figma/cat-8.jpg', tag: 'gestione',      slug: 'gestione'      },
  ];

  function legacySlugify(label: string) {
    return label.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  function splitTitle(label: string): string[] {
    const match = label.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (match) return [match[1].trim(), `E ${match[2].trim()}`];
    const words = label.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return [label];
    const mid = Math.max(1, Math.ceil(words.length / 2));
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const slug = $derived((page.params as Record<string, string>).slug ?? '');
  const catIdx = $derived(CATEGORIES.findIndex(c => c.slug === slug || legacySlugify(c.label) === slug));
  const cat    = $derived(catIdx >= 0 ? CATEGORIES[catIdx] : null);
  const lines  = $derived(cat ? splitTitle(cat.label) : []);

  const prevCat = $derived(catIdx >= 0 ? CATEGORIES[(catIdx - 1 + CATEGORIES.length) % CATEGORIES.length] : null);
  const nextCat = $derived(catIdx >= 0 ? CATEGORIES[(catIdx + 1) % CATEGORIES.length] : null);

  const categorySummaries: Record<string, { eyebrow: string; subtitle: string; details: string[] }> = {
    relazioni: {
      eyebrow: 'COM = Communication',
      subtitle: 'Sanno già cosa risponderti prima ancora che tu finisca la domanda.',
      details: [
        'Gestisce l\'immagine pubblica dei Giochi, i rapporti con i media locali',
        'e la creazione di contenuti per i canali ufficiali di Milano Cortina 2026.',
        'Communication Volunteer'
      ]
    },
    cerimonie: {
      eyebrow: 'CER = Cerimonie',
      subtitle: 'Ogni gesto pesa, ogni passaggio arriva al momento giusto.',
      details: [
        'Coordina momenti solenni, protocolli e premiazioni con precisione',
        'e ritmo scenico durante gli eventi.',
        'Ceremonies Volunteer'
      ]
    },
    sport: {
      eyebrow: 'SPT = Sport',
      subtitle: 'Tiene il passo delle competizioni, senza perdere il controllo.',
      details: [
        'Supporta le competizioni sul campo e la gestione dei flussi',
        'nelle aree gara.',
        'Sport Volunteer'
      ]
    },
    organizzativa: {
      eyebrow: 'ORG = Organizzazione',
      subtitle: 'Dietro le quinte, tutto si incastra e continua a muoversi.',
      details: [
        'Tiene insieme turni, spazi e servizi generali',
        'così che la macchina dei Giochi resti fluida e affidabile.',
        'Operations Volunteer'
      ]
    },
    logistica: {
      eyebrow: 'LOG = Logistica',
      subtitle: 'Fa arrivare le cose e le persone esattamente dove devono stare.',
      details: [
        'Gestisce spostamenti, materiali e territorio',
        'assicurando che ogni supporto arrivi al posto giusto al momento giusto.',
        'Logistics Volunteer'
      ]
    },
    gestione: {
      eyebrow: 'FEX = Fan Experience',
      subtitle: 'Trasforma l\'arrivo del pubblico in un\'esperienza chiara e memorabile.',
      details: [
        'Lavora sui servizi al pubblico e sull\'accoglienza',
        'per trasformare l\'esperienza dei fan in qualcosa di memorabile.',
        'Fan Experience Volunteer'
      ]
    }
  };

  const activeSummary = $derived(categorySummaries[cat?.tag ?? ''] ?? {
    eyebrow: cat ? `${cat.label.split(' ')[0]} = Category` : 'CATEGORY',
    subtitle: 'Un ruolo che connette persone, spazi e contenuti.',
    details: [
      'Lavora in modo coordinato tra persone, spazi e contenuti',
      'per supportare il funzionamento dell\'evento.',
      'Volunteer'
    ]
  });

  const dotCount = 5;
</script>

<svelte:head>
  <title>{cat?.label ?? 'Categoria'} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <main class="category-page">
    <div class="category-shell">
      <button class="back-button" type="button" aria-label="Indietro" onclick={() => goto('/category')}>
        <span class="back-arrow" aria-hidden="true">←</span>
        <span>INDIETRO</span>
      </button>

      <section class="hero" aria-labelledby="category-title">
        <div class="hero-title" id="category-title">
          {#each lines as line, i}
            {#if i === 0}
              <span class="title-fill">{line}</span>
            {:else}
              <span class="title-outline">{line}</span>
            {/if}
          {/each}
        </div>

        <p class="hero-copy">{activeSummary.subtitle}</p>
      </section>

      <section class="summary-card" aria-label="Categoria e sottocategoria">
        <div class="summary-top">
          <div class="summary-meta">
            <p class="summary-eyebrow">{activeSummary.eyebrow}</p>
            <div class="summary-nav" aria-label="Navigazione categorie">
              {#if prevCat}
                <button class="nav-arrow" type="button" aria-label="Categoria precedente" onclick={() => goto(`/category/${prevCat.slug}`)}>
                  ‹
                </button>
              {/if}
              {#if nextCat}
                <button class="nav-arrow" type="button" aria-label="Categoria successiva" onclick={() => goto(`/category/${nextCat.slug}`)}>
                  ›
                </button>
              {/if}
            </div>
          </div>

          <div class="summary-copy">
            {#each activeSummary.details as detail, index}
              <p class:summary-footer={index === activeSummary.details.length - 1}>{detail}</p>
            {/each}
          </div>
        </div>

        <div class="summary-dots" aria-hidden="true">
          {#each Array(dotCount) as _, index}
            <span class="dot" class:dot--active={index === 0}></span>
          {/each}
        </div>
      </section>
    </div>
  </main>
{:else}
  <div class="not-found">Categoria non trovata</div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: var(--color-background-primary);
  }

  :global(html) {
    background: var(--color-background-primary);
  }

  .category-page {
    min-height: 100dvh;
    background: #0e0e0e;
    color: #fafafa;
    overflow: hidden;
  }

  .category-shell {
    position: relative;
    min-height: 100dvh;
    padding: 12px 0 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .back-button {
    width: fit-content;
    margin-left: 43px;
    margin-top: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 13px 5px 10px;
    border: 2px solid #baff44;
    border-radius: 999px;
    background: transparent;
    color: #fafafa;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
  }

  .back-arrow {
    font-size: 18px;
    line-height: 1;
    transform: translateY(-1px);
  }

  .hero {
    width: min(100%, 1728px);
    margin: 0 auto;
    padding: 26px 0 0;
    display: flex;
    flex-direction: column;
  }

  .hero-title {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 72px;
    transform: translateY(-4px);
  }

  .title-fill,
  .title-outline {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(56px, 8vw, 116px);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    line-height: 0.86;
    white-space: nowrap;
  }

  .title-fill {
    color: #baff44;
    margin-left: 0;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) #baff44;
    margin-left: clamp(72px, 20vw, 340px);
    margin-top: -8px;
  }

  .hero-copy {
    margin: 0;
    width: min(1318px, calc(100% - 72px));
    margin-left: auto;
    margin-top: 44px;
    padding: 0 72px 0 0;
    text-align: right;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(34px, 4.9vw, 84px);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: -0.03em;
    color: #fafafa;
  }

  .summary-card {
    width: min(100%, 1728px);
    margin: 0 auto;
    padding: 0 72px 0 72px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .summary-top {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(780px, 100%);
  }

  .summary-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .summary-eyebrow {
    margin: 0;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.03em;
    color: #baff44;
  }

  .summary-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-arrow {
    width: 39px;
    height: 39px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #fafafa;
    font-size: 34px;
    line-height: 1;
    cursor: pointer;
  }

  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    max-width: 780px;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    line-height: 26px;
    color: #fafafa;
  }

  .summary-copy p {
    margin: 0;
  }

  .summary-footer {
    margin-top: 0;
    font-size: 24px;
    line-height: 26px;
    color: rgba(250, 250, 250, 0.96);
  }

  .summary-dots {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 0;
  }

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(186, 255, 68, 0.15);
  }

  .dot--active {
    background: #baff44;
  }

  .not-found {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: 24px;
    color: rgba(250, 250, 250, 0.38);
  }

  @media (max-width: 1100px) {
    .category-shell {
      padding-top: 16px;
    }

      padding: 34px 0 0;

    .hero {
      grid-template-columns: 1fr;
      padding: 40px 24px 0;
      width: auto;
      padding: 0 24px;
      margin-left: 0;
      margin-top: 24px;
      max-width: 100%;
    .hero-copy {
      justify-self: start;
      text-align: left;
      padding-top: 0;
      max-width: 100%;
    }

      padding: 0 24px 0;
      margin-left: clamp(44px, 19vw, 220px);

    .summary-eyebrow {
      font-size: 24px;
    }

    .summary-copy,
    .summary-footer {
      font-size: 20px;
      line-height: 24px;
    }

    .dot {
      width: 14px;
      height: 14px;
    }
    }

    .summary-card {
      padding: 0 24px 0;
    }
  }

  @media (max-width: 700px) {
    .back-button {
      margin-left: 16px;
    }

    .hero {
      padding: 28px 0 0;
    }

    .title-fill,
    .title-outline {
      white-space: normal;
    }

    .hero-copy {
      font-size: 26px;
      line-height: 1.02;
    }

    .summary-top {
      width: 100%;
    }

    .summary-card {
      padding: 0 16px 0;
    }

    .summary-eyebrow {
      font-size: 20px;
    }

    .summary-copy,
    .summary-footer {
      font-size: 16px;
      line-height: 20px;
    }

    .dot {
      width: 12px;
      height: 12px;
    }
  }
</style>
