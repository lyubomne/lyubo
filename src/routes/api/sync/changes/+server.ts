import { json } from '@sveltejs/kit';
import postgres, { PostgresError } from 'postgres';
import { APP_DATABASE_URL } from '$env/static/private';

import { MAX_SYNC_REQUEST_BYTES } from '$lib/common/limits';
import { readJsonBody } from '$lib/server/http';
import { ChangeRejectedError, TABLES, applyChange, transportSchema } from '$lib/server/sync';

// Restricted role (DML only), see APP_DATABASE_URL in .env.example
const sql = postgres(APP_DATABASE_URL, { max: 5 });

// Postgres error classes caused by the data itself: 22 data exception, 23 integrity violation
const isDataError = (err: unknown): boolean =>
	err instanceof PostgresError && (err.code.startsWith('22') || err.code.startsWith('23'));

export async function POST({ request }) {
	const read = await readJsonBody(request, MAX_SYNC_REQUEST_BYTES);

	if (!read.ok) {
		return json({ error: read.error }, { status: read.status });
	}

	const parsed = transportSchema.safeParse(read.body);

	if (!parsed.success) {
		return json({ errors: parsed.error.issues }, { status: 400 });
	}

	const payload = parsed.data;

	for (const tx of payload) {
		for (const change of tx.changes) {
			if (!TABLES[change.table]) {
				return json({ error: `table not allowed: ${change.table}` }, { status: 403 });
			}
		}
	}

	try {
		// All transactions of one request commit together or not at all
		await sql.begin(async (tx) => {
			for (const transaction of payload) {
				for (const change of transaction.changes) {
					await applyChange({
						tx,
						table: TABLES[change.table],
						operation: change.operation,
						value: change.value,
						write_id: change.write_id
					});
				}
			}
		});
	} catch (err) {
		if (err instanceof ChangeRejectedError || isDataError(err)) {
			return json({ error: 'change rejected' }, { status: 400 });
		}

		console.error(err);

		return json({ error: 'database error' }, { status: 500 });
	}

	return json({ status: 'OK' });
}
