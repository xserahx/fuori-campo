<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { fade } from 'svelte/transition';
  import ArrowButton from '$lib/components/buttons/ArrowButton.svelte';
  import BackButton from '$lib/components/buttons/BackButton.svelte';
  import '$lib/styles/tokens.css';

  type CategoryInfo = {
    label: string;
    image: string;
    tag:   string;
    slug:  string;
  };

  const CATEGORIES: CategoryInfo[] = [
    { label: 'RELAZIONI E COMUNICAZIONE',             image: '/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.png',              tag: 'relazioni',    slug: 'relazioni'    },
    { label: 'CERIMONIE E REVENUE',                   image: '/volunteer_images/carosello_categorie/Cerimonia_e_revenue.png',                    tag: 'cerimonie',    slug: 'cerimonie'    },
    { label: 'SPORT E DISCIPLINE',                    image: '/volunteer_images/carosello_categorie/Sport.png',                                  tag: 'sport',        slug: 'sport'        },
    { label: 'AREA ORGANIZZATIVA E SERVIZI GENERALI', image: '/volunteer_images/carosello_categorie/Area_organizzativa.png',                     tag: 'organizzativa', slug: 'organizzativa' },
    { label: 'LOGISTICA E TERRITORIO',                image: '/volunteer_images/carosello_categorie/Logistica_e_territorio.png',                 tag: 'logistica',    slug: 'logistica'    },
    { label: 'GESTIONE OPERATIVA E FAN EXPERIENCE',   image: '/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.png',    tag: 'gestione',     slug: 'gestione'     },
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

  type SubRole = {
    title: string;
    description: string;
    role: string;
  };

  const categorySummaries: Record<string, { eyebrow: string; subtitle: string; roles: SubRole[] }> = {
    relazioni: {
      eyebrow: 'COM = Communication',
      subtitle: 'Punto di contatto con i giornalisti, Comitati Olimpici e delegazioni, pronti a guidare la comunicazione e permettere a la corretta diffusione delle notizie con la stampa.',
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
      subtitle: 'Hanno condiviso le medaglie e il palco con gli atleti, permettendo loro di splendere nel giorno più bello delle loro vite, non dimenticandosi mai di dare spazio agli ospiti speciali e gli sponsor ufficiali.',
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
          title: 'RTC = Rate Card',
          description: 'Gestisce il catalogo degli ospiti istituzionali e degli sponsor nelle aree riservate, curando ogni dettaglio dell\'esperienza VIP.Gestisce il catalogo di servizi e attrezzature extra che i partner e i media possono noleggiare per le loro operazioni specifiche durante i Giochi.',
          role: 'Rate Card Volunteer'
        },
        {
          title: 'IKL = I-Knowledge',
          description: 'Si occupa del monitoraggio e della raccolta dati per il programma di "Legacy" e trasferimento della conoscenza richiesto dal CIO.',
          role: 'I-Knowledge Volunteer'
        }
      ]
    },
    sport: {
      eyebrow: 'SPT = Sport',
      subtitle: 'Addetti ad ognuno dei 51 sport specifici, dal Palazzo del Ghiaccio a Santa Giulia fino alle vette Valtellinesi, a stretto contatto con atleti e pubblico, per far si che ogni competizione non avesse intoppi.',
      roles: [
        {
          title: 'XALP = Alpine Skiing',
          description: 'Lo sci alpino, che comprende le prove di velocità (Discesa e Super-G) e quelle tecniche (Slalom e Gigante) su pista battuta.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer'
        },
        {
          title: 'XBOB = Bobsleigh',
          description: 'Il bob, disciplina di discesa su pista ghiacciata con equipaggi da due o quattro componenti.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer'
        },
        {
          title: 'XBTH = Biathlon',
          description: 'Sport che combina lo sci di fondo (resistenza) con il tiro a segno con carabina (precisione) in diverse sessioni.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer'
        },
        {
          title: 'XCSS = Cross-Country',
          description: 'Lo sci di fondo.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer'
        },
        {
          title: 'XCUR = Curling',
          description: 'Sport di strategia su ghiaccio dove si fanno scivolare pesanti pietre di granito verso un bersaglio (house).',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Sport Information Volunteer, Sport Liaison Volunteer'
        },
        {
          title: 'XFRS = Freestyle Skiing',
          description: 'Sci acrobatico che include specialità come Moguls, Aerials, Halfpipe, Slopestyle e lo Ski Cross.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer'
        },
        {
          title: 'XFSK = Figure Skating',
          description: 'Il pattinaggio di figura, dove singoli, coppie o gruppi eseguono elementi tecnici e coreografici su musica.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, FOP Operations Volunteer, Sport Information Volunteer, Sport Liaison Volunteer'
        },
        {
          title: 'XIHO = Ice Hockey',
          description: 'Torneo di hockey su ghiaccio, sport di squadra ad alta velocità giocato in tre tempi da 20 minuti.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Sport Information Volunteer, Sport Liaison Volunteer'
        },
        {
          title: 'XSJP = Ski Jumping',
          description: 'Il salto con gli sci dai trampolini (Normal Hill e Large Hill), valutato per distanza e stile del volo.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Hill Support Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer'
        },
         {
          title: 'XSMT = Ski Mountaineering',
          description: 'Lo sci alpinismo. Debutta nel 2026 e prevede salite con pelli di foca, tratti a piedi e discese fuori pista.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer'
        },
         {
          title: 'XSSK = Speed Skating',
          description: 'Pattinaggio di velocità su pista lunga (400m), dove gli atleti competono contro il tempo in corsie separate.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer'
        },
        {
          title: 'XSTK = Short Track Speed Skating',
          description: 'Pattinaggio di velocità su pista corta (111m), caratterizzato da partenze in linea e sorpassi spettacolari.',
          role: 'Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, FOP Operations Volunteer, Sport Information Volunteer, Sport Liaison Volunteer'
        }
      ]
    },
    organizzativa: {
      eyebrow: 'ORG = Organizzazione',
      subtitle: 'Hanno permesso la corretta organizzazione e gestione dei volontari e dell’infrastruttura tecnologica dei giochi, dal distribuire gli accrediti, ai buoni pasto fino al corretto funzionamento del WIFI.',
      roles: [
        {
          title: 'PEM = People Management',
          description: 'Si occupa della strategia delle risorse umane "intangibile": pianificazione dei turni, gestione dei check-in/out dei volontari presso i centri dedicati, coordinamento della formazione e attività di riconoscimento/rewarding.',
          role: 'Workforce Village Volunteer, Athlete 365 Volunteer, Mind Zone Volunteer, Olympic Club Volunteer, Workforce Volunteer '
        },
        {
          title: 'ACR = Accreditations',
          description: 'Gestisce l\'intero ciclo di vita dell\'accreditamento. Questo include la verifica delle identità, il rilascio dei pass e la gestione degli UAC (Uniform and Accreditation Centres), dove avviene fisicamente la consegna del kit ufficiale (divisa Salomon) a volontari e staff.',
          role: 'Accreditation Volunteer, Uniform Volunteer '
        },
        {
          title: 'TEC = Technology',
          description: 'Assicura il funzionamento di tutta l\'infrastruttura IT: dai sistemi di cronometraggio e punteggio (Timing & Scoring) alla connettività Wi-Fi e al supporto tecnico nei siti (Venue Technology).',
          role: 'Results Volunteer, Timing Volunteer, Venue Technology Volunteer'
        }
      ]
    },
    logistica: {
      eyebrow: 'LOG = Logistica',
      subtitle: 'A servizio della flotta dei veicoli, per permettere agli atleti e alla famiglia olimpica di orientarsi tra le vie di Milano e le stradine delle Valli e gli Aeroporti.',
      roles: [
        {
          title: 'AND = Arrivals & Departures',
          description: 'Opera nei "Port of Entry" (aeroporti di Malpensa, Linate, Venezia e stazioni ferroviarie). Accoglie le delegazioni e coordina il flusso verso le destinazioni finali.',
          role: 'Arrivals & Departures Volunteer'
        },
        {
          title: 'LOG = Logistics',
          description: 'Responsabile della pianificazione, stoccaggio e distribuzione di materiali pesanti, arredi e attrezzature sportive tra i vari cluster (Milano, Valtellina, Cortina, Val di Fiemme e Anterselva).',
          role: 'Logistics Volunteer'
        },
        {
          title: 'TRA = Transport',
          description: 'Gestisce il sistema di navette e la flotta di veicoli ufficiali per garantire spostamenti puntuali e sicuri a tutti gli stakeholder accreditati.',
          role: 'Transport Volunteer'
        },
        {
          title: 'VIL = Village',
          description: 'Gestisce le operazioni nei Villaggi Olimpici e Paralimpici, assicurando i servizi residenziali e l\'accoglienza quotidiana per gli atleti.',
          role: 'Village Volunteer'
        }
      ]
    },
    gestione: {
      eyebrow: 'FEX = Fan Experience',
      subtitle: 'Coloro con cui sicuramente hai parlato o hai sentito negli stadi, hanno fatto sì che non ti annoiassi mai e ti hanno indicato l’entrata, ma non solo hanno permesso pure che tutto fosse sempre coordinato.',
      roles: [
        {
          title: 'EVM = Event Management',
          description: 'Coordinamento operativo della Venue. È l\'area che fa da "collante" tra tutte le altre FA per assicurare che il sito di gara funzioni secondo i piani.',
          role: 'Event Management Volunteer'
        },
        {
          title: 'EVS = Event Services',
          description: 'Gestisce l\'esperienza e la sicurezza dello spettatore all\'interno del sito di gara. Si occupa della gestione dei flussi (code e ingressi), del controllo dei titoli di accesso, dell\'assistenza alle persone con disabilità e delle procedure di primo intervento o smarrimento oggetti.',
          role: 'Event Services Volunteer'
        },
        {
          title: 'SPP = Sport Presentation',
          description: 'Gestisce lo spettacolo "live" negli stadi: annunci dello speaker, musica, contenuti sui maxischermi e coordinamento dei momenti di intrattenimento per il pubblico.',
          role: 'Sport Presentation Volunteer'
        },
        {
          title: 'SPS = Spectator Services',
          description: 'Gestisce l\'esperienza dello spettatore dal momento in cui entra nel perimetro olimpico: orientamento, assistenza, gestione delle code e dei flussi alle tribune.',
          role: 'Spectator Services Volunteer'
        },
        {
          title: 'DOP = Doping Control',
          description: 'Fornisce supporto logistico ai medici antidoping. Il ruolo principale è quello di Chaperone: notificare agli atleti il controllo e scortarli fino alla stazione medica ufficiale.',
          role: 'Doping Control Volunteer'
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

  /* ── Vertical scrolling policy ──────────────────────────────────────
     Scrolling is enabled ONLY on desktop devices whose SCREEN is smaller
     than the 16-inch reference (1728×1117). The screen — not the viewport
     — is the reference: a 16-inch laptop reports screen.height === 1117,
     but its browser viewport is always shorter (tabs/chrome/dock), so a
     viewport media query would wrongly flag it as compact. Touch devices
     (phones/tablets) report `pointer: coarse` and never scroll here. */
  const REFERENCE_HEIGHT = 1117; // 16-inch reference (1728×1117)
  let scrollEnabled = $state(false);

  $effect(() => {
    if (!browser) return;

    const evaluate = () => {
      const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const belowReference = window.screen.height < REFERENCE_HEIGHT;
      scrollEnabled = isDesktop && belowReference;
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  });

  $effect(() => {
    if (!browser) return;

    const root = document.documentElement;
    root.classList.toggle('category-scrollable', scrollEnabled);
    root.classList.toggle('category-noscroll', !scrollEnabled);

    return () => {
      root.classList.remove('category-scrollable', 'category-noscroll');
    };
  });
</script>

<svelte:head>
  <title>{cat?.label ?? 'Categoria'} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <main class="category-page" id="main-content" class:category-sport={cat?.slug === 'sport'}>
    <div class="category-shell">
      <div class="back-btn-wrapper">
        <BackButton onclick={() => history.back()} ariaLabel="Indietro" />
      </div>

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
        <div class="summary-top-wrap">
          {#key activeRoleIndex}
            <div class="summary-top" in:fade={{ duration: 300, delay: 120 }} out:fade={{ duration: 180 }}>
              <div class="summary-meta">
                <p class="summary-eyebrow">{activeRole.title}</p>
              </div>

              <div class="summary-copy">
                <p>{activeRole.description}</p>
                <p class="summary-footer">{activeRole.role}</p>
              </div>
            </div>
          {/key}
        </div>

        <div class="dot-frecce">
          <div class="dot-nav" aria-label="Sub-roles">
            {#each Array.from({ length: roleCount }) as _, index}
              <button
                type="button"
                class="dot"
                class:dot--active={index === activeRoleIndex}
                aria-label={`Mostra sub-ruolo ${index + 1}`}
                aria-pressed={index === activeRoleIndex}
                onclick={() => { activeRoleIndex = index; }}
              ></button>
            {/each}
          </div>

          <div class="frecce" aria-label="Navigazione sotto-ruoli">
            <ArrowButton direction="left"  ariaLabel="Sotto-ruolo precedente" onclick={() => { activeRoleIndex = (activeRoleIndex - 1 + roleCount) % roleCount; }} />
            <ArrowButton direction="right" ariaLabel="Sotto-ruolo successivo" onclick={() => { activeRoleIndex = (activeRoleIndex + 1) % roleCount; }} />
          </div>
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
    background: var(--color-background-primary);
    color: var(--color-content-body);
    overflow-x: hidden;
  }

  .category-shell {
    position: relative;
    min-height: calc(100dvh - var(--navbar-height));
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .back-btn-wrapper {
    margin-left: var(--spacing-11);
    margin-top: var(--spacing-5);
  }

  .hero {
    width: min(100%, 1728px);
    margin: 0 auto;
    margin-top: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .hero-title {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    padding: 20px 0;
  }

  .title-fill,
  .title-outline {
    font-family: var(--font-display);
    font-size: clamp(var(--unit-56), calc(var(--unit-116) / max(var(--page-zoom, 1), 0.65)), var(--unit-200));
    font-weight: 800;
    text-transform: uppercase;
    /* Figma h1: letterSpacing: 0, leading-[unit/116] = 1:1 with font size */
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
  }

  .title-fill {
    color: var(--color-content-accent);
    margin-left: var(--spacing-11);
    margin-bottom: -8px;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    margin-left: var(--spacing-17);
    margin-top: 0;
  }

  /* SPORT title: shorter first word needs larger relative stagger */
  .category-sport .title-outline {
    margin-left: clamp(0px, 24.5vw, 268px);
  }

  .hero-copy {
    margin: var(--unit-56) var(--spacing-11) 0 auto;
    padding: 0;
    width: 1318px;
    max-width: calc(100% - var(--spacing-11) - var(--spacing-4));
    text-align: right;
    font-family: var(--font-display);
    font-size: clamp(34px, calc(var(--unit-84) / max(var(--page-zoom, 1), 0.65)), 45px);
    font-weight: 500;
    line-height: 0.952;
    letter-spacing: 0;
    white-space: pre-line;
    color: var(--color-content-body);
  }

  .summary-card {
    position: static;
    width: auto;
    margin-top: auto;
    padding: 0 0 var(--spacing-7) var(--spacing-11);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .summary-top-wrap {
    position: relative;
    width: min(780px, 100%);
    /* holds height during cross-fade so dot-frecce doesn't jump */
    display: grid;
  }

  .summary-top-wrap > :global(*) {
    grid-area: 1 / 1;
  }

  .summary-top {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    width: 100%;
  }

  .summary-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .summary-eyebrow {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--unit-32);
    font-weight: 700;
    line-height: var(--unit-32);
    letter-spacing: 0.96px;
    color: var(--color-content-accent, #bdff5d);
  }

  .dot-frecce {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: min(780px, 100%);
  }

  .dot-nav {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-2);
  }

  .dot {
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    width: var(--unit-16);
    height: var(--unit-16);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dot::before {
    content: '';
    display: block;
    width: var(--unit-16);
    height: var(--unit-16);
    border-radius: 50%;
    background: rgba(189, 255, 93, 0.3);
    transition:
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .dot:hover::before {
    background: rgba(189, 255, 93, 0.6);
  }

  .dot.dot--active::before {
    background: var(--color-content-accent);
  }

  .frecce {
    display: flex;
    align-items: center;
    gap: var(--unit-20);
  }

  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    max-width: 780px;
    font-family: var(--font-display);
    font-size: var(--unit-24);
    line-height: 26px;
    color: var(--color-content-body);
  }

  .summary-copy p {
    margin: 0;
  }

  .summary-copy p:first-child {
    white-space: pre-wrap;
  }

  .summary-footer {
    margin-top: 0;
    font-size: var(--unit-24);
    line-height: 26px;
    font-style: italic;
    color: rgba(250, 250, 250, 0.96);
  }

  .not-found {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    font-family: var(--font-display);
    font-size: 24px;
    color: rgba(250, 250, 250, 0.38);
  }

  @media (max-width: 1100px) {
    .hero {
      padding: 0 var(--spacing-5);
      width: auto;
    }

    .hero-copy {
      justify-self: start;
      text-align: right;
      padding: 0;
      max-width: 100%;
      width: auto;
      margin-left: 0;
      margin-top: var(--unit-40);
      margin-right: var(--spacing-5);
      font-size: clamp(30px, 7vw, var(--unit-56));
      line-height: 0.98;
    }

    .hero-title {
      padding: var(--spacing-4-2) var(--spacing-5);
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

    .arrow-circle {
      width: var(--unit-48);
      height: var(--unit-48);
    }

    .summary-card {
      padding: 0 0 var(--spacing-5) var(--spacing-5);
    }

    .summary-top,
    .summary-meta,
    .summary-copy {
      width: 100%;
      max-width: 100%;
    }

    .summary-eyebrow {
      font-size: clamp(var(--unit-24), 4.4vw, var(--unit-32));
      line-height: 1;
      letter-spacing: 0.02em;
    }

    .summary-copy,
    .summary-footer {
      font-size: clamp(18px, 2.8vw, var(--unit-24));
      line-height: 1.15;
    }
  }

  @media (max-width: 700px) {
    .back-btn-wrapper {
      margin-left: var(--spacing-5);
      margin-top: var(--spacing-5);
    }

    .hero {
      padding: 0;
    }

    .title-fill,
    .title-outline {
      white-space: normal;
      font-size: 43px;
      line-height: var(--unit-36);
    }

    .title-fill {
      margin-left: 0;
      margin-bottom: 0;
    }

    .title-outline {
      -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
      margin-left: 0;
      margin-top: 0;
    }

    .hero-copy {
      font-size: 26px;
      line-height: 1.02;
    }

    .summary-top {
      width: 100%;
    }

    .summary-card {
      padding: 0 0 var(--spacing-4) var(--spacing-4);
    }

    .summary-eyebrow {
      font-size: var(--unit-20);
    }

    .summary-copy,
    .summary-footer {
      font-size: var(--unit-16);
      line-height: var(--unit-20);
    }
  }

  /* ── Touch target compensation ──────────────────────────────────── */
  @media (pointer: coarse) {
    .dot {
      min-width:  max(var(--unit-16), calc(44px / var(--page-zoom, 1)));
      min-height: max(var(--unit-16), calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Focus visible ──────────────────────────────────────────────── */

  .dot:focus-visible {
    outline: var(--stroke-1) solid var(--color-content-accent);
    outline-offset: 4px;
    border-radius: 50%;
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .dot::before {
      transition: none;
    }
  }

  /* ── Vertical scrolling policy (class set from JS — see <script>) ────
     `.category-scrollable` → desktop with a screen smaller than the
     16-inch reference (1728×1117): allow the page to scroll.
     `.category-noscroll`   → every other case (16-inch+ desktops and all
     touch devices): scrolling stays disabled. The class lives on <html>
     and is removed when leaving the page, so other routes are untouched. */
  :global(html.category-scrollable),
  :global(html.category-scrollable body) {
    overflow-y: auto;
  }

  :global(html.category-scrollable) .category-page {
    overflow-y: auto;
  }

  :global(html.category-scrollable) .category-shell {
    height: auto;
  }

  :global(html.category-noscroll),
  :global(html.category-noscroll body) {
    overflow-y: hidden;
  }
</style>
