<!--Pagina delle categorie di volontari (dal carosello si acceda alla pagina di descrizione della categoria)-->

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { beforeNavigate } from "$app/navigation";
  import { cubicOut, sineInOut, quartOut } from "svelte/easing";
  import { gsap } from "gsap";
  import ArrowButton from "$lib/components/buttons/ArrowButton.svelte";
  import BackButton from "$lib/components/buttons/BackButton.svelte";
  import "$lib/styles/tokens.css";

  type CategoryInfo = {
    label: string;
    image: string;
    tag: string;
    slug: string;
    titleLines?: [string, string];
    mobileTitleSize?: number;
  };

  const CATEGORIES: CategoryInfo[] = [
    {
      label: "RELAZIONI E COMUNICAZIONE",
      titleLines: ["RELAZIONI", "E COMUNICAZIONE"],
      image:
        "/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.png",
      tag: "relazioni",
      slug: "relazioni",
    },
    {
      label: "CERIMONIE E REVENUE",
      image: "/volunteer_images/carosello_categorie/Cerimonia_e_revenue.png",
      tag: "cerimonie",
      slug: "cerimonie",
    },
    {
      label: "SPORT E DISCIPLINE",
      titleLines: ["SPORT", "E DISCIPLINE"],
      mobileTitleSize: 40,
      image: "/volunteer_images/carosello_categorie/Sport.png",
      tag: "sport",
      slug: "sport",
    },
    {
      label: "AREA ORGANIZZATIVA E SERVIZI GENERALI",
      image: "/volunteer_images/carosello_categorie/Area_organizzativa.png",
      tag: "organizzativa",
      slug: "organizzativa",
    },
    {
      label: "LOGISTICA E TERRITORIO",
      image: "/volunteer_images/carosello_categorie/Logistica_e_territorio.png",
      tag: "logistica",
      slug: "logistica",
    },
    {
      label: "GESTIONE OPERATIVA E FAN EXPERIENCE",
      image:
        "/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.png",
      tag: "gestione",
      slug: "gestione",
    },
  ];

  function legacySlugify(label: string) {
    return label
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function splitTitle(label: string): string[] {
    const match = label.match(/^(.*?)(?:\s+E\s+)(.+)$/);
    if (match) return [match[1].trim(), `E ${match[2].trim()}`];

    const words = label.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return [label];

    const mid = Math.max(1, Math.ceil(words.length / 2));
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }

  const slug = $derived((page.params as Record<string, string>).slug ?? "");
  const catIdx = $derived(
    CATEGORIES.findIndex(
      (c) => c.slug === slug || legacySlugify(c.label) === slug,
    ),
  );
  const cat = $derived(catIdx >= 0 ? CATEGORIES[catIdx] : null);
  const lines = $derived(cat ? (cat.titleLines ?? splitTitle(cat.label)) : []);

  type SubRole = {
    title: string;
    description: string;
    role: string;
  };

  const categorySummaries: Record<
    string,
    { eyebrow: string; subtitle: string; roles: SubRole[] }
  > = {
    relazioni: {
      eyebrow: "COM = Communication",
      subtitle:
        "Punto di contatto con i giornalisti, Comitati Olimpici e delegazioni, pronti a guidare la comunicazione e permettere a la corretta diffusione delle notizie con la stampa.",
      roles: [
        {
          title: "PRS = Press",
          description:
            "Gestisce i rapporti con la stampa e la diffusione delle informazioni ufficiali, supportando comunicati, accrediti e richieste media.",
          role: "Press Volunteer",
        },
        {
          title: "INT = Interactions / Protocol",
          description:
            'Gestisce l\'accoglienza della "Olympic Family" (membri CIO, autorità e VIP), occupandosi di cerimoniale e standard di ospitalità di alto livello.',
          role: "Interaction / Protocol Volunteer",
        },
        {
          title: "LAN = Language Services",
          description:
            "Supporta la comunicazione multilingua tra staff, ospiti e delegazioni, facilitando traduzioni, mediazione e comprensione reciproca.",
          role: "Language Services Volunteer",
        },
        {
          title: "NCS = NOC Service (Comitati Olimpici Nazionali)",
          description:
            "Il punto di contatto unico per i Comitati Olimpici Nazionali; li assiste in ogni necessità logistica o burocratica durante la loro permanenza.",
          role: "NOC Assistant",
        },
      ],
    },
    cerimonie: {
      eyebrow: "CER = Cerimonie",
      subtitle:
        "Hanno condiviso le medaglie e il palco con gli atleti, permettendo loro di splendere nel giorno più bello delle loro vite, non dimenticandosi mai di dare spazio agli ospiti speciali e gli sponsor ufficiali.",
      roles: [
        {
          title: "CER = Cerimonie",
          description:
            "Coordina momenti solenni, protocolli e premiazioni con precisione e ritmo scenico durante le cerimonie ufficiali di apertura, chiusura e medaglie.",
          role: "Ceremonies Volunteer",
        },
        {
          title: "REV = Revenue",
          description:
            "Supporta le attività commerciali e di partnership durante i Giochi, garantendo un'esperienza premium agli ospiti degli sponsor ufficiali.",
          role: "Revenue Volunteer",
        },
        {
          title: "RTC = Rate Card",
          description:
            "Gestisce il catalogo degli ospiti istituzionali e degli sponsor nelle aree riservate, curando ogni dettaglio dell'esperienza VIP.Gestisce il catalogo di servizi e attrezzature extra che i partner e i media possono noleggiare per le loro operazioni specifiche durante i Giochi.",
          role: "Rate Card Volunteer",
        },
        {
          title: "IKL = I-Knowledge",
          description:
            'Si occupa del monitoraggio e della raccolta dati per il programma di "Legacy" e trasferimento della conoscenza richiesto dal CIO.',
          role: "I-Knowledge Volunteer",
        },
      ],
    },
    sport: {
      eyebrow: "SPT = Sport",
      subtitle:
        "Addetti ad ognuno dei 51 sport specifici, dal Palazzo del Ghiaccio a Santa Giulia fino alle vette Valtellinesi, a stretto contatto con atleti e pubblico, per far si che ogni competizione non avesse intoppi.",
      roles: [
        {
          title: "XALP = Alpine Skiing",
          description:
            "Lo sci alpino, che comprende le prove di velocità (Discesa e Super-G) e quelle tecniche (Slalom e Gigante) su pista battuta.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer",
        },
        {
          title: "XBOB = Bobsleigh",
          description:
            "Il bob, disciplina di discesa su pista ghiacciata con equipaggi da due o quattro componenti.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer",
        },
        {
          title: "XBTH = Biathlon",
          description:
            "Sport che combina lo sci di fondo (resistenza) con il tiro a segno con carabina (precisione) in diverse sessioni.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer",
        },
        {
          title: "XCSS = Cross-Country",
          description: "Lo sci di fondo.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer",
        },
        {
          title: "XCUR = Curling",
          description:
            "Sport di strategia su ghiaccio dove si fanno scivolare pesanti pietre di granito verso un bersaglio (house).",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Sport Information Volunteer, Sport Liaison Volunteer",
        },
        {
          title: "XFRS = Freestyle Skiing",
          description:
            "Sci acrobatico che include specialità come Moguls, Aerials, Halfpipe, Slopestyle e lo Ski Cross.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer",
        },
        {
          title: "XFSK = Figure Skating",
          description:
            "Il pattinaggio di figura, dove singoli, coppie o gruppi eseguono elementi tecnici e coreografici su musica.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, FOP Operations Volunteer, Sport Information Volunteer, Sport Liaison Volunteer",
        },
        {
          title: "XIHO = Ice Hockey",
          description:
            "Torneo di hockey su ghiaccio, sport di squadra ad alta velocità giocato in tre tempi da 20 minuti.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Sport Information Volunteer, Sport Liaison Volunteer",
        },
        {
          title: "XSJP = Ski Jumping",
          description:
            "Il salto con gli sci dai trampolini (Normal Hill e Large Hill), valutato per distanza e stile del volo.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Hill Support Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer, Timing Volunteer",
        },
        {
          title: "XSMT = Ski Mountaineering",
          description:
            "Lo sci alpinismo. Debutta nel 2026 e prevede salite con pelli di foca, tratti a piedi e discese fuori pista.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Information Volunteer, Timing Volunteer",
        },
        {
          title: "XSSK = Speed Skating",
          description:
            "Pattinaggio di velocità su pista lunga (400m), dove gli atleti competono contro il tempo in corsie separate.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, Results Volunteer, Sport Equipment Volunteer, Sport Information Volunteer, Sport Liaison Volunteer",
        },
        {
          title: "XSTK = Short Track Speed Skating",
          description:
            "Pattinaggio di velocità su pista corta (111m), caratterizzato da partenze in linea e sorpassi spettacolari.",
          role: "Access Control Volunteer, Athlete Services Volunteer, Competition Support Volunteer, Field of Play Volunteer, FOP Operations Volunteer, Sport Information Volunteer, Sport Liaison Volunteer",
        },
      ],
    },
    organizzativa: {
      eyebrow: "ORG = Organizzazione",
      subtitle:
        "Hanno permesso la corretta organizzazione e gestione dei volontari e dell’infrastruttura tecnologica dei giochi, dal distribuire gli accrediti, ai buoni pasto fino al corretto funzionamento del WIFI.",
      roles: [
        {
          title: "PEM = People Management",
          description:
            'Si occupa della strategia delle risorse umane "intangibile": pianificazione dei turni, gestione dei check-in/out dei volontari presso i centri dedicati, coordinamento della formazione e attività di riconoscimento/rewarding.',
          role: "Workforce Village Volunteer, Athlete 365 Volunteer, Mind Zone Volunteer, Olympic Club Volunteer, Workforce Volunteer ",
        },
        {
          title: "ACR = Accreditations",
          description:
            "Gestisce l'intero ciclo di vita dell'accreditamento. Questo include la verifica delle identità, il rilascio dei pass e la gestione degli UAC (Uniform and Accreditation Centres), dove avviene fisicamente la consegna del kit ufficiale (divisa Salomon) a volontari e staff.",
          role: "Accreditation Volunteer, Uniform Volunteer ",
        },
        {
          title: "TEC = Technology",
          description:
            "Assicura il funzionamento di tutta l'infrastruttura IT: dai sistemi di cronometraggio e punteggio (Timing & Scoring) alla connettività Wi-Fi e al supporto tecnico nei siti (Venue Technology).",
          role: "Results Volunteer, Timing Volunteer, Venue Technology Volunteer",
        },
      ],
    },
    logistica: {
      eyebrow: "LOG = Logistica",
      subtitle:
        "A servizio della flotta dei veicoli, per permettere agli atleti e alla famiglia olimpica di orientarsi tra le vie di Milano e le stradine delle Valli e gli Aeroporti.",
      roles: [
        {
          title: "AND = Arrivals & Departures",
          description:
            'Opera nei "Port of Entry" (aeroporti di Malpensa, Linate, Venezia e stazioni ferroviarie). Accoglie le delegazioni e coordina il flusso verso le destinazioni finali.',
          role: "Arrivals & Departures Volunteer",
        },
        {
          title: "LOG = Logistics",
          description:
            "Responsabile della pianificazione, stoccaggio e distribuzione di materiali pesanti, arredi e attrezzature sportive tra i vari cluster (Milano, Valtellina, Cortina, Val di Fiemme e Anterselva).",
          role: "Logistics Volunteer",
        },
        {
          title: "TRA = Transport",
          description:
            "Gestisce il sistema di navette e la flotta di veicoli ufficiali per garantire spostamenti puntuali e sicuri a tutti gli stakeholder accreditati.",
          role: "Transport Volunteer",
        },
        {
          title: "VIL = Village",
          description:
            "Gestisce le operazioni nei Villaggi Olimpici e Paralimpici, assicurando i servizi residenziali e l'accoglienza quotidiana per gli atleti.",
          role: "Village Volunteer",
        },
      ],
    },
    gestione: {
      eyebrow: "FEX = Fan Experience",
      subtitle:
        "Coloro con cui sicuramente hai parlato o hai sentito negli stadi, hanno fatto sì che non ti annoiassi mai e ti hanno indicato l’entrata, ma non solo hanno permesso pure che tutto fosse sempre coordinato.",
      roles: [
        {
          title: "EVM = Event Management",
          description:
            'Coordinamento operativo della Venue. È l\'area che fa da "collante" tra tutte le altre FA per assicurare che il sito di gara funzioni secondo i piani.',
          role: "Event Management Volunteer",
        },
        {
          title: "EVS = Event Services",
          description:
            "Gestisce l'esperienza e la sicurezza dello spettatore all'interno del sito di gara. Si occupa della gestione dei flussi (code e ingressi), del controllo dei titoli di accesso, dell'assistenza alle persone con disabilità e delle procedure di primo intervento o smarrimento oggetti.",
          role: "Event Services Volunteer",
        },
        {
          title: "SPP = Sport Presentation",
          description:
            'Gestisce lo spettacolo "live" negli stadi: annunci dello speaker, musica, contenuti sui maxischermi e coordinamento dei momenti di intrattenimento per il pubblico.',
          role: "Sport Presentation Volunteer",
        },
        {
          title: "SPS = Spectator Services",
          description:
            "Gestisce l'esperienza dello spettatore dal momento in cui entra nel perimetro olimpico: orientamento, assistenza, gestione delle code e dei flussi alle tribune.",
          role: "Spectator Services Volunteer",
        },
        {
          title: "DOP = Doping Control",
          description:
            "Fornisce supporto logistico ai medici antidoping. Il ruolo principale è quello di Chaperone: notificare agli atleti il controllo e scortarli fino alla stazione medica ufficiale.",
          role: "Doping Control Volunteer",
        },
      ],
    },
  };

  const activeSummary = $derived(
    categorySummaries[cat?.tag ?? ""] ?? {
      eyebrow: cat ? `${cat.label.split(" ")[0]} = Category` : "CATEGORY",
      subtitle: "Un ruolo che connette persone, spazi e contenuti.",
      roles: [
        {
          title: cat?.label ?? "CATEGORY",
          description:
            "Lavora in modo coordinato tra persone, spazi e contenuti per supportare il funzionamento dell'evento.",
          role: "Volunteer",
        },
      ],
    },
  );

  let activeRoleIndex = $state(0);

  $effect(() => {
    activeRoleIndex = 0;
    cat?.tag;
  });

  const activeRole = $derived(
    activeSummary.roles[
      Math.min(activeRoleIndex, activeSummary.roles.length - 1)
    ],
  );
  const roleCount = $derived(activeSummary.roles.length);

  let summaryMeasureEl: HTMLDivElement | null = $state(null);
  let summaryMaxTextHeight = $state(0);
  let summaryMeasureRaf = 0;
  let summaryMeasureObserver: ResizeObserver | null = null;

  function measureSummaryMaxTextHeight() {
    if (!summaryMeasureEl) return;

    const children = Array.from(summaryMeasureEl.children) as HTMLElement[];
    let maxHeight = 0;

    for (const child of children) {
      const rect = child.getBoundingClientRect();
      maxHeight = Math.max(maxHeight, Math.ceil(rect.height));
    }

    summaryMaxTextHeight = maxHeight;
  }

  function queueSummaryMeasurement() {
    if (typeof window === "undefined") return;
    if (summaryMeasureRaf) return;

    summaryMeasureRaf = requestAnimationFrame(async () => {
      summaryMeasureRaf = 0;

      await tick();
      measureSummaryMaxTextHeight();
    });
  }

  function setupSummaryMeasureObserver() {
    if (typeof ResizeObserver === "undefined" || !summaryMeasureEl) return;

    summaryMeasureObserver?.disconnect();

    summaryMeasureObserver = new ResizeObserver(() => {
      queueSummaryMeasurement();
    });

    summaryMeasureObserver.observe(summaryMeasureEl);

    for (const child of Array.from(summaryMeasureEl.children)) {
      summaryMeasureObserver.observe(child);
    }
  }

  $effect(() => {
    activeSummary.roles;

    if (typeof window === "undefined") return;

    queueSummaryMeasurement();
  });

  function unlockCategoryScroll() {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    root.style.removeProperty("overflow");
    root.style.removeProperty("overflow-y");
    root.style.removeProperty("height");
    root.style.removeProperty("position");

    body.style.removeProperty("overflow");
    body.style.removeProperty("overflow-y");
    body.style.removeProperty("height");
    body.style.removeProperty("position");
    body.style.removeProperty("padding-top");
    body.style.removeProperty("margin");

    root.classList.remove("lenis-stopped");
    body.classList.remove("lenis-stopped");
  }

  beforeNavigate(() => {
    unlockCategoryScroll();
  });

  onMount(() => {
    unlockCategoryScroll();
    queueSummaryMeasurement();

    tick().then(() => {
      setupSummaryMeasureObserver();
      queueSummaryMeasurement();
    });

    const frame = requestAnimationFrame(() => {
      unlockCategoryScroll();
      queueSummaryMeasurement();
    });

    const timer = window.setTimeout(() => {
      unlockCategoryScroll();
      queueSummaryMeasurement();
    }, 120);

    window.addEventListener("resize", queueSummaryMeasurement);

    // ── Zoom locale della pagina ──────────────────────────────────────
    // app.html rimpicciolisce tutto con `zoom` sopra i 700px. Qui teniamo
    // zoom = 1 fino a 1000px, così il layout "a colonna" (titolo a capo +
    // descrizione + card) resta a grandezza piena sui tablet invece di essere
    // scalato in miniatura. Sopra i 1000px torna il layout desktop scalato.
    // Il rAF fa vincere questo valore su quello di app.html.
    const TABLET_MAX = 1000;
    // Layout "a colonna" (zoom 1) quando è stretto OPPURE in verticale
    // (portrait/quadrato): lì il layout desktop lascerebbe troppo vuoto.
    const isColumnLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return w <= TABLET_MAX || w <= h;
    };
    const applyZoom = () => {
      const w = window.innerWidth;
      const v = isColumnLayout() ? 1 : w / 1728;
      document.documentElement.style.zoom = String(v);
      document.documentElement.style.setProperty("--page-zoom", String(v));
    };
    let zoomRaf = 0;
    const scheduleZoom = () => {
      if (zoomRaf) return;
      zoomRaf = requestAnimationFrame(() => {
        zoomRaf = 0;
        applyZoom();
      });
    };
    applyZoom();
    window.addEventListener("resize", scheduleZoom, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", queueSummaryMeasurement);
      window.removeEventListener("resize", scheduleZoom);
      cancelAnimationFrame(zoomRaf);

      if (summaryMeasureRaf) {
        cancelAnimationFrame(summaryMeasureRaf);
        summaryMeasureRaf = 0;
      }

      summaryMeasureObserver?.disconnect();
      summaryMeasureObserver = null;

      unlockCategoryScroll();

      // Ripristina lo zoom globale (soglia 700 di app.html) per la pagina dopo.
      const w = window.innerWidth;
      const v = w <= 700 ? 1 : w / 1728;
      document.documentElement.style.zoom = String(v);
      document.documentElement.style.setProperty("--page-zoom", String(v));
    };
  });

  const prefersReduced = () =>
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Entrata cinematografica ───────────────────────────────────────
  // Coerente con about / carosello: le righe del titolo risalgono passando da
  // sfocate a nitide, la copy e il sommario entrano in blur a cascata. Stesso
  // linguaggio di riseIn/blurRevealIn (yPercent + blur, power4/power2.out).
  let heroTitleEl: HTMLElement | null = $state(null);
  let heroCopyEl: HTMLElement | null = $state(null);
  let summaryEl: HTMLElement | null = $state(null);

  // Il font display arriva da Adobe Fonts (async): giochiamo il reveal solo
  // quando è pronto, così il testo non "sobbalza" di qualche px quando il
  // web-font subentra a fine animazione (stesso accorgimento di carosello/zoom).
  const DISPLAY_FONT = '800 1em "forma-djr-display"';
  function displayFontReady(): Promise<unknown> {
    if (typeof document === "undefined" || !document.fonts)
      return Promise.resolve();
    if (document.fonts.check(DISPLAY_FONT)) return Promise.resolve();
    return document.fonts.load(DISPLAY_FONT).catch(() => {});
  }

  $effect(() => {
    const _ = slug; // ri-esegui a ogni cambio categoria
    const titleEl = heroTitleEl;
    if (!titleEl) return;
    if (prefersReduced()) return; // niente moto → il contenuto resta visibile

    const lines = Array.from(
      titleEl.querySelectorAll<HTMLElement>(".title-fill, .title-outline"),
    );
    if (!lines.length) return;

    const copy = heroCopyEl;
    const controls = summaryEl
      ? Array.from(summaryEl.querySelectorAll<HTMLElement>(".dot-frecce"))
      : [];

    const summaryText = summaryEl
      ? Array.from(
          summaryEl.querySelectorAll<HTMLElement>(
            ".summary-top-wrap .summary-top",
          ),
        )
      : [];

    // Stato iniziale nascosto applicato dentro l'effect (prima del paint) → niente flash.
    gsap.set(lines, { yPercent: 60, opacity: 0, filter: "blur(12px)" });
    if (copy) gsap.set(copy, { y: 16, opacity: 0, filter: "blur(10px)" });
    if (controls.length)
      gsap.set(controls, { y: 18, opacity: 0, filter: "blur(9px)" });

    // Nascondiamo e sfochiamo il testo delle sottocategorie all'inizio
    if (summaryText.length)
      gsap.set(summaryText, { y: 14, opacity: 0, filter: "blur(10px)" });

    let cancelled = false;
    displayFontReady().then(() => {
      if (cancelled) return;
      const tl = gsap.timeline();

      // Titolo: le righe risalgono in cascata.
      tl.to(
        lines,
        {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.0,
          ease: "power4.out",
          force3D: false,
          stagger: 0.09,
        },
        0,
      );

      // Copy della hero: blur-in con leggera risalita.
      if (copy)
        tl.to(
          copy,
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power2.out",
          },
          0.22,
        );

      // entrata del testo delle sottocategorie nella sequenza cascata, dopo la copy della hero
      if (summaryText.length)
        tl.to(
          summaryText,
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power2.out",
          },
          0.32,
        );

      // Controlli del sommario: blur-in sotto, a chiudere la cascata.
      if (controls.length)
        tl.to(
          controls,
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.85,
            ease: "power2.out",
          },
          0.4,
        );
    });

    return () => {
      cancelled = true;
    };
  });

  // Shrink the one-line (nowrap) desktop title so the longest line always
  // fits its container — no clipping at any width. Fino a 1000px si usa il
  // layout "a colonna" (titolo a capo, zoom di pagina tenuto a 1), quindi qui
  // si disattiva e resta a --title-fit: 1.
  function fitTitle() {
    const el = heroTitleEl;
    if (!el || typeof window === "undefined") return;

    if (window.innerWidth <= 1000 || window.innerWidth <= window.innerHeight) {
      el.style.setProperty("--title-fit", "1");
      return;
    }

    // Measure at natural size first, then compute the shrink factor.
    el.style.setProperty("--title-fit", "1");
    const lines = Array.from(
      el.querySelectorAll<HTMLElement>(".title-fill, .title-outline"),
    );
    let scale = 1;
    for (const line of lines) {
      const avail = line.clientWidth; // container box (bounded by max-width)
      const natural = line.scrollWidth; // full one-line text width
      if (avail > 0 && natural > avail)
        scale = Math.min(scale, avail / natural);
    }
    // Tiny safety margin so glyph edges / the outline stroke never touch the clip.
    el.style.setProperty("--title-fit", scale < 1 ? String(scale * 0.99) : "1");
  }

  $effect(() => {
    const _ = slug; // refit when the category (title) changes
    if (typeof window === "undefined") return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitTitle);
    };

    let cancelled = false;
    schedule(); // fit with whatever font is ready now
    displayFontReady().then(() => {
      if (!cancelled) schedule();
    }); // refit once the web font loads
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
    };
  });

  function blurFade(
    _node: HTMLElement,
    { duration = 700, blur = 5, y = 10, easing = quartOut } = {},
  ) {
    return {
      duration: prefersReduced() ? 0 : duration,
      easing,
      // t va da 0 a 1 (entrata), u è l'inverso da 1 a 0
      css: (t: number, u: number) => `
        opacity: ${t};
        filter: blur(${u * blur}px);
        transform: translateY(${u * y}px);
      `,
    };
  }
</script>

<svelte:head>
  <title>{cat?.label ?? "Categoria"} — Fuori Campo</title>
</svelte:head>

{#if cat}
  <main
    class="category-page"
    id="main-content"
    class:category-sport={cat?.slug === "sport"}
  >
    <div class="back-btn-wrapper">
      <BackButton onclick={() => history.back()} ariaLabel="Indietro" />
    </div>

    <section class="hero" aria-labelledby="category-title">
      <div
        class="hero-title"
        id="category-title"
        bind:this={heroTitleEl}
        style={cat.mobileTitleSize
          ? `--mobile-title-size: ${cat.mobileTitleSize}px`
          : undefined}
      >
        {#each lines as line, i}
          <span class="title-mask">
            {#if i === 0}
              <span class="title-fill">{line}</span>
            {:else}
              <span class="title-outline">{line}</span>
            {/if}
          </span>
        {/each}
      </div>

      <p class="hero-copy" bind:this={heroCopyEl}>{activeSummary.subtitle}</p>
    </section>

    <section
      class="summary-card"
      aria-label="Categoria e sottocategoria"
      bind:this={summaryEl}
      style={`--summary-max-text-height: ${summaryMaxTextHeight}px`}
    >
      <div class="summary-top-wrap">
        {#key activeRoleIndex}
          <div
            class="summary-top"
            in:blurFade={{ duration: 800, blur: 8, easing: quartOut }}
            out:blurFade={{ duration: 350, blur: 5, easing: sineInOut }}
          >
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

      <div
        class="summary-measure"
        bind:this={summaryMeasureEl}
        aria-hidden="true"
      >
        {#each activeSummary.roles as measuredRole}
          <div class="summary-top summary-top--measure">
            <div class="summary-meta">
              <p class="summary-eyebrow">{measuredRole.title}</p>
            </div>

            <div class="summary-copy">
              <p>{measuredRole.description}</p>
              <p class="summary-footer">{measuredRole.role}</p>
            </div>
          </div>
        {/each}
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
              onclick={() => {
                activeRoleIndex = index;
              }}
            ></button>
          {/each}
        </div>

        <div class="frecce" aria-label="Navigazione sotto-ruoli">
          <ArrowButton
            direction="left"
            ariaLabel="Sotto-ruolo precedente"
            onclick={() => {
              activeRoleIndex = (activeRoleIndex - 1 + roleCount) % roleCount;
            }}
          />

          <ArrowButton
            direction="right"
            ariaLabel="Sotto-ruolo successivo"
            onclick={() => {
              activeRoleIndex = (activeRoleIndex + 1) % roleCount;
            }}
          />
        </div>
      </div>
    </section>
  </main>
{:else}
  <div class="not-found">Categoria non trovata</div>
{/if}

<style>
  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    background: var(--color-background-primary);
  }

  /* contenitore carosello. */
  .category-page {
    position: relative;
    width: 100%; /* Si prende la larghezza disponibile senza creare scroll orizzontali */
    height: 100dvh; /* Altezza bloccata allo schermo */
    background: var(--color-background-primary);
    color: var(--color-content-body);
    overflow: hidden; /* Niente scroll su desktop */
    padding-top: calc(var(--navbar-height, 125px) + var(--spacing-5));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  /* Bottoni indietro */
  .back-btn-wrapper {
    margin-left: var(--spacing-11);
    position: relative;
    z-index: 30;
  }

  /* hero descrizione contenitore flessibile */
  .hero {
    width: 100%;
    position: relative;
    z-index: 5;
    margin: 0;
    padding: var(--spacing-5) 0 0;
    display: flex;
    flex-direction: column;
    pointer-events: none; /* Lascia passare i click alla card sotto */
  }

  .hero-title,
  .hero-copy {
    pointer-events: auto; /* Riattiva i click sui testi */
  }

  .hero-title {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
    padding: 0;
    overflow: hidden;
  }

  .title-mask {
    display: block;
  }

  .title-fill,
  .title-outline {
    font-family: var(--font-display);
    /* --title-fit (default 1) is set by fitTitle() in JS to shrink the
       one-line (nowrap) title just enough that the longest line fits its
       container at any desktop width — otherwise the --page-zoom-compensated
       size overflows and gets clipped by `overflow: hidden` (e.g. "GESTIONE
       OPERATIVA" at ~995px). */
    /* La compensazione /--page-zoom col floor 0.65 gonfiava il titolo (fino a
       ~178px) sotto i ~1123px, facendolo sbordare dal canvas fisso a 1728px.
       Con min(--unit-116, ...) lo limito alla dimensione di progetto, che nel
       canvas 1728 ci sta sempre: niente overflow, senza dipendere dal fit JS. */
    font-size: calc(
      min(
          var(--unit-116),
          clamp(
            var(--unit-56),
            calc(var(--unit-116) / max(var(--page-zoom, 1), 0.65)),
            var(--unit-200)
          )
        ) * var(--title-fit, 1)
    );
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
  }

  .title-fill {
    color: var(--color-content-accent);
    margin-left: var(--spacing-11);
    margin-bottom: -8px;
    max-width: calc(100% - var(--spacing-11) - var(--spacing-11));
    overflow: hidden;
    min-width: 0;
  }

  .title-outline {
    color: transparent;
    -webkit-text-stroke: var(--stroke-1) var(--color-content-accent);
    margin-left: var(--spacing-17);
    margin-top: 0;
    max-width: calc(100% - var(--spacing-17) - var(--spacing-11));
    overflow: hidden;
    min-width: 0;
  }

  .category-sport .title-outline {
    margin-left: clamp(0px, 24.5vw, 268px);
    max-width: calc(100% - clamp(0px, 24.5vw, 268px) - var(--spacing-11));
  }

  /* descrizione/spigazione categoria  */
  .hero-copy {
    margin-top: clamp(10px, 4vh, var(--unit-36));
    margin-left: auto;
    margin-right: var(--spacing-11);
    padding: 0;
    width: 100%;
    max-width: min(70dvw, 1100px);
    text-align: right;
    text-wrap: balance;
    font-family: var(--font-display);
    font-weight: 500;
    line-height: 1.05;
    color: var(--color-content-body);

    /* Il testo guarda l'altezza (vh), non solo la larghezza (vw) */
    /* Parte da un minimo di 20px e si ferma a 45px. Nel mezzo, usa il 4% dell'altezza dello schermo */
    font-size: clamp(25px, 6vh, 45px);
  }

  /* 4. la card delle sottocategorie è ancorata nello stesso punto */
  .summary-card {
    --summary-arrows-size: 60px;
    --summary-controls-gap: 40px;
    --summary-dots-lift: 9px;
    --summary-bottom-reserve: calc(
      var(--summary-arrows-size) + var(--summary-controls-gap)
    );

    position: fixed;
    bottom: var(--spacing-8);
    left: var(--spacing-11);
    z-index: 20;

    width: calc(50vw - var(--spacing-8));
    max-width: 600px;

    padding: 0 0 var(--spacing-12, 80px);
    margin: 0;

    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    pointer-events: auto;
  }
  .summary-top-wrap {
    position: relative;
    width: 100%;
    min-height: var(--summary-max-text-height, 0px);
    display: grid;
    align-items: end;
  }

  .summary-top-wrap > :global(*) {
    grid-area: 1 / 1;
  }

  .summary-top {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: var(--spacing-4);
    width: 100%;
  }

  .summary-measure {
    position: absolute;
    left: 0;
    right: 0;
    bottom: var(--summary-bottom-reserve);
    width: 100%;
    visibility: hidden;
    pointer-events: none;
  }

  .summary-top--measure {
    width: 100%;
  }

  .summary-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
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

  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    max-width: 100%;
    font-family: var(--font-display);
    font-size: var(--unit-24);
    line-height: 26px;
    text-wrap: balance;
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

  /* contenitore dot+frecce */
  .dot-frecce {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;

    display: flex;
    justify-content: space-between; /* Pallini a sx, frecce a dx */
    align-items: flex-end; /* entrambi gli elementi allineati in basso */

    pointer-events: auto;
  }

  /* dot nav */
  .dot-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);

    margin-bottom: 0;
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
    content: "";
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

  /* frecce */
  .frecce {
    display: flex;
    align-items: center;
    gap: var(--unit-20);
    margin-bottom: 0;
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

  /* ── shcermi bassi queries ── */
  @media (max-height: 850px) {
    .category-page {
      /* ridotto il padding superiore per guadagnare spazio */
      padding-top: calc(var(--navbar-height, 80px) + var(--spacing-2));
    }

    .hero {
      padding-top: 0; /* Togliamo ulteriore spazio vuoto */
    }
  }

  @media (max-width: 1000px), (max-aspect-ratio: 1 / 1) {
    /* Layout "a colonna" a grandezza piena (zoom tenuto a 1 in onMount) quando
       lo schermo è stretto (≤1000px) OPPURE in verticale/quadrato: lì il
       desktop lascerebbe troppo vuoto. Scorre, manda il titolo a capo e scala
       i font in modo fluido. Il desktop resta solo per il landscape largo. */
    /* Pagina torna a scorrere */
    .category-page {
      position: relative; /* Resetta il fixed del desktop */
      height: auto;
      min-height: 100dvh;
      overflow-x: hidden;
      overflow-y: auto;
      /* Padding per distanziare i contenuti dai bordi dello schermo */
      padding: var(--spacing-5, 24px);
      padding-top: calc(var(--navbar-height, 125px) + var(--spacing-4));
      padding-bottom: var(--spacing-8); /* aria in fondo, ora che la card scorre nel flusso */
      box-sizing: border-box;
    }

    .back-btn-wrapper {
      position: relative; /* Perde ogni ancoraggio fisso */
      margin-left: 0; /* Resetta il margine desktop per allinearsi al titolo */
      margin-top: 0;
      margin-bottom: var(--spacing-4); /* Spinge il titolo sotto di sé */
      z-index: 30;
    }

    /* hero titolo */
    .hero {
      padding: 0;
      flex-grow: 0;
    }

    .hero-title {
      overflow: visible; /* Sblocca il contenitore generale */
    }

    /* struttura titolo */
    .title-mask {
      display: block;
      overflow: hidden; /* Serve per l'animazione dal basso di Svelte/GSAP */

      /* Creiamo lo spazio invisibile per non far tagliare la maschera */
      padding-bottom: 12px;
      margin-bottom: -12px;
    }

    .title-fill,
    .title-outline {
      display: block;
      white-space: normal;
      overflow-wrap: break-word; /* parole lunghe vanno a capo invece di sbordare */
      /* Font fluido: scala con la larghezza (9vw), grande sui tablet e piccolo
         sui telefoni stretti, senza mai sbordare. */
      font-size: clamp(28px, 9vw, 84px);
      line-height: 0.9; /* senza unità: segue il font-size a ogni dimensione */
      width: 100%;
      max-width: 100%;
      margin: 0;

      overflow: visible;
    }

    .title-outline {
      -webkit-text-stroke: var(--stroke-mobile) var(--color-content-accent);
      padding-left: 2px; /* Margine di sicurezza ottico */
    }

    /* Resetta l'allineamento speciale dello sport su desktop */
    .category-sport .title-outline {
      margin-left: 0;
      max-width: 100%;
    }

    /* descrizione categorie mobile */
    .hero-copy {
      margin-top: var(--spacing-8, 48px); /* Distanza dal titolo sopra */
      margin-left: 0;
      margin-bottom: 0;
      margin-right: 0; /* Su mobile non serve il margine destro del desktop */
      width: 100%;
      max-width: 100%;

      text-align: right; /* Mantiene l'allineamento a destra */

      /* tipografia fluida */
      /* Parte da 22px (telefoni piccoli), cresce col 7% dello schermo, si ferma a 30px */
      font-size: clamp(22px, 7vw, 30px);

      line-height: 0.95;

      font-weight: 500;

      /* Bilancia le righe per evitare parole singole a fine paragrafo */
      text-wrap: balance;
    }

    /* La card scorre nel flusso, sotto la descrizione: così non si sovrappone
       più al testo sugli schermi bassi (era `fixed` e ci finiva sopra). */
    .summary-card {
      position: relative;
      bottom: auto;
      left: auto;
      margin-top: var(--spacing-8); /* stacco dalla descrizione sopra */
      width: 100%;
      max-width: 100%;
    }

    .summary-top {
      width: 100%;
    }

    /* titolo sottocategoria  */
    .summary-eyebrow {
      /* Scala morbidamente dai 16px (su schermi mini) al tuo target Figma (20px) */
      font-size: clamp(18px, 7vw, 20px);

      /* In Figma 11.77px su 20px è troppo stretto (rischio taglio).
         Con "1" l'interlinea è esattamente uguale al font (20px). */
      line-height: 1;
      letter-spacing: 0; /* Resetta eventuali spaziature del desktop */
    }

    .summary-copy,
    .summary-footer {
      /* Scala dai 13px al target di Figma (15px) */
      font-size: clamp(15px, 5vw, 18px);

      /* Su un paragrafo, un line-height a 15px (uguale al font) risulta un po'
         schiacciato e faticoso da leggere su telefono. 1.15 è la media aurea. */
      line-height: 1.15;
    }

    /* dot mobile ridotto */
    .dot-nav {
      /* Limite invalicabile: si prende tutta la larghezza tranne 110px, 
         che vengono lasciati categoricamente liberi per le frecce */
      max-width: calc(100% - 110px);

      /* Gap fisso e immutabile: non si deformerà mai */
      gap: 6px;

      /* Rete di sicurezza: se in futuro avrai 20 categorie e non ci staranno, 
         andranno su una seconda riga ordinata senza rompere il layout o invadere le frecce */
      flex-wrap: wrap;
    }

    .dot,
    .dot::before {
      width: 12px;
      height: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot::before {
      transition: none;
    }
  }
</style>
