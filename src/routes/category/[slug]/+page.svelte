<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import '$lib/styles/tokens.css';

  const BACK_ICON = 'https://www.figma.com/api/mcp/asset/b6c50607-8d2b-4867-bea0-12bc527e0378';

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
      subtitle: 'Erano lì alle 6 di mattina per provare una cosa che durava 40 secondi. L\'hanno rifatta 12 volte. Non si sa mai. ',
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
      subtitle: 'Conoscono il regolamento di sport che non sapevano esistessero\nfino a sei mesi fa.',
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
      subtitle: 'Nessuno sa esattamente cosa fanno, ma quando mancano si sente.',
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
      subtitle: 'Hanno spostato quella cosa lì, poi di là, poi di nuovo lì. Alla fine era nel posto giusto dall\'inizio.',
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
      subtitle: 'Hanno risposto alla stessa domanda 400 volte in un giorno con il sorriso.\nAlmeno le prime 380.',
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
</script>

<svelte:head>
  <title>{cat?.label ?? 'Categoria'} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <main class="category-page" id="main-content" class:category-sport={cat?.slug === 'sport'}>
    <div class="category-shell">
      <button class="back-button" type="button" aria-label="Indietro" onclick={() => goto('/category')}>
        <img class="back-icon" src={BACK_ICON} alt="" width="18" height="10" draggable="false" />
        <span class="back-label">INDIETRO</span>
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
            <button class="arrow-circle" type="button" aria-label="Sotto-ruolo precedente" onclick={() => { activeRoleIndex = (activeRoleIndex - 1 + roleCount) % roleCount; }}>
              <svg width="14" height="28" viewBox="0 0 14 28" fill="none" aria-hidden="true">
                <path d="M12 2L2 14L12 26" stroke="#BDFF5D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="arrow-circle" type="button" aria-label="Sotto-ruolo successivo" onclick={() => { activeRoleIndex = (activeRoleIndex + 1) % roleCount; }}>
              <svg width="14" height="28" viewBox="0 0 14 28" fill="none" aria-hidden="true">
                <path d="M2 2L12 14L2 26" stroke="#BDFF5D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
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

  .back-button {
    width: 168px;
    height: 48px;
    margin-left: var(--spacing-11);
    margin-top: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-3);
    padding: 12px 20px;
    border: 2px solid var(--color-content-accent);
    border-radius: var(--unit-999);
    background: transparent;
    color: var(--color-content-body);
    font-family: var(--font-display);
    font-size: var(--unit-24);
    font-weight: 500;
    line-height: 26px;
    cursor: pointer;
  }

  .back-icon {
    width: 18px;
    height: 10px;
    display: block;
    flex: 0 0 auto;
  }

  .back-label {
    display: block;
    width: 98px;
    text-align: left;
    line-height: 26px;
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
    font-size: clamp(56px, calc(116px / max(var(--page-zoom, 1), 0.65)), 200px);
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
    -webkit-text-stroke: clamp(1px, 0.14vw, 2px) var(--color-content-accent);
    margin-left: 340px;
    margin-top: 0;
  }

  /* SPORT title: shorter first word needs larger relative stagger */
  .category-sport .title-outline {
    margin-left: clamp(0px, 24.5vw, 268px);
  }

  .hero-copy {
    margin: 56px var(--spacing-11) 0 auto;
    padding: 0;
    width: 1318px;
    max-width: calc(100% - var(--spacing-11) - 16px);
    text-align: right;
    font-family: var(--font-display);
    font-size: clamp(34px, calc(84px / max(var(--page-zoom, 1), 0.65)), 145px);
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
    gap: 16px;
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
    font-size: 32px;
    font-weight: 700;
    line-height: 32px;
    letter-spacing: 0.96px;
    color: var(--color-content-accent, #bdff5d);
  }

  .dot-frecce {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: min(665px, 100%);
  }

  .dot-nav {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .dot {
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dot::before {
    content: '';
    display: block;
    width: 16px;
    height: 16px;
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
    background: #bdff5d;
    box-shadow: 0 0 10px rgba(189, 255, 93, 0.55);
  }

  .frecce {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .arrow-circle {
    width: 60px;
    height: 60px;
    border-radius: 999px;
    border: 2px solid #bdff5d;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition:
      background  300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow  300ms ease,
      transform   280ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .arrow-circle:hover {
    background: rgba(189, 255, 93, 0.08);
    box-shadow: 0 0 20px rgba(189, 255, 93, 0.22);
    transform: scale(1.07);
  }

  .arrow-circle:active {
    transform: scale(0.94);
    transition-duration: 80ms;
  }

  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    max-width: 780px;
    font-family: var(--font-display);
    font-size: 24px;
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
    font-size: 24px;
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
      margin-right: var(--spacing-5);
      font-size: clamp(30px, 7vw, 56px);
      line-height: 0.98;
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

    .arrow-circle {
      width: 48px;
      height: 48px;
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
      font-size: clamp(24px, 4.4vw, 32px);
      line-height: 1;
      letter-spacing: 0.02em;
    }

    .summary-copy,
    .summary-footer {
      font-size: clamp(18px, 2.8vw, 24px);
      line-height: 1.15;
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

    .title-outline {
      margin-left: 0;
      margin-top: -2px;
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
      font-size: 20px;
    }

    .summary-copy,
    .summary-footer {
      font-size: 16px;
      line-height: 20px;
    }

    .arrow-circle {
      width: 40px;
      height: 40px;
    }

    .arrow-circle svg {
      width: 10px;
      height: 20px;
    }
  }

  /* ── Touch target compensation ──────────────────────────────────── */
  @media (pointer: coarse) {
    .dot {
      min-width:  max(16px, calc(44px / var(--page-zoom, 1)));
      min-height: max(16px, calc(44px / var(--page-zoom, 1)));
    }
    .arrow-circle {
      min-width:  max(60px, calc(44px / var(--page-zoom, 1)));
      min-height: max(60px, calc(44px / var(--page-zoom, 1)));
    }
    .back-button {
      min-height: max(48px, calc(44px / var(--page-zoom, 1)));
    }
  }

  /* ── Focus visible ──────────────────────────────────────────────── */
  .back-button:focus-visible,
  .arrow-circle:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 3px;
  }

  .dot:focus-visible {
    outline: 2px solid var(--color-content-accent);
    outline-offset: 4px;
    border-radius: 50%;
  }

  /* ── Reduced motion ─────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .arrow-circle {
      transition: none;
    }
    .dot::before {
      transition: none;
    }
  }
</style>
