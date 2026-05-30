<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import '$lib/styles/tokens.css';

  const DOT_DEFAULT = 'https://www.figma.com/api/mcp/asset/606ddbd4-d9de-491d-9c57-da9f6aaf06d2';
  const DOT_SELECTED = 'https://www.figma.com/api/mcp/asset/a1d0bb60-3e1f-4bd0-85f5-81a39a3cb364';

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

  type SubRole = {
    title: string;
    description: string;
    role: string;
  };

  const categorySummaries: Record<string, { eyebrow: string; subtitle: string; roles: SubRole[] }> = {
    relazioni: {
      eyebrow: 'COM = Communication',
      subtitle: 'Sanno già cosa risponderti prima ancora che tu finisca la domanda.',
      roles: [
        {
          title: 'PRS = Press',
          description: 'Gestisce i rapporti con la stampa e la diffusione delle informazioni ufficiali, supportando comunicati, accrediti e richieste media.',
          role: 'Press Volunteer'
        },
        {
          title: 'INT = Interactions / Protocol',
          description: 'Gestisce l\'accoglienza della "Olympic Family" (membri CIO, autorità e VIP), occupandosi di cerimoniale e standard di ospitalità di alto livello.',
          role: 'Interaction / Protocol Volunteer'
        },
        {
          title: 'LAN = Language Services',
          description: 'Supporta la comunicazione multilingua tra staff, ospiti e delegazioni, facilitando traduzioni, mediazione e comprensione reciproca.',
          role: 'Language Services Volunteer'
        },
        {
          title: 'NCS = NOC Service (Comitati Olimpici Nazionali)',
          description: 'Il punto di contatto unico per i Comitati Olimpici Nazionali; li assiste in ogni necessità logistica o burocratica durante la loro permanenza.',
          role: 'NOC Assistant'
        }
      ]
    },
    cerimonie: {
      eyebrow: 'CER = Cerimonie',
      subtitle: 'Ogni gesto pesa, ogni passaggio arriva al momento giusto.',
      roles: [
        {
          title: 'CER = Cerimonie',
          description: 'Coordina momenti solenni, protocolli e premiazioni con precisione e ritmo scenico durante le cerimonie ufficiali di apertura, chiusura e medaglie.',
          role: 'Ceremonies Volunteer'
        },
        {
          title: 'REV = Revenue',
          description: 'Supporta le attività commerciali e di partnership durante i Giochi, garantendo un\'esperienza premium agli ospiti degli sponsor ufficiali.',
          role: 'Revenue Volunteer'
        },
        {
          title: 'HOS = Hospitality',
          description: 'Gestisce l\'accoglienza degli ospiti istituzionali e degli sponsor nelle aree riservate, curando ogni dettaglio dell\'esperienza VIP.',
          role: 'Hospitality Volunteer'
        }
      ]
    },
    sport: {
      eyebrow: 'SPT = Sport',
      subtitle: 'Tiene il passo delle competizioni, senza perdere il controllo.',
      roles: [
        {
          title: 'SPT = Sport',
          description: 'Supporta le competizioni sul campo e la gestione dei flussi nelle aree gara, lavorando a diretto contatto con atleti e staff tecnico.',
          role: 'Sport Volunteer'
        },
        {
          title: 'MED = Medical',
          description: 'Garantisce il presidio sanitario nelle aree di gara e di allenamento, coordinandosi con i servizi medici ufficiali per interventi rapidi ed efficaci.',
          role: 'Medical Volunteer'
        },
        {
          title: 'TEC = Technology',
          description: 'Gestisce la strumentazione tecnica di campo, i sistemi di cronometria e il supporto digitale alle discipline sportive durante le competizioni.',
          role: 'Technology Volunteer'
        }
      ]
    },
    organizzativa: {
      eyebrow: 'ORG = Organizzazione',
      subtitle: 'Dietro le quinte, tutto si incastra e continua a muoversi.',
      roles: [
        {
          title: 'ORG = Organizzazione',
          description: 'Tiene insieme turni, spazi e servizi generali così che la macchina dei Giochi resti fluida e affidabile in ogni momento.',
          role: 'Operations Volunteer'
        },
        {
          title: 'ADM = Administration',
          description: 'Si occupa delle pratiche burocratiche, della gestione documentale e del supporto amministrativo agli uffici operativi dei Giochi.',
          role: 'Administration Volunteer'
        },
        {
          title: 'SER = General Services',
          description: 'Garantisce la qualità e la continuità dei servizi di supporto offerti a staff, atleti e pubblico nelle venue e nelle aree di servizio.',
          role: 'General Services Volunteer'
        }
      ]
    },
    logistica: {
      eyebrow: 'LOG = Logistica',
      subtitle: 'Fa arrivare le cose e le persone esattamente dove devono stare.',
      roles: [
        {
          title: 'LOG = Logistica',
          description: 'Gestisce spostamenti, materiali e territorio, assicurando che ogni supporto arrivi al posto giusto al momento giusto.',
          role: 'Logistics Volunteer'
        },
        {
          title: 'TRA = Transport',
          description: 'Coordina il trasporto di atleti, delegazioni, staff e materiali tra le sedi di gara, i villaggi olimpici e gli hub logistici.',
          role: 'Transport Volunteer'
        },
        {
          title: 'TER = Territory',
          description: 'Presidia le aree esterne alle venue e il territorio circostante, garantendo segnaletica, orientamento e supporto ai visitatori sul campo.',
          role: 'Territory Volunteer'
        }
      ]
    },
    gestione: {
      eyebrow: 'FEX = Fan Experience',
      subtitle: 'Trasforma l\'arrivo del pubblico in un\'esperienza chiara e memorabile.',
      roles: [
        {
          title: 'FEX = Fan Experience',
          description: 'Lavora sui servizi al pubblico e sull\'accoglienza per trasformare l\'esperienza dei fan in qualcosa di memorabile, dal primo accesso all\'ultima nota.',
          role: 'Fan Experience Volunteer'
        },
        {
          title: 'OPS = Operations',
          description: 'Garantisce la continuità operativa delle venue coordinando staffing, flussi interni e la risposta tempestiva a ogni esigenza durante gli eventi.',
          role: 'Operations Volunteer'
        },
        {
          title: 'ACC = Accreditation',
          description: 'Gestisce i sistemi di accreditamento e il controllo accessi per atleti, media e ospiti, assicurando sicurezza e fluidità agli ingressi.',
          role: 'Accreditation Volunteer'
        }
      ]
    }
  };

  const activeSummary = $derived(categorySummaries[cat?.tag ?? ''] ?? {
    eyebrow: cat ? `${cat.label.split(' ')[0]} = Category` : 'CATEGORY',
    subtitle: 'Un ruolo che connette persone, spazi e contenuti.',
    roles: [
      {
        title: cat?.label ?? 'CATEGORY',
        description: 'Lavora in modo coordinato tra persone, spazi e contenuti per supportare il funzionamento dell\'evento.',
        role: 'Volunteer'
      }
    ]
  });

  let activeRoleIndex = $state(0);

  $effect(() => {
    activeRoleIndex = 0;
    cat?.tag;
  });

  const activeRole = $derived(activeSummary.roles[Math.min(activeRoleIndex, activeSummary.roles.length - 1)]);
  const roleCount = $derived(activeSummary.roles.length);
</script>

<svelte:head>
  <title>{cat?.label ?? 'Categoria'} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <main class="category-page" class:category-sport={cat?.slug === 'sport'}>
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
            <p class="summary-eyebrow">{activeRole.title}</p>
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
            <p>{activeRole.description}</p>
            <p class="summary-footer">{activeRole.role}</p>
          </div>
        </div>

        <div class="summary-dots" aria-label="Sub-roles">
          {#each activeSummary.roles as _, index}
            <button
              type="button"
              class="dot"
              class:dot--active={index === activeRoleIndex}
              aria-label={`Mostra sub-ruolo ${index + 1}`}
              aria-pressed={index === activeRoleIndex}
              onclick={() => { activeRoleIndex = index; }}
            >
              <img
                alt=""
                src={index === activeRoleIndex ? DOT_SELECTED : DOT_DEFAULT}
                width="16"
                height="16"
                draggable="false"
              />
            </button>
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
    min-height: calc(100dvh - var(--navbar-height));
    padding: 0 0 var(--spacing-7);
    display: flex;
    flex-direction: column;
  }

  .back-button {
    width: fit-content;
    margin-left: var(--spacing-11);
    margin-top: 36px;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: 12px var(--spacing-4);
    border: 2px solid var(--color-content-accent);
    border-radius: var(--radius-rounded-pill);
    background: transparent;
    color: var(--color-content-body);
    font-family: var(--font-display);
    font-size: var(--unit-24);
    font-weight: 500;
    line-height: 26px;
    cursor: pointer;
  }

  .back-arrow {
    font-size: 20px;
    line-height: 1;
    transform: translateY(-1px);
  }

  .hero {
    width: min(100%, 1728px);
    margin: 0 auto;
    margin-top: var(--spacing-7);
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .hero-title {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 20px var(--spacing-11);
  }

  .title-fill,
  .title-outline {
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(56px, 8vw, 116px);
    font-weight: 800;
    text-transform: uppercase;
    /* Figma h1: letterSpacing: 0, leading-[unit/116] = 1:1 with font size */
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
  }

  .title-fill {
    color: var(--color-content-accent);
    margin-left: 0;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) var(--color-content-accent);
    margin-left: clamp(0px, 18vw, 268px);
    margin-top: -8px;
  }

  /* SPORT title: shorter first word needs larger relative stagger */
  .category-sport .title-outline {
    margin-left: clamp(0px, 24.5vw, 268px);
  }

  .hero-copy {
    margin: 0;
    width: min(1318px, calc(100% - var(--spacing-18) - var(--spacing-11)));
    margin-left: auto;
    margin-top: var(--unit-56);
    padding: 0 var(--spacing-11) 0 0;
    text-align: right;
    font-family: 'Forma DJR Display', sans-serif;
    font-size: clamp(34px, 4.9vw, 84px);
    font-weight: 500;
    line-height: var(--spacing-12);
    letter-spacing: -0.03em;
    color: var(--color-content-body);
  }

  .summary-card {
    width: min(100%, 1728px);
    margin: auto auto 0;
    padding: 0 var(--spacing-11) 0 var(--spacing-11);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
  }

  .summary-top {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    width: min(780px, 100%);
  }

  .summary-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
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
    font-size: var(--unit-24);
    line-height: 26px;
    color: #fafafa;
  }

  .summary-copy p {
    margin: 0;
  }

  .summary-copy p:first-child {
    white-space: pre-wrap;
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
    appearance: none;
    border: 0;
    width: 16px;
    height: 16px;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  .dot img {
    display: block;
    width: 16px;
    height: 16px;
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
    .hero {
      padding: 0 24px;
      width: auto;
    }

    .hero-copy {
      justify-self: start;
      text-align: left;
      padding: 0;
      max-width: 100%;
      width: auto;
      margin-left: 0;
      margin-top: var(--unit-40);
    }

    .hero-title {
      padding: 20px 24px;
      max-width: 100%;
    }

    .title-outline {
      /* container now 24px, outline at ~220px total: 220-24=196px */
      margin-left: clamp(0px, 17vw, 196px);
    }

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

    .summary-card {
      padding: 0 var(--spacing-5);
    }
  }

  @media (max-width: 700px) {
    .back-button {
      margin-left: var(--spacing-5);
      margin-top: var(--spacing-5);
    }

    .hero {
      padding: 0;
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
      padding: 0 var(--spacing-4);
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
