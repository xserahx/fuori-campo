import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

export type VolunteerSummary = Pick<VolunteerRow, 'slug' | 'nome' | 'cognome' | 'ruolo_generale'>;

export async function fetchAllVolunteers(): Promise<VolunteerSummary[]> {
	try {
		const res = await fetch(
			`${PUBLIC_SUPABASE_URL}/rest/v1/volunteers?select=slug,nome,cognome,ruolo_generale&order=cognome.asc,nome.asc`,
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
