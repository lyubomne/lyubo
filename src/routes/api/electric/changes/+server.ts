import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '$env/static/private';

import { transportSchema } from './schemas';
import { TABLES } from './tables';
import { applyChange } from './utils';

export async function POST({ request }) {
	let payload;

	try {
		payload = transportSchema.parse(await request.json());
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		return json({ errors: err.errors }, { status: 400 });
	}

	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	try {
		for (const tx of payload) {
			for (const change of tx.changes) {
				const table = TABLES[change.table];

				if (!table) {
					return json({ error: `table not allowed: ${change.table}` }, { status: 403 });
				}

				await applyChange(supabase, table, change.operation, change.value, change.write_id);
			}
		}
	} catch {
		return json({ error: 'database error' }, { status: 500 });
	}

	return json({ status: 'OK' });
}
