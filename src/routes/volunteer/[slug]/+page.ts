import { fetchVolunteer, fetchAllVolunteers } from '$lib/supabase';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const [dbVol, allVols] = await Promise.all([
		fetchVolunteer(params.slug),
		fetchAllVolunteers()
	]);
	return { dbVol, allVols };
};
