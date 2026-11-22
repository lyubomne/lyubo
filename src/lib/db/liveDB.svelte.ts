import type { PGliteWithLive } from '@electric-sql/pglite/live';
import type { query, sql } from '@electric-sql/pglite/template';
import { createSubscriber } from 'svelte/reactivity';

// Built with the `query` template tag of '@electric-sql/pglite/template', which binds values as
// parameters and escapes `identifier`s, so a live query is never put together from strings
export type TLiveQuery = ReturnType<typeof query>;
// A part of a query from the `sql` template tag, nested into `query` or `db.sql`
export type TSqlFragment = ReturnType<typeof sql>;

/*
 * Runs a live query until the returned stop is called. Stopping waits for the query to start: a
 * query stopped earlier would stay live and run again on every write.
 */
export const startLiveQuery = <TResult>(
	db: PGliteWithLive,
	{ query, params }: TLiveQuery,
	onResult: (rows: TResult[]) => void
): (() => Promise<void>) => {
	const live = db.live.query<TResult>(query, params, (res) => onResult(res.rows));

	live.catch((err) => console.error(err));

	return () => live.then((res) => res.unsubscribe()).catch(() => undefined);
};

export class LiveDB<TResult> {
	#data: TResult[] = [];
	#hasResult = false;
	#subscribe;

	constructor(db: PGliteWithLive, liveQuery: TLiveQuery) {
		this.#subscribe = createSubscriber((update) => {
			const stop = startLiveQuery<TResult>(db, liveQuery, (rows) => {
				this.#data = rows;
				this.#hasResult = true;
				update();
			});

			return () => void stop();
		});
	}

	get data() {
		this.#subscribe();
		return this.#data;
	}

	// False until the query answers for the first time: until then, empty `data` means "not known yet"
	get hasResult() {
		this.#subscribe();
		return this.#hasResult;
	}
}
