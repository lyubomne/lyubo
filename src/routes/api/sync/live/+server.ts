import { json } from '@sveltejs/kit';
import { createRealtime } from '@neon/realtime/server';
import { z } from 'zod';
import { APP_DATABASE_URL, NEON_REALTIME_SECRET, NEON_REALTIME_URL } from '$env/static/private';

import { readJsonBody } from '$lib/server/http';
import { TABLES } from '$lib/server/sync';

// The body is a table name only
const MAX_BODY_BYTES = 1_024;

const realtime = createRealtime({
	secret: NEON_REALTIME_SECRET,
	db: new URL(APP_DATABASE_URL).pathname.slice(1)
});

const tableNames = Object.keys(TABLES) as [string, ...string[]];
const requestSchema = z.object({ table: z.enum(tableNames) });

// Seals the live query of a whitelisted table. The sealed query is a short-lived bearer token:
// it is sent in the response body only, never in a URL
export async function POST({ request }) {
	const read = await readJsonBody(request, MAX_BODY_BYTES);

	if (!read.ok) {
		return json({ error: read.error }, { status: read.status });
	}

	const parsed = requestSchema.safeParse(read.body);

	if (!parsed.success) {
		return json({ errors: parsed.error.issues }, { status: 400 });
	}

	const sealed = await realtime.seal({ query: TABLES[parsed.data.table].liveQuery });

	return json({ url: NEON_REALTIME_URL, sealed }, { headers: { 'Cache-Control': 'no-store' } });
}
