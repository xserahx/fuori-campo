import { fetchVolunteer } from '$lib/data/volunteers';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const dbVol = await fetchVolunteer(params.slug);
	return { dbVol };
};
