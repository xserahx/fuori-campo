/* ───────────────────────────────────────────────────────────────────────────
   Local volunteer data layer (fully static — no Supabase, no network).

   Replaces the former `$lib/supabase` module. All volunteer rows are bundled
   from ./volunteers.json (exported once from the database) and all photos are
   served as static assets under /volunteer-images (full) and
   /volunteer-images-thumb (teasers). The public API is unchanged so the rest of
   the app keeps working without modification.
   ─────────────────────────────────────────────────────────────────────────── */
import type { GalleryImage } from '$lib/data/gallery';
import volunteersData from './volunteers.json';

export type VolunteerRow = {
	id: string;
	slug: string;
	nome: string;
	cognome: string;
	eta: number | null;
	partecipazione: string | null;
	nazionalita: string | null;
	regione: string | null;
	ruolo_generale: string | null;
	ruolo_specifico: string | null;
	venue_montagna: string | null;
	venue_milano: string | null;
	giornata_tipo: string | null;
	percezione_pubblico: string | null;
	commento_positivo: string | null;
	commento_negativo: string | null;
	cosa_porti: string | null;
	commenti_generali: string | null;
	rifai: string | null;
	autorizzazione_risposte: boolean | null;
	ha_immagini: boolean | null;
	url_immagini: string | null;
	image_path: string | null;
	image_paths: string[] | null;
};

/* Static asset roots — formerly the Supabase Storage bucket + render endpoint. */
const IMG_ROOT = '/volunteer-images';
const THUMB_ROOT = '/volunteer-images-thumb';

/* Storage paths can contain spaces and other characters; encode each segment
   (keeping the slashes) so the static host resolves them to the real files. */
function encodePath(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/');
}

export function getImageUrl(imagePath: string | null | undefined): string | null {
	if (!imagePath) return null;
	return `${IMG_ROOT}/${encodePath(imagePath)}`;
}

/* Pre-baked teaser thumbnail (≤460px webp), generated at export time to replace
   the old on-the-fly Supabase resize endpoint. The width/quality options are
   accepted for API compatibility but the size is now fixed. */
export function getOptimizedImageUrl(
	imagePath: string | null | undefined,
	_opts?: { width: number; quality?: number; resize?: 'cover' | 'contain' }
): string | null {
	if (!imagePath) return null;
	return `${THUMB_ROOT}/${encodePath(imagePath)}`;
}

export function getImageUrls(vol: { ha_immagini?: boolean | null; image_paths?: string[] | null; image_path?: string | null }): string[] {
	if (!vol.ha_immagini) return [];
	if (vol.image_paths && vol.image_paths.length > 0) {
		return vol.image_paths.map((p) => `${IMG_ROOT}/${encodePath(p)}`);
	}
	if (vol.image_path) {
		return [`${IMG_ROOT}/${encodePath(vol.image_path)}`];
	}
	return [];
}

/* The full table, bundled at build time (ordered cognome.asc, nome.asc). */
export const volunteers: VolunteerRow[] = volunteersData as VolunteerRow[];
const bySlug = new Map(volunteers.map((v) => [v.slug, v]));

export function fetchVolunteer(slug: string): VolunteerRow | null {
	return bySlug.get(slug) ?? null;
}

export type VolunteerSummary = Pick<VolunteerRow, 'slug' | 'nome' | 'cognome' | 'ruolo_generale' | 'ha_immagini' | 'image_path' | 'image_paths'>;

// Maps the uppercase role code (prefix before " - ") to the gallery filter tag.
// Derived from all distinct ruolo_generale values in the volunteers table.
const ROLE_CODE_TO_TAG: Record<string, string> = {
	ACR: 'organizzativa', // Accreditations
	PEM: 'organizzativa', // People Management
	CER: 'cerimonie',     // Ceremonies
	REV: 'cerimonie',     // Revenue
	EVM: 'gestione',      // Event Management
	EVS: 'gestione',      // Event Services / Fan Experience
	NCS: 'gestione',      // NOC Service
	VIL: 'gestione',      // Village
	LOG: 'logistica',     // Logistics
	TRA: 'logistica',     // Transport
	COM: 'relazioni',     // Communication
	INT: 'relazioni',     // Interactions / Protocol
	LAN: 'relazioni',     // Language Services
	PRS: 'relazioni',     // Press
	DOP: 'sport',         // Doping Control
	XALP: 'sport',        // Alpine Skiing
	XCUR: 'sport',        // Curling
	XFSK: 'sport',        // Figure Skating
	XIHO: 'sport',        // Ice Hockey
	XSJP: 'sport',        // Ski Jumping
	XSSK: 'sport',        // Speed Skating
	XSTK: 'sport',        // Short Track Speed Skating
};

export function ruoloToTag(ruolo: string | null): string | null {
	if (!ruolo) return null;
	// Extract the code prefix before " - " (e.g. "TRA" from "TRA - Transport")
	const match = ruolo.match(/^([A-Z]+)\s*-/);
	if (match) return ROLE_CODE_TO_TAG[match[1]] ?? null;
	// Fallback for non-coded entries (e.g. "Belli Sciatore Esperto")
	const r = ruolo.toLowerCase();
	if (r.includes('sciator') || r.includes('ski') || r.includes('sport')) return 'sport';
	return null;
}

// All-portrait presets so handleImageLoad can only shrink frames (never grow
// them into the card below). Landscape images correct down to 4:3 or 16:9 on
// load; portrait images stay at or near their preset. No overlap risk.
const GALLERY_ASPECT_RATIOS = [
	{ w: 3, h: 4  },  // 3:4
	{ w: 9, h: 16 },  // 9:16
	{ w: 3, h: 4  },  // 3:4
	{ w: 9, h: 16 },  // 9:16
	{ w: 3, h: 4  },  // 3:4
	{ w: 3, h: 4  },  // 3:4
	{ w: 9, h: 16 },  // 9:16
	{ w: 3, h: 4  },  // 3:4
	{ w: 3, h: 4  },  // 3:4
];

// Volunteers not in the DB — photos exist as static assets, appear in gallery but open no zoom view.
const STATIC_GALLERY_EXTRAS: { name: string; tag: null; paths: string[]; noClick: true }[] = [
	{
		name: 'Robin Christine',
		tag: null,
		noClick: true,
		paths: [
			'robin-christine/image0.webp',
			'robin-christine/image1.webp',
			'robin-christine/image2.webp',
			'robin-christine/image3.webp',
			'robin-christine/image4.webp',
			'robin-christine/image5.webp',
		],
	},
	{
		name: 'Munaro Emanuela',
		tag: null,
		noClick: true,
		paths: [
			'munaro-emanuela/1000073160.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_15921.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16142.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16239.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16258.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16259.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16262.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16263.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16266.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16267.webp',
			'munaro-emanuela/fa0e0a54-be32-4ea3-9770-b612e6c41050-1_all_16470.webp',
		],
	},
];

let _galleryCache: { key: VolunteerSummary[]; images: GalleryImage[] } | null = null;

export function buildGalleryFromVolunteers(volunteers: VolunteerSummary[]): GalleryImage[] {
	// Return the exact same array reference if input didn't change — keeps $derived stable.
	if (_galleryCache?.key === volunteers) return _galleryCache.images;

	// Collect all photos per volunteer (DB rows + static extras)
	const perVol: { slug?: string; name: string; tag: string | null; paths: string[]; noClick?: true }[] = [];

	for (const vol of volunteers) {
		if (!vol.ha_immagini) continue;
		const paths =
			vol.image_paths && vol.image_paths.length > 0
				? vol.image_paths
				: vol.image_path
					? [vol.image_path]
					: [];
		if (paths.length === 0) continue;
		perVol.push({
			slug: vol.slug,
			name: `${vol.cognome} ${vol.nome}`,
			tag: ruoloToTag(vol.ruolo_generale),
			paths,
		});
	}

	// Append static extras so they spread evenly through the round-robin layout
	for (const extra of STATIC_GALLERY_EXTRAS) {
		perVol.push(extra);
	}

	// Round-robin interleave across volunteers so different faces spread evenly
	// through the gallery rather than clustering by surname.
	const result: GalleryImage[] = [];
	const maxRounds = Math.max(0, ...perVol.map(v => v.paths.length));

	for (let round = 0; round < maxRounds; round++) {
		for (const vol of perVol) {
			if (round >= vol.paths.length) continue;
			const ar = GALLERY_ASPECT_RATIOS[result.length % GALLERY_ASPECT_RATIOS.length];
			result.push({
				src:     getImageUrl(vol.paths[round]) ?? '',
				path:    vol.paths[round],
				slug:    vol.slug,
				name:    vol.name,
				left: 0, top: 0,
				width:   ar.w,
				height:  ar.h,
				tags:    vol.tag ? [vol.tag] : [],
				noClick: vol.noClick,
			});
		}
	}

	_galleryCache = { key: volunteers, images: result };
	return result;
}

/* Summaries for the gallery / names list (same shape the old REST query returned). */
const summaries: VolunteerSummary[] = volunteers.map((v) => ({
	slug: v.slug,
	nome: v.nome,
	cognome: v.cognome,
	ruolo_generale: v.ruolo_generale,
	ha_immagini: v.ha_immagini,
	image_path: v.image_path,
	image_paths: v.image_paths,
}));

export function getCachedVolunteers(): VolunteerSummary[] {
	return summaries;
}

/* Async signature kept for API compatibility with the former network fetch —
   resolves immediately from the bundled data. */
export function fetchAllVolunteers(): Promise<VolunteerSummary[]> {
	return Promise.resolve(summaries);
}

export function fetchVolunteerSlugs(): Promise<string[]> {
	return Promise.resolve(volunteers.map((v) => v.slug));
}
