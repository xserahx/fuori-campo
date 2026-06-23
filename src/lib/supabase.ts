import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { GalleryImage } from '$lib/data/gallery';

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

const BUCKET = 'volunteer-images';

const HEADERS = {
	apikey: PUBLIC_SUPABASE_ANON_KEY,
	Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_KEY}`,
	Accept: 'application/json'
};

export function getImageUrl(imagePath: string | null | undefined): string | null {
	if (!imagePath) return null;
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${imagePath}`;
}

export function getImageUrls(vol: { ha_immagini?: boolean | null; image_paths?: string[] | null; image_path?: string | null }): string[] {
	if (!vol.ha_immagini) return [];
	if (vol.image_paths && vol.image_paths.length > 0) {
		return vol.image_paths.map(p => `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`);
	}
	if (vol.image_path) {
		return [`${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${vol.image_path}`];
	}
	return [];
}

export async function fetchVolunteer(slug: string): Promise<VolunteerRow | null> {
	try {
		const res = await fetch(
			`${PUBLIC_SUPABASE_URL}/rest/v1/volunteers?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
			{ headers: HEADERS }
		);
		if (!res.ok) return null;
		const data = (await res.json()) as VolunteerRow[];
		return data[0] ?? null;
	} catch {
		return null;
	}
}

export type VolunteerSummary = Pick<VolunteerRow, 'slug' | 'nome' | 'cognome' | 'ruolo_generale' | 'ha_immagini' | 'image_path' | 'image_paths'>;

export function ruoloToTag(ruolo: string | null): string | null {
	if (!ruolo) return null;
	const r = ruolo.toLowerCase();
	if (r.includes('organizzat')) return 'organizzativa';
	if (r.includes('cerimoni')) return 'cerimonie';
	if (r.includes('gestione') || r.includes('fan')) return 'gestione';
	if (r.includes('logistica') || r.includes('territorio')) return 'logistica';
	if (r.includes('relazioni') || r.includes('comunicazione')) return 'relazioni';
	if (r.includes('sport') || r.includes('disciplin')) return 'sport';
	return null;
}

const GALLERY_ASPECT_RATIOS = [
	{ w: 224, h: 298 },
	{ w: 185, h: 247 },
	{ w: 263, h: 197 },
	{ w: 161, h: 286 },
	{ w: 214, h: 161 },
	{ w: 167, h: 250 },
	{ w: 248, h: 186 },
	{ w: 173, h: 230 },
	{ w: 289, h: 217 },
];

export function buildGalleryFromVolunteers(volunteers: VolunteerSummary[]): GalleryImage[] {
	// Collect all photos per volunteer
	const perVol: { slug: string; name: string; tag: string | null; paths: string[] }[] = [];

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

	// Round-robin interleave across volunteers so different faces spread evenly
	// through the gallery rather than clustering by surname.
	const result: GalleryImage[] = [];
	const maxRounds = Math.max(0, ...perVol.map(v => v.paths.length));

	for (let round = 0; round < maxRounds; round++) {
		for (const vol of perVol) {
			if (round >= vol.paths.length) continue;
			const ar = GALLERY_ASPECT_RATIOS[result.length % GALLERY_ASPECT_RATIOS.length];
			result.push({
				src: getImageUrl(vol.paths[round]) ?? '',
				slug: vol.slug,
				name: vol.name,
				left: 0,
				top: 0,
				width: ar.w,
				height: ar.h,
				tags: vol.tag ? [vol.tag] : [],
			});
		}
	}

	return result;
}

export async function fetchAllVolunteers(): Promise<VolunteerSummary[]> {
	try {
		const res = await fetch(
			`${PUBLIC_SUPABASE_URL}/rest/v1/volunteers?select=slug,nome,cognome,ruolo_generale,ha_immagini,image_path,image_paths&order=cognome.asc,nome.asc`,
			{ headers: HEADERS }
		);
		if (!res.ok) return [];
		return (await res.json()) as VolunteerSummary[];
	} catch {
		return [];
	}
}

export async function fetchVolunteerSlugs(): Promise<string[]> {
	try {
		const res = await fetch(
			`${PUBLIC_SUPABASE_URL}/rest/v1/volunteers?select=slug&order=cognome.asc`,
			{ headers: HEADERS }
		);
		if (!res.ok) return [];
		const data = (await res.json()) as { slug: string }[];
		return data.map((r) => r.slug);
	} catch {
		return [];
	}
}
